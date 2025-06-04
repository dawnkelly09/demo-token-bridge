import { 
  wormhole,
  toNative,
  VAA,
} from "@wormhole-foundation/sdk";
import { deserialize } from "@wormhole-foundation/sdk-definitions";
import evm from "@wormhole-foundation/sdk/evm";
import { getCeloSigner } from "./helpers";
import { promises as fs } from "fs";

async function redeemOnCelo() {
  // 1. Read the raw VAA bytes from file
  const vaaBytes = await fs.readFile("vaa.bin");

  // 2. Init Wormhole SDK
  const wh = await wormhole("Testnet", [evm]);
  const celoCtx = wh.getChain("Celo");

  // 3. Parse VAA from bytes
  const vaa = deserialize("TokenBridge:Transfer", vaaBytes) as VAA<"TokenBridge:Transfer">;

  // 4. Load signer for destination chain (Celo)
  const celoSigner = await getCeloSigner();
  const recipient = await celoSigner.getAddress();

  // 5. Load the TokenBridge protocol on Celo
  const tokenBridge = await celoCtx.getProtocol("TokenBridge");

  console.log("📨 Redeeming VAA on Celo...");
  const txs = await tokenBridge.redeem(toNative("Celo", recipient), vaa);

  const txHashes: string[] = [];

  for await (const unsignedTx of txs) {
    const tx = unsignedTx.transaction;
    const sent = await celoSigner.sendTransaction(tx);
    await sent.wait();
    txHashes.push(sent.hash);
  }

  console.log("✅ Redemption complete. Celo txid(s):", txHashes);
}

redeemOnCelo().catch((e) => {
  console.error("❌ Error in redeemOnCelo:", e);
  process.exit(1);
});
