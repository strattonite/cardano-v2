require("dotenv").config();
const { BlockFrostAPI } = require("@blockfrost/blockfrost-js");
const { default: axios } = require("axios");
const db = require("./db").db("cardano");

const api = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_KEY,
});

/**
 * @param {import("./db").MongoWallet} wallet
 */
module.exports = async (wallet) => {
  let lovelaces, tokens, utxos;
  try {
    ({
      data: { lovelaces, tokens },
    } = await axios.get(`https://pool.pm/wallet/${wallet.address}`));

    utxos = await api.addressesUtxos(address, {
      count: 10,
      order: "desc",
    });
  } catch (err) {
    if (err.response?.status == 404) {
      lovelaces = 0;
      tokens = [];
      utxos = [];
    } else {
      throw err;
    }
  }

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

  return wallet;
};
