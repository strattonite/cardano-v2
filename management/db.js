require("dotenv").config();
const { MongoClient } = require("mongodb");

const mongo = new MongoClient(process.env.MONGO_URI);
mongo.connect();

/**
 * @typedef {Object} CardanoBalance
 * @property {string} unit
 * @property {string|number} quantity
 */

/**
 * @typedef UTXO
 * @property {string} tx_hash
 * @property {number} output_index
 * @property {CardanoBalance[]} amount
 * @property {string} block
 * @property {string} [data_hash]
 */

/**
 * @typedef {Object} PoolAsset
 * @property {string} fingerprint
 * @property {Object} [metdata]
 * @property {number} [minted]
 * @property {string} [name]
 * @property {string} policy
 * @property {number} quantity
 */

/**
 * @typedef {Object} MongoWallet
 * @property {string} address
 * @property {PoolAsset[]} assets
 * @property {string[]} mnemonic
 * @property {string} name
 * @property {string} privKey
 * @property {number} balance
 * @property {UTXO[]} utxos
 */

module.exports = mongo;
