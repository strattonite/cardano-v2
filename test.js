process.env.NODE_ENV == "test";
require("dotenv").config();

const create = require("./management/create-wallets");
const { poll, pollTest } = require("./management/poll");
const conf = require("./test-conf.json");
const db = require("./management/db");
const build = require("./transactions/build");
const submit = require("./transactions/submit");

db.once("connectionReady", async () => {
  const col = db.db("cardano").collection("wallets");
  let test1 = await col.findOne({ name: "test1" });
  let test2 = await col.findOne({ name: "test2" });
  test1 = await pollTest(test1);
  test2 = await pollTest(test2);
  //   const payments = [
  //     {
  //       address: test2.address,
  //       amount: 2000000,
  //     },
  //   ];
  //   const built = build(payments, test1);
  //   const sum = await submit(built);
  //   console.log(sum);
});
