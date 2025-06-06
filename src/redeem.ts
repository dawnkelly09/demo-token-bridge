import { wormhole, toNative, VAA } from '@wormhole-foundation/sdk';
import { deserialize } from '@wormhole-foundation/sdk-definitions';
import evm from '@wormhole-foundation/sdk/evm';
import { getSepoliaSigner } from './helpers';
import { promises as fs } from 'fs';
import { signSendWait } from '@wormhole-foundation/sdk-connect';

async function redeemOnDestination() {
  // Read the raw VAA bytes from file
  const vaaBytes = await fs.readFile('vaa.bin');

  // Initialize the Wormhole SDK
  const wh = await wormhole('Testnet', [evm]);

  // Get the destination chain context
  const destinationChainCtx = wh.getChain('Sepolia');

  // Parse the VAA from bytes
  const vaa = deserialize('TokenBridge:Transfer', vaaBytes) as VAA<'TokenBridge:Transfer'>;

  // Get the signer for the destination chain
  const destinationSigner = await getSepoliaSigner();
  const destinationAddress = await destinationSigner.address();

  // Get the TokenBridge protocol for destination chain
  const tokenBridge = await destinationChainCtx.getTokenBridge();

  // Redeem the VAA on destination chain to claim the transferred tokens
  console.log('📨 Redeeming VAA on Sepolia...');
  const redeemTxs = tokenBridge.redeem(toNative('Sepolia', destinationAddress), vaa);

  // Sign and send the transactions
  const txResults = await signSendWait(destinationChainCtx, redeemTxs, destinationSigner);
  const txids = txResults.map((res) => res.txid);

  console.log('✅ Redemption complete. Sepolia txid(s):', txids);
}

redeemOnDestination().catch((e) => {
  console.error('❌ Error in redeemOnDestination:', e);
  process.exit(1);
});

