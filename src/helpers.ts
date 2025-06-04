import {
  TokenId,
  Wormhole,
  type Signer as WormholeSdkSigner,
} from '@wormhole-foundation/sdk';
import type { ChainContext } from '@wormhole-foundation/sdk';
import { EvmPlatform } from '@wormhole-foundation/sdk-evm';
import { ethers } from 'ethers';

/**
 * Returns a signer for the given chain using locally scoped credentials.
 * The required values (ARBITRUM_PRIVATE_KEY, CELO_PRIVATE_KEY) must
 * be loaded securely beforehand, for example via a keystore, secrets
 * manager, or environment variables (not recommended).
 */

const ARBITRUM_PRIVATE_KEY = ARBITRUM_PRIVATE_KEY!;
const ARBITRUM_RPC_URL = ARBITRUM_RPC_URL! || 'https://sepolia-rollup.arbitrum.io/rpc';
const CELO_PRIVATE_KEY = CELO_PRIVATE_KEY!;
const CELO_RPC_URL = CELO_RPC_URL! || 'https://alfajores-forno.celo-testnet.org';

// Configure signers for EVM platform chains
export function getArbitrumSigner(): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC_URL!);
  return new ethers.Wallet(ARBITRUM_PRIVATE_KEY!, provider);
}

export function getCeloSigner(): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(CELO_RPC_URL!);
  return new ethers.Wallet(CELO_PRIVATE_KEY!, provider);
}

// Token decimal helper

export async function getTokenDecimals<
  N extends 'Mainnet' | 'Testnet' | 'Devnet'
>(
  wh: Wormhole<N>,
  token: TokenId,
  sendChain: ChainContext<N, any>
): Promise<number> {
  // If token is native, use the chain's configured nativeTokenDecimals
  if (
    token.address.toString() ===
    EvmPlatform.nativeTokenId(sendChain.network, sendChain.chain).address.toString()
  ) {
    return sendChain.config.nativeTokenDecimals;
  }

  // Otherwise try to read from token contract
  return Number(await wh.getDecimals(token.chain, token.address));
}




