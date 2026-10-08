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

Clear signing in hardware and software wallets: ratings that lead to verified fixes

## Short summary

Walletbeat will test hardware and software wallets on clear signing for Ethereum: can users read what they are signing on the wallet's own screen? We publish the ratings, send wallet teams the gaps to fix, and retest their releases. Most of this grant pays only when named wallet teams ship fixes that those retests confirm.

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

As of October 8, 2026, none of the 32 hardware and software wallets listed by Walletbeat passes its transaction legibility test: 5 are rated partial, 1 fails, and 26 are unrated, including all 11 hardware wallets. This initiative gives wallet teams specific checks to fix and users public evidence of which releases make signing easier to verify.

## The team

- **polymutex**, Walletbeat lead and core contributor: https://x.com/polymutex
- **0xMattmatt**, Walletbeat core contributor: https://x.com/0xmattmatt

Neither is affiliated with a wallet Walletbeat rates; affiliations are disclosed in the repository.

Other funding: the Ethereum Foundation pays $50,000 through January 2027 for Walletbeat's software wallet work, including the top five software wallet ratings. In May 2026 Walletbeat received funds from Giveth, TheDAO and public donations in the Giveth Ethereum Security QF round: https://github.com/walletbeat/walletbeat/blob/beta/src/pages/about/about.md

## Why a grant: what already exists

- A live transaction legibility rating, with a written methodology and benchmark transactions covering token approvals through nested Safe multisend batches.
- A public test page sends the benchmark transactions to any wallet: https://beta.walletbeat.eth.limo/test
- Six software wallets already tested against those benchmarks.
- A public impact log linking wallet teams' fixes to their own announcements.

Walletbeat can use this methodology and test harness immediately. The grant pays for the remaining tests and the work with wallet teams to turn findings into shipped fixes.

## In scope

- Clear signing ratings for 11 hardware wallets and 16 software wallets: readable benchmark transactions (ERC-7730) and transaction and message hashes (ERC-8213). Hardware ratings use only what the device screen shows.
- Retail purchases of each rated hardware wallet, including small-screen models that display transactions differently (about $3,000 of devices).
- A private gap list for every rated wallet team, explaining how to fix each check that failed.
- Retests of shipped fixes, with results in the public impact log.

The real work is the follow-up: getting wallet teams to act on their gap lists and ship the fixes.

## Out of scope

- Rating the top five software wallets, which the Ethereum Foundation grant covers.
- Writing ERC-7730 descriptor files for applications, or building wallet features.
- Transaction simulation, scam warnings and other legibility checks beyond clear signing.
- Embedded wallets and SDKs.

## Commitments

- Code under the MIT license; methodology and data public in the repository.
- Walletbeat keeps the clear signing ratings current for 12 months after the last milestone at no further cost, paid for by grants and public donations. It takes no money from wallet teams.
- Pinned target: every listed hardware wallet rated on clear signing.
- Devices bought at retail, none supplied by vendors. No wallet team pays for, reviews in advance, or changes its rating except by shipping a change that a retest confirms.

## Milestones

### Clear signing ratings published - $25,000

- [ ] At least 11 hardware and 16 software wallets rated on the clear signing checks of Walletbeat's transaction legibility rating, with a reference for every tested field, verified by the technical reviewer in the repository

### Software wallets ship clear signing fixes - $15,000 (adoption)

- [ ] At least 4 software wallet teams ship a release that changes at least one failed clear signing check to a pass, 2 of them from this list: MetaMask, Rabby, Phantom, Base App, Rainbow, Uniswap Wallet, Zerion, OKX
- [ ] The technical reviewer verifies each fix from Walletbeat's published retest in the repository and the team's public credit or direct confirmation

### Hardware wallets ship on-device clear signing fixes - $20,000 (adoption)

- [ ] At least 3 hardware wallet vendors ship firmware that changes at least one failed clear signing check to a pass on the device screen; at least 1 is Ledger or Trezor
- [ ] The technical reviewer verifies each fix from Walletbeat's published retest in the repository and the vendor's release notes or direct confirmation

## Who is likely to fund this

Walletbeat | proposer's own treasury, collected only if the initiative is fully funded | own organization | not applicable | $5,000

Ethereum Foundation | clear signing is a Trillion Dollar Security priority, and the EF already funds Walletbeat's software wallet ratings | know them well | yes | $5,000

Coinspect | backs DappFence, a frontend security initiative on this board built in response to the Bybit attack, and publishes its own wallet security ranking | none | no | $5,000

## Contact

<walletbeat@proton.me>
