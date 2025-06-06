import {
  wormhole,
  toNative,
  toUniversal,
  serialize,
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import { signSendWait } from '@wormhole-foundation/sdk-connect';
import { ethers } from 'ethers';
import { writeFile } from 'fs/promises';
import { getMoonbeamSigner, getSepoliaSigner, getMoonbeamWallet } from './helpers';

async function transferTokens() {
  // Initialize Wormhole SDK with EVM support
  const wh = await wormhole('Testnet', [evm]);

  // Get chain contexts
  const sourceChainCtx = wh.getChain('Moonbeam');
  const destinationChainCtx = wh.getChain('Sepolia');

  // Get Wormhole SDK-compatible signers and addresses
  const sourceSigner = await getMoonbeamSigner();
  const destinationSigner = await getSepoliaSigner();
  const sourceAddress = await sourceSigner.address();
  const destinationAddress = await destinationSigner.address();

  // Define token and transfer amount
  const ERC20_ADDRESS = '0x39F2f26f247CcC223393396755bfde5ecaeb0648'; // Replace with actual token
  const tokenAddress = toNative(sourceChainCtx.chain, ERC20_ADDRESS);
  const amount = '0.01'; // Replace with desired amount

  // Use raw wallet to interact with ERC-20 contract for metadata + approval
  // for the source chain Token Bridge to spend the token to transfer
  const rawWallet = getMoonbeamWallet();
  const tokenContract = new ethers.Contract(
    tokenAddress.toString(),
    [
      'function decimals() view returns (uint8)',
      'function balanceOf(address) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
    ],
    rawWallet,
  );

  // Get correct decimals from token metadata
  const decimals = await tokenContract.decimals();
  const amountBigInt = BigInt(ethers.parseUnits(amount, decimals).toString());

  // Check balance
  const tokenBalance = await tokenContract.balanceOf(sourceAddress);
  const humanBalance = ethers.formatUnits(tokenBalance, decimals);
  console.log(`💰 ERC-20 balance: ${humanBalance}`);

  if (tokenBalance < amountBigInt) {
    throw new Error(
      `🚫 Insufficient balance. Have ${humanBalance}, need ${amount}`,
    );
  }

  // Check if token is already registered on destination chain
  const destinationTokenBridge = await destinationChainCtx.getTokenBridge();
  const isRegistered = await destinationTokenBridge.hasWrappedAsset({
    chain: sourceChainCtx.chain,
    address: tokenAddress.toUniversalAddress(),
  });

  if (!isRegistered) {
    console.log(`🚫 Token not registered on ${destinationChainCtx.chain}.`);
    console.log(
      `👉 Open src/attestToken.ts to register the token, then run this script again.`,
    );
    return;
  } else {
    console.log(`✅ Token is registered. Proceeding with transfer...`);
  }

  // Approve token bridge to spend the ERC-20 tokens
  const tokenBridgeAddress = '0xbc976D4b9D57E57c3cA52e1Fd136C45FF7955A96'; // Replace with actual address
  const approveTx = await tokenContract.approve(
    tokenBridgeAddress,
    amountBigInt,
  );
  await approveTx.wait();
  console.log(`✅ Approved ${amount} for transfer via Token Bridge.`);

  // Create transfer transactions
  const tokenBridge = await sourceChainCtx.getTokenBridge();
  

const transferTxs = await tokenBridge.transfer(
  toNative(sourceChainCtx.chain, sourceAddress),
  {
    chain: destinationChainCtx.chain,
    address: toUniversal(destinationChainCtx.chain, destinationAddress),
  },
  tokenAddress,
  amountBigInt,
);

  // Sign and send transfer transactions
  const txResults = await signSendWait(
    sourceChainCtx,
    transferTxs,
    sourceSigner,
  );
  const txids = txResults.map((res) => res.txid);
  console.log('✅ Sent txs:', txids);

  // Parse transfer messages
  const messages = await sourceChainCtx.parseTransaction(txids[0]!);
  console.log('📨 Parsed transfer messages:', messages);

  // Wait for VAA
  const timeout = 25 * 60 * 1000; // 25 minutes
  const vaaBytes = await wh.getVaa(
    messages[0]!,
    'TokenBridge:Transfer',
    timeout,
  );

  if (!vaaBytes) {
    throw new Error('❌ No VAA returned. Transfer may not have finalized.');
  }

  // Save to file
  await writeFile('vaa.bin', Buffer.from(serialize(vaaBytes)));
  console.log('📝 VAA saved to vaa.bin');
}

transferTokens().catch((err) => {
  console.error('❌ Error in transferTokens:', err);
  process.exit(1);
});
