require("dotenv").config();
const app = require("express")();
const { json } = require("body-parser");
const db = require("./management/db").db("cardano");
const createWallet = require("./management/create-wallets");
const buildTx = require("./transactions/build");
const subTx = require("./transactions/submit");
const poll = require("./management/poll");

app.use(json());
app.listen(process.env.PORT);

const apiKeys = process.env.API_KEYS.split(/\|/g);

const wrap = async (handler) => {
  return async (req, res, next) => {
    if (!apiKeys.includes(req.headers["x-api-key"])) {
      res.status(403).send();
    } else {
      try {
        await handler(req, res, next);
      } catch (err) {
        res.status(500).send(err.message);
      }
    }
  };
};

/** @typedef {import("./management/db").MongoWallet[]} */
let wallets = [];

const getWallets = async () => {
  const w = await db.collection("wallets").find({}).toArray();
  wallets = w;
  return w;
};

let n = 0;
const pollWallets = async () => {
  await poll(wallets[n % wallets.length]);
  n++;
};

const findWallet = async (n) => wallets.filter(({ name }) => name == n)[0];

const getInt = setInterval(getWallets, 2500);
const pollInt = setInterval(pollWallets, 1 / process.env.RATE_LIMIT);

app.get(
  "/wallets",
  wrap(async (req, res, next) => {
    await getWallets();
    res.json(wallets);
    next();
  })
);

app.post(
  "/wallets",
  wrap(async (req, res, next) => {
    await Promise.all(req.body.map(createWallet));
    await getWallets();
    res.json(wallets);
    next();
  })
);

app.post(
  "/transactions",
  wrap(async (req, res, next) => {
    const txs = await Promise.all(
      req.body.map(async ({ name, payments }) => {
        const w = findWallet(name);
        let id, success;
        try {
          if (!w) throw new Error("could not find wallet: " + name);
          const tx = buildTx(payments, w);
          id = await subTx(tx);
          success = true;
        } catch (err) {
          id = err.message;
          success = false;
        }
        return { id, success };
      })
    );

    res.json(txs);
    next();
  })
);

const shutdown = () => {
  clearInterval(getInt);
  clearInterval(pollInt);
};

process.on("SIGINT", shutdown);
