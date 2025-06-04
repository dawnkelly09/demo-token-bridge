import {
  TokenId,
  Wormhole,
  isTokenId,
  type Signer as WormholeSdkSigner,
} from '@wormhole-foundation/sdk';
import type { ChainContext } from '@wormhole-foundation/sdk';
import type { Signer } from '@wormhole-foundation/sdk-connect';
import evm from '@wormhole-foundation/sdk/evm';
import { EvmPlatform } from '@wormhole-foundation/sdk-evm';
import { getEvmSigner } from '@wormhole-foundation/sdk-evm';
import { ethers } from 'ethers';
import { config } from 'dotenv';
config();

/***----- Environment Variables -----***/
const ARBITRUM_PRIVATE_KEY = process.env.ARBITRUM_PRIVATE_KEY!;
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const CELO_PRIVATE_KEY = process.env.CELO_PRIVATE_KEY!;
const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';

/***----- Configure Signers for EVM Chains -----***/

export function getArbitrumSigner(): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC_URL!);
  return new ethers.Wallet(ARBITRUM_PRIVATE_KEY!, provider);
}

export function getCeloSigner(): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(CELO_RPC_URL!);
  return new ethers.Wallet(CELO_PRIVATE_KEY!, provider);
}

/***----- Token Decimal Helper -----***/

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




