require("dotenv").config();
const { BlockFrostAPI } = require("@blockfrost/blockfrost-js");
const { default: axios } = require("axios");

const api = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_KEY,
});

/**
 * @param {import("@emurgo/cardano-serialization-lib-nodejs").Transaction} tx
 */
const submit = async (tx) => {
  return process.env.SUBMIT_TYPE == "blockfrost"
    ? await blockfrost(tx)
    : await subApi(tx);
};

const blockfrost = async (tx) => {
  return await api.txSubmit(tx.to_bytes());
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
