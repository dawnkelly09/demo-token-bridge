import { wormhole, toNative } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import { signSendWait } from '@wormhole-foundation/sdk-connect';
import { getMoonbeamSigner, getSepoliaSigner } from './helpers';

async function attestToken() {
  // Setup Wormhole context
  const wh = await wormhole('Testnet', [evm]);
  const moonbeam = wh.getChain('Moonbeam');
  const sepolia = wh.getChain('Sepolia');

  const sourceSigner = await getMoonbeamSigner();
  const destSigner = await getSepoliaSigner();

  // Token address on Moonbeam to attest
  const tokenAddr = '0x39F2f26f247CcC223393396755bfde5ecaeb0648';
  const token = toNative(moonbeam.chain, tokenAddr);

  console.log(`🔍 Attesting token: ${token.toString()} from ${moonbeam.chain} → ${sepolia.chain}`);

  // Create attestation TXs
  const srcBridge = await moonbeam.getTokenBridge();
  const createAttestationTxs = srcBridge.createAttestation(token);

  // Sign and send attestation on source
  const txResults = await signSendWait(moonbeam, createAttestationTxs, sourceSigner);
  const txid = txResults[0].txid;
  console.log(`✅ Attestation submitted on source: ${txid}`);

  // Parse messages from source TX
  const messages = await moonbeam.parseTransaction(txid);
  if (!messages.length) throw new Error('❌ No messages found in source tx.');

  // Get the VAA from Wormhole
  console.log('📡 Waiting for VAA...');
  const vaa = await wh.getVaa(messages[0]!, 'TokenBridge:AttestMeta', 20 * 60 * 1000); // 20 min timeout
  if (!vaa) throw new Error('❌ Timed out waiting for VAA.');

  console.log('📨 Submitting attestation VAA to destination...');

  // Submit attestation VAA on destination chain
  const dstBridge = await sepolia.getTokenBridge();
  const submitTxs = await sepolia.getTokenBridge().then((tb) => tb.submitAttestation(vaa));


const result = await signSendWait(sepolia, submitTxs, destSigner);
  console.log(`🎉 Attestation complete on ${sepolia.chain}! TX: ${result[0].txid}`);
}

attestToken().catch((e) => {
  console.error('🔥 Error during attestation:', e);
  process.exit(1);
});
