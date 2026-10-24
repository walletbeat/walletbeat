---
title: TheDAO Security Fund clear signing initiative
description: 'Draft of the Walletbeat grant initiative for TheDAO Security Fund, on clear signing in hardware and software wallets.'
Status: Draft
Grant-recipient: Walletbeat (collective)
Amount: 60000
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

Walletbeat will test hardware and software wallets on clear signing for Ethereum: can users read what they are signing in the wallet's own interface? We publish the ratings, with the fix for every check a wallet fails, and retest new releases. $35,000 of the $60,000 is paid only after wallet teams release fixes that our retests confirm.

## Categories

Wallets & Signing

## Funding goal (USD)

$60,000

## Expected duration (months)

12

## Recipient team

Walletbeat

## Links

https://beta.walletbeat.eth.limo

https://github.com/walletbeat/walletbeat

https://github.com/walletbeat/walletbeat/blob/beta/resources/docs/impact/impact.md

## Why this matters

Multisig thefts at [Bybit](https://www.theblock.co/post/343530/lazarus-appears-to-compromise-safe-developer-machine-in-lead-up-to-1-5-billion-bybit-hack-report) (February 2025, about $1.5 billion), [WazirX](https://therecord.media/wazirx-crypto-platform-confirms-230-million-heist) (July 2024, about $230 million) and [Radiant Capital](https://decrypt.co/286728/radiant-capital-exploited-50-million) (October 2024, about $50 million) show the stakes of transaction signing. A compromised interface can show a routine transfer while asking the wallet to sign a different transaction. Clear signing gives Ethereum users and treasury signers a way to check that request on the wallet itself: readable transaction details and hashes they can compare against an independent source.

As of October 8, 2026, none of the 32 hardware and software wallets listed passes Walletbeat's transaction legibility test: 5 are rated partial, 1 fails, and 26 are unrated, including all 11 hardware wallets.

## The team

- **polymutex**, Walletbeat lead and core contributor: https://x.com/polymutex
- **0xMattmatt**, Walletbeat core contributor: https://x.com/0xmattmatt
- **REN2140**, Walletbeat contributor: https://github.com/ren2140eth

None of us is affiliated with a wallet Walletbeat rates.

Other funding: the Ethereum Foundation funded Walletbeat with $106,100 in 2025, and is funding $50,000 through January 2027 for Walletbeat's software wallet work, including the top five software wallet ratings. In May 2026 Walletbeat received funds from Giveth, TheDAO and public donations in the Giveth Ethereum Security QF round: https://beta.walletbeat.eth.limo/about

## Why a grant: what already exists

- A live transaction legibility rating, with a written methodology and benchmark transactions covering transactions of varying complexity (from simple token approvals to complex nested Safe multisend batch transactions).
- A public test page sends the benchmark transactions to any wallet: https://beta.walletbeat.eth.limo/test
- Six software wallets already tested against those benchmarks.
- A public impact log linking wallet teams' fixes to their own announcements.

The grant pays for the remaining tests and for the work with wallet teams on their failed checks.

## In scope

- Clear signing ratings for 11 hardware wallets and 16 software wallets: readable benchmark transactions (ERC-7730) and transaction and message hashes (ERC-8213). Hardware ratings use only what the device screen shows.
- Retail purchases of each rated hardware wallet (about $2,500 of devices).
- For every rated wallet, a public explanation of the fix for each check it fails.
- Retests of new releases that fix a failed check, with results in the public impact log.

Most of the time goes into working with wallet teams until they fix their failed checks.

## Out of scope

- Writing ERC-7730 descriptor files for applications, or building wallet features.
- Transaction simulation, scam warnings and other legibility checks beyond clear signing.

## Commitments

- Code and data under the MIT license. Methodology and data public in the repository.
- Walletbeat keeps the clear signing ratings current for 12 months after the last milestone at no further cost, paid for by grants and public donations. It takes no money from wallet teams.
- Pinned target: every listed hardware wallet rated on clear signing.
- Devices bought at retail, none supplied by vendors. No wallet team pays for, reviews in advance, or changes its rating except by fixing its transaction legibility.

## Milestones

### Clear signing ratings published - $25,000

- [ ] At least 11 hardware and 16 software wallets rated on the clear signing checks of Walletbeat's transaction legibility rating, with a reference for every tested field, verified by the independent reviewer in the repository

### Software wallets release clear signing fixes - $15,000 (adoption)

- [ ] At least 4 software wallet teams release a version that changes at least one failed clear signing check to a pass, 2 of them from this list: MetaMask, Rabby, Phantom, Base App, Rainbow, Uniswap Wallet, Zerion, OKX
- [ ] The independent reviewer verifies each fix from Walletbeat's published retest in the repository and the team's public credit or direct confirmation

### Hardware wallets release on-device clear signing fixes - $20,000 (adoption)

- [ ] At least 3 hardware wallet vendors release firmware that changes at least one failed clear signing check to a pass on the device screen, at least 1 of them Ledger or Trezor
- [ ] The independent reviewer verifies each fix from Walletbeat's published retest in the repository and the vendor's release notes or direct confirmation

## Who is likely to fund this

polymutex | Walletbeat lead, pledging personal funds, collected only if the initiative is fully funded | own team | not applicable | $5,000

Ethereum Foundation | clear signing is a Trillion Dollar Security priority, and the EF already funds Walletbeat's software wallet ratings | know them well | yes | $5,000

Coinspect | backs DappFence, a frontend security initiative on this board built in response to the Bybit attack, and publishes its own wallet security ranking | none | no | $5,000

## Contact

<walletbeat@proton.me>
