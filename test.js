process.env.NODE_ENV == "test";
require("dotenv").config();
const { BlockFrostAPI } = require("@blockfrost/blockfrost-js");

const api = new BlockFrostAPI({
  projectId: "mainnethl6utucFUaD3CONOrtFyLpFTbnz4TZnB",
});

(async () => {
  try {
    console.log(
      await api.addressesUtxos(
        "addr1qy3vdcz4h3esd7804dnj99lxkusyppygjyk09r8wnjh4ef4sf4qat35ene3992kdeg575a9fck5hlrw7x7ajg0p5u3eqmmu5ng"
      )
    );
  } catch (err) {
    console.error(err);
  }
})();
