# Transfer Wrapped Assets

This demo uses the [Wormhole TypeScript SDK](https://github.com/wormhole-foundation/wormhole-sdk-ts) to transfer an ERC-20 token between two EVM-compatible testnets. It showcases how to perform token attestation, cross-chain transfer, and redemption using the Token Bridge protocol.

See the [Transfer Wrapped Assets](https://wormhole.com/docs/products/token-bridge/tutorials/transfer-workflow) tutorial for a step-by-step guide to building this demo project.

---

## Prerequisites

Before you begin, ensure you have the following:

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm){target=\_blank} installed
- [tsx](https://tsx.is/getting-started){target=\_blank} 
- The contract addresses for the ERC-20 token you want to transfer
    
## Quick Start

Follow these steps to get started:

1. Clone the repository:

    ```bash
    git clone https://github.com/TODO: update with final repo address
    cd token-bridge-demo
    ```

2. Install dependencies: 

    ```bash
    npm install
    ```

3. **Set up secure access to your wallets**: this guide assumes you are loading your private keys from a secure keystore of your choice, such as a secrets manager or a CLI-based tool like [`cast wallet`](https://book.getfoundry.sh/reference/cast/cast-wallet){target=\_blank}. To use the demo as written, you'll need private keys with testnet funds for [Moonbase Alpha](https://faucet.moonbeam.network/){target=\_blank} and [Ethereum Sepolia](https://sepolia-faucet.pk910.de/){target=\_blank}

    If you use a `.env` file during development (not recommended), add it to your `.gitignore` to exclude it from version control. Never commit private keys or mnemonics to your repository.

## Project Structure

- `src/transfer.ts`: Main entry point for transferring tokens. Includes logic to check if the token is registered on the destination chain.
- `src/attestToken.ts`: Creates an attestation of the token metadata for registration on the destination chain. Required only if it's the first time transferring the token.
- `src/redeem.ts`: Redeems the transfer transaction VAA on the destination chain to complete the transfer.
- `src/helpers.ts`: Contains utility functions for loading signers and providers.
- `vaa.bin`: Binary file where the signed VAA is saved after a transfer, needed for redemption. This file will generate the first time you successfully complete a transfer.

## Transfer Tokens

Use the scripts in the following order to complete the Token Bridge transfer flow:

1. Initiate the token transfer:

    ```bash
    npx tsx transfer:token
    ```

    The transfer script includes a check on the destination chain for a wrapped version of the ERC-20 token you wish to transfer. If a wrapped version exists, the token is considered registered, and the transfer will continue. If a wrapped version doesn't yet exist on the destination chain, you will be prompted to submit an attestation.

2. If prompted, submit an attestation to register your ERC-20 token on the destination chain by running:

    ```bash
    npx tsx attest:token
    ```

    This script will create an attestation on the source chain, fetch the VAA for the attestation transaction, and submit the VAA to the destination chain to register the token. Once attestation and registration are complete, rerun the transfer script. You will now see confirmation the token you want to transfer is registered with the destination chain and your transfer will initiate successfully.

3. Redeem the transfer transaction VAA to claim your tokens on the destination chain:

    ```bash
    npx tsx redeem:token
    ```

    This final step submits the VAA to the destination chain and completes the multichain token transfer.
