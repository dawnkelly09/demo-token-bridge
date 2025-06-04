import { wormhole } from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import fs from "fs/promises";

// CLI usage: `npx tsx src/fetchVAA.ts <txid>`
const txid = process.argv[2];
if (!txid) {
  console.error("❌ Please provide a source chain transaction ID as an argument.");
  process.exit(1);
}

async function fetchVAA(txid: string) {
  const wh = await wormhole("Testnet", [solana, evm]);
  const sourceChain = wh.getChain("ArbitrumSepolia");

  console.log(`🔍 Parsing Wormhole messages from tx: ${txid}...`);
  const messages = await sourceChain.parseTransaction(txid);

  if (!messages.length) {
    throw new Error("❌ No Wormhole messages found in transaction");
  }

console.log("📦 Requesting VAA from Wormhole RPC...");
const vaa = await wh.getVaa(messages[0], "TokenBridge:Transfer", 60_000);
if (!vaa) throw new Error("VAA is null");

// Save full VAA object as JSON (for debugging/inspection)
await fs.writeFile("vaa.json", JSON.stringify(vaa, (_, val) =>
  typeof val === "bigint" ? val.toString() : val,
  2
));

// Save raw VAA bytes for redeem
const vaaBytes = await wh.getVaaBytes(messages[0], 60_000);
if (!vaaBytes) throw new Error("VAA bytes are null");
await fs.writeFile("vaa.bin", Buffer.from(vaaBytes));

console.log("✅ VAA fetched and saved to vaa.json and vaa.bin!");
}

fetchVAA(txid).catch((e) => {
  console.error("❌ Error fetching VAA:", e);
  process.exit(1);
});
