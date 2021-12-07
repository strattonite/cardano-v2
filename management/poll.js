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

console.log(apis.length);

let n = 0;

const check = (wallet, utxos) =>
  utxos.every(({ tx_hash }) => wallet.utxos.some((u) => u.tx_hash == tx_hash));

/**
 * @param {import("./db").MongoWallet} wallet
 */
const poll = async (wallet) => {
  console.log(new Date().toISOString());
  n++;
  let lovelaces, tokens, utxos_, utxos;
  try {
    utxos_ = await apis[n % apis.length].addressesUtxos(wallet.address, {
      count: 100,
      order: "desc",
    });
    utxos = addNew(wallet.utxos, utxos_);
    if (!check(wallet, utxos)) {
      ({ lovelaces, tokens } = await poolCheck(wallet));

      wallet.balance = lovelaces;
      wallet.assets = tokens;
      wallet.utxos = utxos;
      let s = {
        balance: lovelaces,
        assets: tokens,
        utxos,
      };
      await db.collection("wallets").updateOne(
        {
          name: wallet.name,
        },
        {
          $set: s,
        }
      );
      return wallet;
    }
  } catch (err) {
    if (err.response?.status == 404 || err.status_code == 404) {
      if (wallet.balance != 0 || wallet.assets != [] || wallet.utxos != []) {
        wallet.balance = 0;
        wallet.assets = [];
        wallet.utxos = [];
      }
      return false;
    } else {
      throw err;
    }
  }

  return wallet;
};

const multiUtxos = async (addresses) => {
  let utxos = [];
  let a = addresses[0];
  for (const address of addresses) {
    try {
      const data = await apis[n % apis.length].addressesUtxos(address, {
        count: 100,
        order: "desc",
      });
      utxos = utxos.concat(data);
      if (data.length > 0) a = address;
    } catch (err) {
      if (err.status_code != 404) {
        throw err;
      }
    }
  }
  return [utxos, a];
};

const poolCheck = async (wallet) => {
  const {
    data: { lovelaces, tokens },
  } = await axios.get(`https://pool.pm/wallet/${wallet.address}`);
  return { lovelaces, tokens };
};

const addNew = (oldArr, newArr) => {
  oldArr = oldArr
    .concat(
      newArr.filter((el) => !oldArr.some((val) => el.tx_hash == val.tx_hash))
    )
    .sort((tx1, tx2) => tx2.block - tx1.block);
  return oldArr;
};

/**
 *
 * @param {import("./db").MongoWallet} wallet
 */
const pollTest = async (wallet) => {
  try {
    const api = new BlockFrostAPI({
      projectId: "testnetPSw6CSbBdUMNXgwzbGpEyzAYw6n8Hpfu",
      isTestnet: true,
    });
    const b = await api.addresses(wallet.address);
    const balance = parseInt(
      b.amount.filter((a) => a.unit == "lovelace")[0].quantity
    );
    const u = await api.addressesUtxos(wallet.address);
    wallet.balance = balance;
    wallet.utxos = u;
    return wallet;
  } catch (err) {
    console.error(err);
    return wallet;
  }
};

module.exports.multiUtxos = multiUtxos;
module.exports.poolCheck = poolCheck;
module.exports.poll = poll;
module.exports.pollTest = pollTest;
