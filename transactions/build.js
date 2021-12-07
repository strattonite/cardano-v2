const wasm = require("@emurgo/cardano-serialization-lib-nodejs");

/**
 * @typedef {Object} Payment
 * @property {string} address
 * @property {number} amount
 */

/**
 * @param {Payment[]} payments
 * @param {import("../management/db").MongoWallet} wallet
 */
module.exports = (payments, { key, address, utxos }) => {
  const bipKey = wasm.Bip32PrivateKey.from_bech32(key);
  const change = wasm.Address.from_bech32(address);

  const account = bipKey
    .derive(harden(1852))
    .derive(harden(1815))
    .derive(harden(0));

  const payment = account.derive(0).derive(0);

  const builder = wasm.TransactionBuilder.new(
    wasm.LinearFee.new(
      wasm.BigNum.from_str("44"),
      wasm.BigNum.from_str("155381")
    ),
    wasm.BigNum.from_str("1000000"),
    wasm.BigNum.from_str("500000000"),
    wasm.BigNum.from_str("2000000"),
    16384,
    5000
  );

  const p = payment.to_raw_key().to_public().hash();
  const a = payments
    .map(({ amount }) => amount)
    .reduce((prev, current) => prev + current);

  let b = a;
  for (const u of utxos) {
    let am = u.amount.filter(({ unit }) => unit == "lovelace")[0];
    b -= parseInt(am.quantity);
    const i = wasm.TransactionInput.new(
      wasm.TransactionHash.from_bytes(Buffer.from(u.tx_hash, "hex")),
      u.output_index
    );
    builder.add_key_input(
      p,
      i,
      wasm.Value.new(wasm.BigNum.from_str(am.quantity))
    );
    if (b <= 0) break;
  }
  if (b > 0) throw new Error("insufficient UTXOs");

  for (const payment of payments) {
    const out = wasm.TransactionOutput.new(
      wasm.Address.from_bech32(payment.address),
      wasm.Value.new(wasm.BigNum.from_str(payment.amount.toString()))
    );
    builder.add_output(out);
  }

  builder.add_change_if_needed(change);

  const txBody = builder.build();
  const txHash = wasm.hash_transaction(txBody);
  const witnesses = wasm.TransactionWitnessSet.new();

  const vkeyWitnesses = wasm.Vkeywitnesses.new();
  const vkeyWitness = wasm.make_vkey_witness(txHash, payment.to_raw_key());

  vkeyWitnesses.add(vkeyWitness);
  witnesses.set_vkeys(vkeyWitnesses);

  const transaction = wasm.Transaction.new(txBody, witnesses);

  return transaction;
};

const harden = (num) => 0x80000000 + num;
