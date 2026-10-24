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

Clear signing ratings and fixes for hardware and software wallets

## Short summary

Walletbeat will rate hardware and software wallets on clear signing: can users read what they sign in the wallet's own interface? We publish the fix for every check a wallet fails and retest new releases. $10,000 is paid only after wallet teams release fixes that our retests confirm.

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

Multisig thefts at [Bybit](https://www.theblock.co/post/343530/lazarus-appears-to-compromise-safe-developer-machine-in-lead-up-to-1-5-billion-bybit-hack-report) (February 2025, about $1.5 billion) and [Radiant Capital](https://decrypt.co/286728/radiant-capital-exploited-50-million) (October 2024, about $50 million) show the stakes of transaction signing: a compromised interface can show a routine transfer while the wallet signs a different transaction. Clear signing lets signers check it on the wallet itself: readable details, and hashes to compare against an independent source.

As of October 8, 2026, none of the 32 hardware and software wallets listed passes Walletbeat's transaction legibility test, and all 11 hardware wallets are unrated.

## The team

- **polymutex**, Walletbeat lead and core contributor: https://x.com/polymutex
- **0xMattmatt**, Walletbeat core contributor: https://x.com/0xmattmatt
- **REN2140**, Walletbeat contributor: https://x.com/REN2140_eth

None of us is affiliated with a wallet Walletbeat rates.

Other funding: the Ethereum Foundation gave $106,100 in 2025 and is funding $50,000 through January 2027 for software wallet work. Giveth, TheDAO and donors gave through the May 2026 Giveth QF round: https://beta.walletbeat.eth.limo/about

## Why a grant: what already exists

- A live transaction legibility rating, with a written methodology and benchmark transactions covering transactions of varying complexity (from simple token approvals to complex nested Safe multisend batch transactions).
- A public test page that sends the benchmarks to any wallet: https://beta.walletbeat.eth.limo/test
- Six software wallets tested.
- A public impact log linking wallet teams' fixes to their own announcements.

## In scope

- Clear signing ratings: readable benchmark transactions (ERC-7730), plus calldata and EIP-712 message hashes (ERC-8213). Hardware ratings use only what the device screen shows.
- One device per rated hardware wallet, bought at retail (about $2,500).
- Retests of new releases, with results in the public impact log.

Most of the time goes into working with wallet teams on their failed checks.

## Out of scope

- ERC-7730 descriptor files, and new clear signing technology such as standards or on-device verifiers.
- Transaction simulation, scam warnings and other legibility checks.

## Commitments

- Code and data under the MIT license. Methodology and data public in the repository.
- Ratings kept current for 12 months after the last milestone at no further cost. No money taken from wallet teams.
- No wallet team pays for, reviews in advance, or changes its rating except by fixing its transaction legibility.

## Milestones

### Clear signing ratings published - $20,000

- [ ] At least 11 hardware and 16 software wallets rated on the clear signing checks of Walletbeat's transaction legibility rating, with a reference for every tested field, verified by the independent reviewer in the repository

### Software wallets release clear signing fixes - $4,000 (adoption)

- [ ] At least 4 software wallet teams release a version that changes at least one failed clear signing check to a pass, 2 of them from this list: MetaMask, Rabby, Phantom, Base App, Rainbow, Uniswap Wallet, Zerion, OKX
- [ ] The independent reviewer verifies each fix from Walletbeat's retest and the team's public credit or direct confirmation

### Hardware wallets release on-device clear signing fixes - $6,000 (adoption)

- [ ] At least 3 hardware wallet vendors release firmware that changes at least one failed clear signing check to a pass on the device screen, at least 1 of them Ledger or Trezor
- [ ] The independent reviewer verifies each fix from Walletbeat's retest and the vendor's release notes or direct confirmation

## Who is likely to fund this

polymutex | Walletbeat lead, personal pledge | know them well | yes | $7,500

Ethereum Foundation | clear signing is a Trillion Dollar Security priority | know them well | yes | $5,000

Coinspect | develops DappFence on this board and publishes a wallet security ranking | none | no | $5,000

## Contact

<walletbeat@proton.me>
