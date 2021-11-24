const bip = require("bip39");
const {randomBytes} = require("crypto");
const serialization = require("@emurgo/cardano-serialization-lib-nodejs");

module.exports = {
    import: (mnemonic)=>{
        const ent = bip.mnemonicToEntropy(mnemonic);
        return {
            ...fromEntropy(ent),
            mnemonic
        }
    },
    create: ()=>{
        const {mnemonic, entropy} = getEntropy();
        return {
            ...fromEntropy(entropy),
            mnemonic
        }
    }
}

const harden = (num) => 0x80000000 + num;

const getEntropy = ()=>{
    const entropy = randomBytes(32);
    const mnemonic = bip.entropyToMnemonic(entropy);
    return {
        entropy,
        mnemonic
    }
}

const fromEntropy = (ent)=>{
    const key = serialization.Bip32PrivateKey.from_bip39_entropy(ent, Buffer.from(""));
    const account = key
    .derive(harden(1852))
    .derive(harden(1815))
    .derive(harden(0));

    const utxoPub = account.derive(0).derive(0).to_public();
    const stake = account.derive(2).derive(0).to_public();

    const address = serialization.BaseAddress.new(
        serialization.NetworkInfo.mainnet().network_id(),
        serialization.StakeCredential.from_keyhash(utxoPub.to_raw_key().hash()),
        serialization.StakeCredential.from_keyhash(stake.to_raw_key().hash()),
    )

    console.log(address.to_address().to_bech32("addr"))

    return {
        key,
        account,
        utxoPub,
        stake,
        address
    }
}