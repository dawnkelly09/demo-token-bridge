import { wormhole, toNative, VAA } from '@wormhole-foundation/sdk';
import { deserialize } from '@wormhole-foundation/sdk-definitions';
import evm from '@wormhole-foundation/sdk/evm';
import { getCeloSigner } from './helpers';
import { promises as fs } from 'fs';

async function redeemOnCelo() {
  // Read the raw VAA bytes from file
  const vaaBytes = await fs.readFile('vaa.bin');
  // Initialize the Wormhole SDK
  const wh = await wormhole('Testnet', [evm]);
  // Get the destination chain context
  const destinationChainCtx = wh.getChain('Celo');

  // Parse the VAA from bytes
  const vaa = deserialize(
    'TokenBridge:Transfer',
    vaaBytes,
  ) as VAA<'TokenBridge:Transfer'>;

  // Get the signer for destination chain
  const celoSigner = await getCeloSigner();
  const recipient = await celoSigner.getAddress();

  // Get the TokenBridge protocol for Celo
  const tokenBridge = await destinationChainCtx.getProtocol('TokenBridge');
  // Redeem the VAA on Celo to claim the transferred tokens
  // for the specified recipient address
  console.log('📨 Redeeming VAA on Celo...');
  const txs = await tokenBridge.redeem(toNative('Celo', recipient), vaa);
  // Prepare to collect transaction hashes
  const txHashes: string[] = [];
  // Iterate through the unsigned transactions, sign and send them
  for await (const unsignedTx of txs) {
    const tx = unsignedTx.transaction;
    const sent = await celoSigner.sendTransaction(tx);
    await sent.wait();
    txHashes.push(sent.hash);
  }
  console.log('✅ Redemption complete. Celo txid(s):', txHashes);
}

redeemOnCelo().catch((e) => {
  console.error('❌ Error in redeemOnCelo:', e);
  process.exit(1);
});
