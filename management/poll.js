require("dotenv").config();
const { BlockFrostAPI } = require("@blockfrost/blockfrost-js");
const { default: axios } = require("axios");
const { readFileSync } = require("fs");
const db = require("./db").db("cardano");

const apis = readFileSync("./bf-keys.txt", { encoding: "utf-8" })
  .split(/\r?\n/g)
  .map((l) => l.trim())
  .map((key) => {
    return new BlockFrostAPI({ projectId: key });
  });

let n = 0;

const check = (wallet, utxos) =>
  utxos.every(({ tx_hash }) => wallet.utxos.some((u) => u.tx_hash == tx_hash));

/**
 * @param {import("./db").MongoWallet} wallet
 */
module.exports = async (wallet) => {
  n++;
  let lovelaces, tokens, utxos;
  try {
    utxos = await apis[n % apis.length].addressesUtxos(address, {
      count: 10,
      order: "desc",
    });

    if (!check(wallet, utxos)) {
      ({
        data: { lovelaces, tokens },
      } = await axios.get(`https://pool.pm/wallet/${wallet.address}`));

      wallet.balance = lovelaces;
      wallet.assets = tokens;
      wallet.utxos = utxos;

      await db.collection("wallets").updateOne(
        {
          name: wallet.name,
        },
        {
          $set: {
            balance: lovelaces,
            assets: tokens,
            utxos,
          },
        }
      );
    }
  } catch (err) {
    if (err.response?.status == 404) {
      if (wallet.balance != 0 || wallet.assets != [] || wallet.utxos != []) {
        wallet.balance = 0;
        wallet.assets = [];
        wallet.utxos = [];
        await db.collection("wallets").updateOne(
          {
            name: wallet.name,
          },
          {
            $set: {
              balance: 0,
              assets: [],
              utxos: [],
            },
          }
        );
      }
    } else {
      throw err;
    }
  }

  return wallet;
};
