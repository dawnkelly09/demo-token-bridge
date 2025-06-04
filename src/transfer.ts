import {
  wormhole,
  toNative,
  toUniversal,
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import {EvmAddress} from '@wormhole-foundation/sdk-evm'
import type { SignAndSendSigner } from '@wormhole-foundation/sdk-connect';
import { getArbitrumSigner, getCeloSigner } from './helpers';
import { ethers } from 'ethers';
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
  const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
  const tokenAddress = new EvmAddress(USDC_ADDRESS); // TokenAddress<"ArbitrumSepolia">
  const amount = '0.5';
  const amountBigInt = BigInt(ethers.parseUnits(amount, 6).toString()); // USDC has 6 decimals

  const tokenBridge = await sourceChainCtx.getProtocol("TokenBridge");

  // Check USDC balance
  const tokenContract = new ethers.Contract(
    tokenAddress.toString(),
    ['function balanceOf(address) view returns (uint256)'],
    sourceSigner
  );
  const tokenBalance = await tokenContract.balanceOf(sourceAddress);
  const humanBalance = ethers.formatUnits(tokenBalance, 6);
  console.log(`💰 USDC balance: ${humanBalance}`);

  if (tokenBalance < amountBigInt) {
    throw new Error(`🚫 Insufficient USDC balance. Have ${humanBalance}, need ${amount}`);
  }

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
}

transferTokens().catch((e) => {
  console.error("❌ Error in transferViaAutoBridge:", e);
  process.exit(1);
});
