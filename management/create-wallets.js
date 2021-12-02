const bip = require("bip39");
const { randomBytes } = require("crypto");
const col = require("./db").db("cardano").collection("wallets");
const serialization = require("@emurgo/cardano-serialization-lib-nodejs");

/**
 * @param {Object} conf
 * @param {string} conf.name
 * @param {string} [conf.mnemonic]
 * @returns
 */
module.exports = async ({ name, mnemonic }) => {
  let entropy;
  mnemonic
    ? (entropy = bip.mnemonicToEntropy(mnemonic))
    : ({ mnemonic, entropy } = getEntropy());

  return await getWallet({
    ...fromEntropy(entropy),
    mnemonic,
    name,
  });
};

const harden = (num) => 0x80000000 + num;

const getEntropy = () => {
  const entropy = randomBytes(32);
  const mnemonic = bip.entropyToMnemonic(entropy);
  return {
    entropy,
    mnemonic,
  };
};

const fromEntropy = (ent) => {
  let key = serialization.Bip32PrivateKey.from_bip39_entropy(
    ent,
    Buffer.from("")
  );
  const account = key
    .derive(harden(1852))
    .derive(harden(1815))
    .derive(harden(0));

  const utxoPub = account.derive(0).derive(0).to_public();
  const stake = account.derive(2).derive(0).to_public();

  const address = serialization.BaseAddress.new(
    serialization.NetworkInfo.mainnet().network_id(),
    serialization.StakeCredential.from_keyhash(utxoPub.to_raw_key().hash()),
    serialization.StakeCredential.from_keyhash(stake.to_raw_key().hash())
  )
    .to_address()
    .to_bech32("addr");

  key = key.to_bech32();

  return {
    key,
    address,
  };
};

const getWallet = async (raw) => {
  const w = {
    ...raw,
    balance: 0,
    assets: [],
    utxos: [],
  };
  await col.insertOne(w);
  return w;
};
