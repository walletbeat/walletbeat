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

Clear signing ratings that get hardware and software wallets to show users what they sign

## Short summary

Walletbeat will test every hardware and software wallet it lists on clear signing: does the wallet's own screen show what a transaction will do before the user signs it? We publish each result, send each team its list of gaps, and retest when they ship. Most of the money pays out only when named wallets ship clear signing fixes that a retest confirms.

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

Signers at [Bybit](https://www.theblock.co/post/343530/lazarus-appears-to-compromise-safe-developer-machine-in-lead-up-to-1-5-billion-bybit-hack-report) (February 2025, about $1.5 billion), [WazirX](https://therecord.media/wazirx-crypto-platform-confirms-230-million-heist) (July 2024, about $230 million) and [Radiant Capital](https://decrypt.co/286728/radiant-capital-exploited-50-million) (October 2024, about $50 million) approved multisig transactions after a compromised interface showed them a different transaction from the one they signed. A wallet that decodes the transaction on its own screen gives the signer something to check the interface against.

No wallet Walletbeat lists passes its transaction legibility test today. Of 32 wallets, 5 are rated partial, 1 fails, and 26 are not yet rated, including all 11 hardware wallets.

After this initiative, users of every wallet that ships a fix can read on the wallet itself what a transaction moves and to whom, and compare a hash against an independent source, before they sign.

## The team

- **polymutex**, Walletbeat lead maintainer, owns the rating methodology: https://x.com/polymutex
- **0xMattmatt**, wallet transaction security research. His public wallet comparisons on a malicious transaction, address poisoning and unlimited approvals led Ambire, WalletChan and Safe to ship fixes in July and August 2026: https://x.com/0xmattmatt

Neither is affiliated with a wallet Walletbeat rates; affiliations are disclosed in the repository.

Other funding: the Ethereum Foundation pays $50,000 through January 2027 for Walletbeat's software wallet work, including the top five software wallet ratings. In May 2026 Walletbeat received 5,585 USD and 9.2302 ETH from Giveth, TheDAO and public donations in the Giveth Ethereum Security QF round: https://github.com/walletbeat/walletbeat/blob/beta/src/pages/about/about.md

## Why a grant: what already exists

- The transaction legibility rating is live, with a written methodology and benchmark transactions that run from token approvals to nested Safe multisend batches.
- A public test page sends the benchmark transactions to any wallet: https://beta.walletbeat.eth.limo/test
- Six software wallets are already rated against it.
- The public impact log records wallet teams shipping fixes after Walletbeat published its findings, with links to each team's own announcement.

The methodology and test harness exist, so this grant pays for testing the remaining wallets and for the follow-up with wallet teams.

## In scope

- Rating 11 hardware wallets and 16 software wallets on clear signing: whether the wallet decodes each benchmark transaction into readable terms (ERC-7730), and whether it shows the transaction and message hashes defined in ERC-8213. Hardware wallets are rated only on what the device screen shows.
- Buying each rated hardware wallet at retail, plus the small-screen models where they display transactions differently (about $3,000 of devices).
- A private gap list sent to every rated wallet team, with the fix for every check it failed.
- Retesting each fix a team ships and recording it in the public impact log.

The real work is the follow-up: getting wallet teams to read their gap list, ship the fix, and say so in public.

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

### Every listed wallet rated on clear signing - $25,000

- [ ] At least 11 hardware and 16 software wallets are rated on the clear signing checks of Walletbeat's transaction legibility rating, with a reference for every tested field, checked by the technical reviewer in the public repository

### Software wallets ship clear signing fixes - $15,000 (adoption)

- [ ] At least 4 software wallet teams ship a release that turns at least one failed clear signing check into a pass, 2 of them from this list: MetaMask, Rabby, Phantom, Base App, Rainbow, Uniswap Wallet, Zerion, OKX
- [ ] Each fix confirmed by a Walletbeat retest published in the repository and by the team's public credit or a confirmation sent to the technical reviewer

### Hardware wallets ship on-device clear signing fixes - $20,000 (adoption)

- [ ] At least 3 hardware wallet vendors ship firmware that passes at least one clear signing check on the device that it failed before, 1 of them Ledger or Trezor
- [ ] Each fix confirmed by a Walletbeat retest published in the repository and by the vendor's release notes or a confirmation sent to the technical reviewer

## Who is likely to fund this

Walletbeat | proposer's own treasury, collected only if the initiative is fully funded | own organization | not applicable | $5,000

Ethereum Foundation | clear signing is a Trillion Dollar Security priority, and the EF already funds Walletbeat's software wallet ratings | know them well | yes | $5,000

Coinspect | backs DappFence, a frontend security initiative on this board built in response to the Bybit attack, and publishes its own wallet security ranking | none | no | $5,000

## Contact

<walletbeat@proton.me>
