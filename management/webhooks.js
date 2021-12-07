const { MessageEmbed, WebhookClient } = require("discord.js");

const client = new WebhookClient({
  id: process.env.WEBHOOK_ID,
  token: process.env.WEBHOOK_TOKEN,
});

/**
 * @typedef {Object} tx
 * @property {string} id
 * @property {string} name
 * @property {boolean} success
 */

/**
 * @param {tx[]} txs
 * @returns {Promise<void>}
 */
const transaction = async (txs) => {
  try {
    const failed = (t) => {
      return new MessageEmbed({
        color: "RED",
        title: "unsuccessful transaction",
        fields: [
          { name: "reason", value: t.id },
          { name: "wallet", value: t.name },
          { name: "timestamp", value: new Date().toISOString() },
        ],
      });
    };
    const success = (t) => {
      return new MessageEmbed({
        color: "GREEN",
        title: "successful transaction",
        fields: [
          { name: "id", value: t.id },
          { name: "wallet", value: t.name },
          { name: "timestamp", value: new Date().toISOString() },
        ],
        description: `https://explorer.cardano.org/en/transaction?id=${t.id}`,
      });
    };
    for (const s of split) {
      await client.send({
        embeds: s.map((t) => (t.success ? success(t) : failed(t))),
      });
    }
  } catch (err) {
    console.error(err);
  }
  const split = [];
  for (let i = 0; i < Math.ceil(txs / 10); i++) {
    split.push(txs.slice(i * 10, (i + 1) * 10));
  }
};

module.exports = { transaction };
