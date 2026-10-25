---
title: TheDAO Security Fund clear signing initiative
description: 'Draft of the Walletbeat grant initiative for TheDAO Security Fund, on clear signing in hardware and software wallets.'
Status: Draft
Grant-recipient: Walletbeat (collective)
Amount: 30000
Currency: USD
Application-form: https://initiatives.thedao.fund/submit
---

# TheDAO Security Fund clear signing initiative

Draft of Walletbeat's grant initiative for [TheDAO Security Fund](https://initiatives.thedao.fund).
Each `##` heading from Title onward is one field of the
[submission form](https://initiatives.thedao.fund/submit), in form order, so that text pastes into
the form as is.

## Title

Clear signing: ratings, fixes and ecosystem adoption for hardware and software wallets

## Short summary

Walletbeat will rate hardware and software wallets on clear signing support and publish the results on our website. We'll work with teams to fix the checks they fail and expand clear signing support across the ecosystem.

## Categories

Wallets & Signing

## Funding goal (USD)

$30,000

## Expected duration (months)

9

## Recipient team

Walletbeat

## Links

https://beta.walletbeat.eth.limo

https://github.com/walletbeat/walletbeat

https://github.com/walletbeat/walletbeat/blob/beta/resources/docs/impact/impact.md

## Why this matters

Multisig thefts at [Bybit](https://www.theblock.co/post/343530/lazarus-appears-to-compromise-safe-developer-machine-in-lead-up-to-1-5-billion-bybit-hack-report) (February 2025, about $1.5 billion) and [Radiant Capital](https://decrypt.co/286728/radiant-capital-exploited-50-million) (October 2024, about $50 million) show that a compromised interface can display a routine transfer while the wallet signs a different transaction. Clear signing lets users understand the transaction payload in a human-readable way with hashes to compare against an independent source (e.g. "Deposit $100 into Aave" vs. an unintelligible hexadecimal string). As an industry, we can't expect to onboard the masses if the expectation is for them to decode raw transaction data themselves or otherwise lose their life savings because nobody is going to do the former.

As of October 8, 2026, none of the 32 hardware and software wallets listed passes Walletbeat's transaction legibility test.

## The team

- **polymutex**, Walletbeat lead and core contributor: https://x.com/polymutex
- **0xMattmatt**, Walletbeat core contributor: https://x.com/0xmattmatt
- **REN2140**, Walletbeat contributor: https://x.com/REN2140_eth

No team member is affiliated with a rated wallet.

Other funding: https://beta.walletbeat.eth.limo/about

## Why a grant: what already exists

- A live transaction legibility rating, with a written methodology and benchmark transactions covering transactions of varying complexity (from simple token approvals to complex nested Safe multisend batch transactions).
- A public test page applying the benchmarks to any wallet: https://beta.walletbeat.eth.limo/test
- Six software wallets already tested for clear signing.
- A track record of wallet impact: https://github.com/walletbeat/walletbeat/blob/beta/resources/docs/impact/impact.md

## In scope

- Clear signing ratings: readable benchmark transactions (ERC-7730), plus calldata and EIP-712 message hashes (ERC-8213).
- One device per rated hardware wallet, bought at retail (about $2,500).
- Retests of new releases, with results in the public impact log.
- Working with wallet teams to drive adoption.

## Out of scope

- ERC-7730 descriptor files, or new clear signing technology such as on-device verifiers.
- Transaction simulation, scam warnings and other legibility checks.

## Commitments

- Code and data under the MIT license. Methodology and data public in the repository.
- Walletbeat maintains the ratings for 12 months after the last milestone at no further cost, funded by grants and donations.
- Pinned target: every listed hardware and software wallet rated on clear signing.
- Walletbeat accepts no payment from wallet teams for reviews or rating changes. A rating changes only when the wallet fixes its transaction legibility.

## Milestones

### Clear signing ratings published - $20,000

- [ ] At least 11 hardware and 16 software wallets rated on the clear signing checks of Walletbeat's transaction legibility rating, with a reference for every tested field, verified by an independent reviewer

### Software wallets release clear signing fixes - $4,000 (adoption)

- [ ] At least 4 software wallet teams release a version that changes at least one failed clear signing check to a pass, 2 of them from this list: MetaMask, Rabby, Phantom, Base App, Rainbow, Uniswap Wallet, Zerion, OKX
- [ ] The independent reviewer verifies each fix from Walletbeat's retest and the team's public credit or direct confirmation

### Hardware wallets release on-device clear signing fixes - $6,000 (adoption)

- [ ] At least 3 hardware wallet vendors release firmware that changes at least one failed clear signing check to a pass, at least 1 of them Ledger or Trezor
- [ ] The independent reviewer verifies each fix from Walletbeat's retest and the vendor's release notes or direct confirmation

## Who is likely to fund this

polymutex | Walletbeat lead, personal pledge | know them well | yes | $7,500

Ethereum Foundation | clear signing is a Trillion Dollar Security priority | know them well | yes | $5,000

Coinspect | develops DappFence on this board and publishes a wallet security ranking | none | no | $5,000

## Contact

<walletbeat@proton.me>
