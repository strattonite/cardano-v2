require("dotenv").config();
const app = require("express")();
const { json } = require("body-parser");
const createWallet = require("./management/create-wallets");
const buildTx = require("./transactions/build");
const subTx = require("./transactions/submit");
const { poll } = require("./management/poll");

const db = require("./management/db").db("cardano");

app.use(json());
app.listen(process.env.PORT);

const apiKeys = process.env.API_KEYS.split(/\|/g);

const wrap = (handler) => {
  return async function (req, res, next) {
    if (!apiKeys.includes(req.headers["x-api-key"])) {
      res.status(403).send();
    } else {
      try {
        await handler(req, res, next);
      } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
      }
    }
  };
};

/** @typedef {import("./management/db").MongoWallet[]} */
let wallets = [];

const getWallets = async () => {
  try {
    const w = await db.collection("wallets").find({}).toArray();
    wallets = w;
    return w;
  } catch (err) {
    console.log("error getting wallets");
    console.error(err);
  }
};

let n = 0;
const pollWallets = async () => {
  try {
    const w = wallets[n % wallets.length];
    if (w) {
      await poll(w);
      n++;
    }
  } catch (err) {
    console.log("error polling wallets");
    console.error(err);
  }
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
        return { id, success, name };
      })
    );

    res.json(txs);
    next();
  })
);

const shutdown = () => {
  clearInterval(getInt);
  clearInterval(pollInt);
  app.removeAllListeners();
};

setTimeout(getWallets, 2500);

// process.on("SIGINT", shutdown);
