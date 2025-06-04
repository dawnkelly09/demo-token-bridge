import {
  wormhole,
  toNative,
  toUniversal,
  serialize
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import {EvmAddress} from '@wormhole-foundation/sdk-evm'
import type { SignAndSendSigner } from '@wormhole-foundation/sdk-connect';
import { getArbitrumSigner, getCeloSigner } from './helpers';
import { ethers } from 'ethers';
import { writeFile } from "fs/promises";
import { config } from 'dotenv';
config();

async function transferTokens() {
  // Initialize Wormhole SDK with EVM support
  const wh = await wormhole('Testnet', [evm]);

  const sourceChainCtx = wh.getChain('ArbitrumSepolia');
  const destinationChainCtx = wh.getChain('Celo');

  const sourceSigner = await getArbitrumSigner();
  const destinationSigner = await getCeloSigner();
  const sourceAddress = await sourceSigner.getAddress();

  // Define the ERC-20 token (USDC) and amount
  const WETH_ADDRESS = '0xbC635CAEf25A50DE92F7705d02CCaaeBfA69B71D';
  const tokenAddress = toNative("ArbitrumSepolia", WETH_ADDRESS); 
  const amount = '0.02';
  const amountBigInt = BigInt(ethers.parseUnits(amount, 18).toString()); // WETH has 18 decimals

  const tokenBridge = await sourceChainCtx.getProtocol("TokenBridge");

  // Check WETH balance
  const tokenContract = new ethers.Contract(
    tokenAddress.toString(),
    [
      'function balanceOf(address) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ],
    sourceSigner
  );
  const tokenBalance = await tokenContract.balanceOf(sourceAddress);
  const humanBalance = ethers.formatUnits(tokenBalance, 18);
  console.log(`💰 WETH balance: ${humanBalance}`);

  if (tokenBalance < amountBigInt) {
    throw new Error(`🚫 Insufficient WETH balance. Have ${humanBalance}, need ${amount}`);
  }

    // --- Check if token is registered on destination ---
  const destinationTokenBridge = await destinationChainCtx.getTokenBridge();
  const isRegistered = await destinationTokenBridge.hasWrappedAsset({
    chain: sourceChainCtx.chain,
    address: tokenAddress.toUniversalAddress(),
  });

  if (!isRegistered) {
    console.log(`🚫 Token not registered on ${destinationChainCtx.chain}.`);
    console.log(`👉 Define token to attest and run: npx tsx src/attestToken.ts`);
    return;
  } else {
    console.log(`✅ Token is registered on ${destinationChainCtx.chain}. Proceeding with transfer...`);
  }


  // Approve the Token Bridge to spend your WETH
  // Replace with the token bridge address for your source chain
const tokenBridgeAddress = "0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e";
const approveTx = await tokenContract.approve(tokenBridgeAddress, amountBigInt);
await approveTx.wait();
console.log(`✅ Approved Token Bridge to spend ${amount} WETH`);

  // Build transfer transactions
  const transferTxs = await tokenBridge.transfer(
    toNative(sourceChainCtx.chain, sourceAddress),
    {
      chain: destinationChainCtx.chain,
      address: toUniversal(destinationChainCtx.chain, await destinationSigner.address),
    },
    tokenAddress,
    amountBigInt
  );

  const txids: string[] = [];

  for await (const unsignedTx of transferTxs) {
    const tx = unsignedTx.transaction as ethers.TransactionRequest;
    const sentTx = await sourceSigner.sendTransaction(tx);
    await sentTx.wait();
    txids.push(sentTx.hash);
  }

  console.log("✅ Sent txs:", txids);

  // After sending the transfer and collecting txids
const messages = await sourceChainCtx.parseTransaction(txids[0]!);
console.log("📨 Parsed transfer messages:", messages);

const timeout = 25 * 60 * 1000; // 25 minutes
const vaaBytes = await wh.getVaa(messages[0]!, "TokenBridge:Transfer", timeout);

// Save VAA to file
if (!vaaBytes) {
  throw new Error("❌ No VAA was returned. Token transfer may not have finalized yet.");
}
await writeFile("vaa.bin", Buffer.from(serialize(vaaBytes)));
console.log("📝 VAA saved to vaa.bin");
}

transferTokens().catch((e) => {
  console.error("❌ Error in transferViaAutoBridge:", e);
  process.exit(1);
});
