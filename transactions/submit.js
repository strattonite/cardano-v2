require("dotenv").config();
const { BlockFrostAPI } = require("@blockfrost/blockfrost-js");
const { default: axios } = require("axios");
const { readFileSync } = require("fs");

const apis = readFileSync("./bf-keys.txt", { encoding: "utf-8" })
  .split(/\r?\n/g)
  .map((l) => l.trim())
  .map((key) => {
    return new BlockFrostAPI({ projectId: key });
  });

let txn_ = 0;

/**
 * @param {import("@emurgo/cardano-serialization-lib-nodejs").Transaction} tx
 */
const submit = async (tx) => {
  txn_++;
  try {
    return process.env.SUBMIT_TYPE == "blockfrost"
      ? await blockfrost(tx)
      : await subApi(tx);
  } catch (err) {
    console.error(err);
  }
};

const blockfrost = async (tx) => {
  return await apis[txn_ % apis.length].txSubmit(tx.to_bytes());
};

const subApi = async (tx) => {
  const { data } = await axios({
    method: "POST",
    headers: {
      "Content-Type": "application/cbor",
    },
    url: process.env.SUBMIT_URL,
    data: Buffer.from(tx.to_bytes()),
  });
  return data;
};

module.exports = submit;
