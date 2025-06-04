// src/attestToken.ts

import { wormhole, toNative } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import { ethers } from 'ethers';
import { getArbitrumSigner, getCeloSigner } from './helpers';
import { config } from 'dotenv';
config();

async function attestToken() {
  // --- Initialize Wormhole SDK ---
  const wh = await wormhole('Testnet', [evm]);
  const sourceChain = wh.getChain('ArbitrumSepolia');
  const destinationChain = wh.getChain('Celo');

  const sourceSigner = await getArbitrumSigner();
  const destinationSigner = await getCeloSigner();

  // --- Define the token to attest ---
  // Replace with the contract address of the token you want to attest
  const tokenToAttest = '0xbC635CAEf25A50DE92F7705d02CCaaeBfA69B71D';
  const token = toNative(sourceChain.chain, tokenToAttest);
  console.log(`🔍 Token to attest: ${token.toString()}`);

  // --- Step 1: Create Attestation on Arbitrum Sepolia ---
  console.log(`\n📝 Creating attestation on ${sourceChain.chain}...`);
  const sourceTokenBridge = await sourceChain.getTokenBridge();
  const createAttestationTxs = sourceTokenBridge.createAttestation(token);

  const sourceTxids: string[] = [];

  for await (const tx of createAttestationTxs) {
    const txRequest = tx.transaction as ethers.TransactionRequest;
    const sentTx = await sourceSigner.sendTransaction(txRequest);
    await sentTx.wait();
    sourceTxids.push(sentTx.hash);
  }

  const sourceTxId = sourceTxids[0];
  console.log(`✅ Attestation tx sent: ${sourceTxId}`);

  // --- Step 2: Fetch Attestation VAA ---
  console.log(`\n🔄 Fetching VAA for tx: ${sourceTxId}`);
  const messages = await sourceChain.parseTransaction(sourceTxId);
  console.log('📦 Parsed messages:', messages);

  const timeout = 25 * 60 * 1000;
  const vaa = await wh.getVaa(messages[0]!, 'TokenBridge:AttestMeta', timeout);
  if (!vaa) throw new Error('❌ VAA not found before timeout.');

  // --- Step 3: Submit Attestation on Celo ---
  console.log(`\n📨 Submitting attestation VAA to ${destinationChain.chain}...`);
  const destTokenBridge = await destinationChain.getTokenBridge();
  const submitTxs = destTokenBridge.submitAttestation(vaa);

  const destTxids: string[] = [];

  for await (const tx of submitTxs) {
    const txRequest = tx.transaction as ethers.TransactionRequest;
    const sentTx = await destinationSigner.sendTransaction(txRequest);
    await sentTx.wait();
    destTxids.push(sentTx.hash);
  }

  console.log(`✅ Attestation VAA submitted: ${destTxids[0]}`);
  console.log('\n🎉 Token attestation complete!');
}

attestToken().catch((err) => {
  console.error('❌ Error in attestToken:', err);
  process.exit(1);
});
