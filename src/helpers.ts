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




