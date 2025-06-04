import { wormhole, toNative } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import { ethers } from 'ethers';
import { getArbitrumSigner, getCeloSigner } from './helpers';

async function attestToken() {
  // Initialize the Wormhole SDK, get chain contexts
  const wh = await wormhole('Testnet', [evm]);
  const sourceChain = wh.getChain('ArbitrumSepolia');
  const destinationChain = wh.getChain('Celo');
// Get signers for source and destination chains
  const sourceSigner = await getArbitrumSigner();
  const destinationSigner = await getCeloSigner();

  // Define the token to attest for 
  // registeration on the destination chain
  const tokenToAttest = 'INSERT_ERC20_ADDRESS'; 
  const token = toNative(sourceChain.chain, tokenToAttest);
  console.log(`🔍 Token to attest: ${token.toString()}`);

  // Create attestation on the source chain
  console.log(`\n📝 Creating attestation on ${sourceChain.chain}...`);
  // Get the Token Bridge protocol for source chain
  const sourceTokenBridge = await sourceChain.getTokenBridge();
  // Create attestation transactions
  const createAttestationTxs = sourceTokenBridge.createAttestation(token);
// Prepare to collect transaction hashes
  const sourceTxids: string[] = [];
// Iterate through the unsigned transactions, sign and send them
  for await (const tx of createAttestationTxs) {
    const txRequest = tx.transaction as ethers.TransactionRequest;
    const sentTx = await sourceSigner.sendTransaction(txRequest);
    await sentTx.wait();
    sourceTxids.push(sentTx.hash);
  }
// Log the transaction ID of the attestation
  const sourceTxId = sourceTxids[0];
  console.log(`✅ Attestation tx sent: ${sourceTxId}`);

  // Fetch the attestation VAA
  console.log(`\n🔄 Fetching VAA for tx: ${sourceTxId}`);
  // Parse the transaction to get messages
  const messages = await sourceChain.parseTransaction(sourceTxId);
  console.log('📦 Parsed messages:', messages);
// Set a timeout for fetching the VAA, this can take several minutes
// depending on the source chain network and finality
  const timeout = 25 * 60 * 1000;
  // Fetch the VAA for the attestation message
  const vaa = await wh.getVaa(messages[0]!, 'TokenBridge:AttestMeta', timeout);
  if (!vaa) throw new Error('❌ VAA not found before timeout.');

  // Submit the attestation on the destination chain
  console.log(`\n📨 Submitting attestation VAA to ${destinationChain.chain}...`);
  // Get the Token Bridge protocol for destination chain
  const destTokenBridge = await destinationChain.getTokenBridge();
  // Submit the attestation VAA
  const submitTxs = destTokenBridge.submitAttestation(vaa);
// Prepare to collect transaction hashes for the destination chain
  const destTxids: string[] = [];
// Iterate through the unsigned transactions, sign and send them
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
