// 🐀 RAT Buy Webhook Bot — Rug-pull Accountability Taskforce

const axios = require("axios");
const axiosRetry = require("axios-retry").default;

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
require("dns").setDefaultResultOrder("ipv4first");

const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 
  "https://discord.com/api/webhooks/1372931394963111966/SZ7P9y2lE8wMp71hkfYoQl6tl9f9rBZHBLNZT9qjFS_2p3nyMQJUs9OYTWozm2WjuOih";

// 🔔 Novo webhook para grandes compras
const bigBuyWebhookExtra = process.env.RAT_BIG_BUY_WEBHOOK || 
  "https://discord.com/api/webhooks/1372931530988716042/nRbj8Rlnzy4n6D66NzVV5Fpe81vvDh3avrJKAIml9KLgnr-pW44sqUU15fboZPvLFaEP"; // Substitui pelo real

let lastSeenTxHash = null;
let initialized = false;

async function fetchRATTrades() {
  console.log("🔍 Fetching trades from DexHunter...");

  try {
    const response = await axios.post(
      "https://api-us.dexhunterv3.app/swap/ordersByPair",
      {
        page: 0,
        perPage: 1,
        filters: [{ filterType: "STATUS", values: ["COMPLETE"] }],
        tokenId1: "",
        tokenId2: "d2c14102cc43bc19a2a06aaca4a28039178f2ccfad50b26402806f26524154",
        orderSorts: "STARTTIME",
        sortDirection: "DESC",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.dexhunter.io",
          Referer: "https://app.dexhunter.io",
        },
      }
    );

    const trades = response.data;
    if (!Array.isArray(trades) || trades.length === 0) return;

    const trade = trades[0];
    const isBuy =
      trade.token_id_in === "000000000000000000000000000000000000000000000000000000006c6f76656c616365" &&
      trade.token_id_out === "d2c14102cc43bc19a2a06aaca4a28039178f2ccfad50b26402806f26524154";

    if (!isBuy || !trade.tx_hash) return;

    if (!initialized) {
      lastSeenTxHash = trade.tx_hash;
      initialized = true;
      return;
    }

    if (trade.tx_hash === lastSeenTxHash) return;

    const buyer = trade.user_address || "Unknown";
    const adaUsed = trade.amount_in;
    const tx = trade.tx_hash;
    const timestamp = Math.floor(
      new Date(trade.submission_time).getTime() / 1000
    );

    const adaFloat = parseFloat(adaUsed);
    if (adaFloat >= 200) {
      const bigBuyPayload = {
        username: "🐀 RAT Bot",
        embeds: [
          {
            title: "🚨 BIG $RAT BUY!",
            description: `👤 **Buyer:** \`${buyer.slice(0, 15)}...\`
💸 **ADA Used:** \`${adaUsed} ₳\`
🔗 [View TX](https://cardanoscan.io/transaction/${tx})
🕒 <t:${timestamp}:R>`,
            color: 0xff0000,
            image: { url: "hhttps://timcheese.xyz/images/ratbig.png" },
            footer: {
              text: "🐀 Rug-pull Accountability Taskforce",
            },
          },
        ],
      };

      // Enviar para ambos os webhooks
      await axios.post(webhookUrl, bigBuyPayload);
      await axios.post(bigBuyWebhookExtra, bigBuyPayload);
    }

    const payload = {
      username: "🐀 RAT Bot",
      embeds: [
        {
          title: "🐀💰 $RAT Buy Detected!",
          description: `👤 **Buyer:** \`${buyer.slice(0, 15)}...\`
💸 **ADA Used:** \`${adaUsed} ₳\`
🔗 [View TX](https://cardanoscan.io/transaction/${tx})
🕒 <t:${timestamp}:R>`,
          color: 0xaa2222,
          image: { url: "https://timcheese.xyz/images/ratnormal.png" },
          footer: {
            text: "🐀 Powered by the RAT Taskforce — Did some RAT pull a rug on you?",
          },
        },
      ],
    };

    await axios.post(webhookUrl, payload);
    console.log(`✅ New TX posted: ${tx}`);
    lastSeenTxHash = tx;
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

setInterval(fetchRATTrades, 10000);
console.log("🐀 RAT Buy Bot running...");
