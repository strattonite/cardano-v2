const create = require("./management/create-wallets");

create({ name: "test" }).then((wallet) => console.log(wallet));
