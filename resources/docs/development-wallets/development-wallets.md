---
title: 'Development wallets'
description: 'A list of wallets built for Ethereum developers, such as wallets that work with local Anvil or Hardhat nodes.'
---

# Development wallets

Development wallets are tools for building and testing Ethereum applications rather than for holding funds. Most of Walletbeat's attributes don't apply to them. For example, a light client doesn't matter much when you are running against your own local node. So Walletbeat lists them here instead of rating them.

Each entry links to the project's source repository, which is where the information comes from. Walletbeat last reviewed this page on 2026-10-09. All projects listed publish their source code and had commits in the six months before that date.

| Wallet           | Form                                            | Works with                                                        | Development features                                                                                                                                                                                                                                                                   | Source                                                                                                                                                  |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DevWallet        | Browser extension (Chromium)                    | Local Anvil and Hardhat 3 nodes (chain ID 31337)                  | Impersonating accounts; setting balances and nonces; switching between click-to-mine, interval mining and auto-mining; importing contracts and ABIs from Foundry and Hardhat projects. Uses EIP-6963, so it works alongside other browser wallets. A maintained fork of Rivet (below). | [`equitylayer/dev-wallet`](https://github.com/equitylayer/dev-wallet)                                                                                   |
| ethui            | Desktop app, with Chrome and Firefox extensions | Any chain, with dedicated syncing for local Anvil nodes           | Stays in sync with Anvil across chain restarts and reverts; matches Foundry `forge` outputs against deployed bytecode to provide a built-in contract explorer; multiple wallets; a "fast mode" that skips password checks for test wallets on Anvil.                                   | [`ethui/ethui`](https://github.com/ethui/ethui)                                                                                                         |
| Impersonator     | Web app                                         | Any app that supports WalletConnect, or apps loaded in its iframe | Connects to apps as any Ethereum address, to see what they show for that address. It holds no private keys, so it cannot sign or send transactions.                                                                                                                                    | [`impersonator-eth/impersonator`](https://github.com/impersonator-eth/impersonator)                                                                     |
| Burner Connector | Library (wagmi connector)                       | Apps built with wagmi                                             | Creates a throwaway "burner" wallet inside the app, kept across browser tabs or created fresh for each tab, with custom RPC endpoints per chain. From the Scaffold-ETH project.                                                                                                        | [`scaffold-eth/burner-connector`](https://github.com/scaffold-eth/burner-connector)                                                                     |
| MetaMask Flask   | Browser extension (prerelease MetaMask build)   | Any chain                                                         | Lets developers install Snaps from a local source and Snaps that are not on MetaMask's allow list, for Snap development.                                                                                                                                                               | [`MetaMask/metamask-extension` (`builds.yml`)](https://github.com/MetaMask/metamask-extension/blob/a284fe9f478fb717712350ce0d1fedb58a1a6c10/builds.yml) |

## Not listed

- [Rivet](https://github.com/paradigmxyz/rivet), a developer wallet for Anvil, is not listed because its last commit was in March 2025. DevWallet (above) continues it as a fork.

## Suggesting a wallet

To suggest a development wallet, open an issue or pull request that edits this page, with a link to the wallet's source repository.
