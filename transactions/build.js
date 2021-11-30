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
module.exports = (payments, { privKey, address, utxos }) => {
  const bipKey = wasm.Bip32PrivateKey.from_bech32(privKey);
  const change = address;
  const priv = bipKey.to_raw_key();

  const builder = wasm.TransactionBuilder.new(
    wasm.LinearFee.new(
      wasm.BigNum.from_str("44"),
      wasm.BigNum.from_str("155381"),
      wasm.BigNum.from_str("1000000"),
      wasm.BigNum.from_str("500000000"),
      wasm.BigNum.from_str("2000000")
    )
  );

  const p = priv.to_public().hash();
  const a = payments
    .map(({ amount }) => amount)
    .reduce((prev, current) => prev + current);

  let b = a + 200000;
  for (const u of utxos) {
    const am = u.amount.filter(({ unit }) => unit == "lovelace")[0];
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
    builder.add_output(
      wasm.TransactionOutput.new(
        wasm.Address.from_bech32(payment.address),
        wasm.Value.new(wasm.BigNum.from_str(payment.amount.toString()))
      )
    );
  }

  builder.add_change_if_needed(change);
  const body = builder.build();
  const txHash = wasm.hash_transaction(body);
  const witnesses = wasm.TransactionWitnessSet.new();
  const vkeyWitnesses = wasm.Vkeywitnesses.new();
  const witness = wasm.make_vkey_witness(txHash, priv);
  vkeyWitnesses.add(witness);
  witnesses.set_vkeys(vkeyWitnesses);

  const transaction = wasm.Transaction.new(body, witnesses);

  return transaction;
};
