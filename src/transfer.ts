import {
  wormhole,
  toNative,
  toUniversal,
  serialize,
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import { getArbitrumSigner, getCeloSigner } from './helpers';
import { ethers } from 'ethers';
import { writeFile } from 'fs/promises';

async function transferTokens() {
  // Initialize Wormhole SDK with EVM support
  const wh = await wormhole('Testnet', [evm]);
  // Get source and destination chain contexts
  const sourceChainCtx = wh.getChain('ArbitrumSepolia');
  const destinationChainCtx = wh.getChain('Celo');
  // Get signers for source and destination chains
  const sourceSigner = await getArbitrumSigner();
  const destinationSigner = await getCeloSigner();
  const sourceAddress = await sourceSigner.getAddress();

  // Define the ERC-20 token and amount to transfer
  const ERC20_ADDRESS = 'INSERT_ERC20_ADDRESS'; // Replace with actual ERC-20 token address
  const tokenAddress = toNative('ArbitrumSepolia', ERC20_ADDRESS);
  const amount = '0.02';
  // Handle decimals and convert amount to BigInt
  // 18 is the standard decimal places for most ERC-20 tokens, change if needed
  const amountBigInt = BigInt(ethers.parseUnits(amount, 18).toString());
  // Get the Token Bridge protocol for source chain
  const tokenBridge = await sourceChainCtx.getProtocol('TokenBridge');

  // Check ERC-20 balance
  const tokenContract = new ethers.Contract(
    tokenAddress.toString(),
    [
      'function balanceOf(address) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
    ],
    sourceSigner,
  );
  const tokenBalance = await tokenContract.balanceOf(sourceAddress);
  // 18 is the standard decimal places for most ERC-20 tokens, change if needed
  const humanBalance = ethers.formatUnits(tokenBalance, 18);
  console.log(`💰 ERC-20 balance: ${humanBalance}`);

  if (tokenBalance < amountBigInt) {
    throw new Error(
      `🚫 Insufficient ERC-20 balance. Have ${humanBalance}, need ${amount}`,
    );
  }

  // Check if token is registered with the destination chain token bridge
  const destinationTokenBridge = await destinationChainCtx.getTokenBridge();
  const isRegistered = await destinationTokenBridge.hasWrappedAsset({
    chain: sourceChainCtx.chain,
    address: tokenAddress.toUniversalAddress(),
  });
  // If it isn't registered, prompt user to attest the token
  if (!isRegistered) {
    console.log(`🚫 Token not registered on ${destinationChainCtx.chain}.`);
    console.log(
      `👉 Define token to attest and run: npx tsx src/attestToken.ts`,
    );
    return;
    // If it is registered, proceed with transfer
  } else {
    console.log(
      `✅ Token is registered on ${destinationChainCtx.chain}. Proceeding with transfer...`,
    );
  }

  // Replace with the token bridge address for your source chain
  const tokenBridgeAddress = 'INSERT_TOKEN_BRIDGE_ADDRESS'; // e.g., "0xYourTokenBridgeAddress"
  // Approve the Token Bridge to spend your ERC-20 token
  const approveTx = await tokenContract.approve(
    tokenBridgeAddress,
    amountBigInt,
  );
  await approveTx.wait();
  console.log(`✅ Approved Token Bridge to spend ${amount} ERC-20 token.`);

  // Build transfer transactions
  const transferTxs = await tokenBridge.transfer(
    toNative(sourceChainCtx.chain, sourceAddress),
    {
      chain: destinationChainCtx.chain,
      address: toUniversal(
        destinationChainCtx.chain,
        await destinationSigner.address,
      ),
    },
    tokenAddress,
    amountBigInt,
  );
  // Gather transaction IDs for each transfer
  const txids: string[] = [];
  // Iterate through each unsigned transaction, sign and send it,
  // and collect the transaction IDs
  for await (const unsignedTx of transferTxs) {
    const tx = unsignedTx.transaction as ethers.TransactionRequest;
    const sentTx = await sourceSigner.sendTransaction(tx);
    await sentTx.wait();
    txids.push(sentTx.hash);
  }

  console.log('✅ Sent txs:', txids);

  // Parse the transaction to get Wormhole messages
  const messages = await sourceChainCtx.parseTransaction(txids[0]!);
  console.log('📨 Parsed transfer messages:', messages);
  // Set a timeout for VAA retrieval
  // This can take several minutes depending on the network and finality
  const timeout = 25 * 60 * 1000; // 25 minutes
  const vaaBytes = await wh.getVaa(
    messages[0]!,
    'TokenBridge:Transfer',
    timeout,
  );

  // Save VAA to file. You will need this to submit
  // the transfer on the destination chain
  if (!vaaBytes) {
    throw new Error(
      '❌ No VAA was returned. Token transfer may not have finalized yet.',
    );
  }
  await writeFile('vaa.bin', Buffer.from(serialize(vaaBytes)));
  console.log('📝 VAA saved to vaa.bin');
}

transferTokens().catch((e) => {
  console.error('❌ Error in transferViaAutoBridge:', e);
  process.exit(1);
});
