---
title: Epoch 13 - The Privacy Round
description: 'Octant is funding a 100 ETH matching pool to support projects advancing privacy on Ethereum and across the open internet.'
---

# Epoch 13—the Privacy Round

## Round details

- **Round**: Epoch 13 - The Privacy Round
- **Platform**: Octant
- **Matching pool**: 100 ETH
- **Round dates**:
  Application Deadline: 10 September, 2026
  Epoch Accelerator: 6 - 10 October, 2026
  Allocation Window: 14 - 21 October, 2026
- **Application page**: https://octant.fillout.com/epoch-13

# Your Project & Contact

## Primary Impact Area

Ethereum

## Project Category

Applied Research

## Project Name

Walletbeat

## Project Website

walletbeat.eth.limo

## Your Project's X Username:

https://x.com/walletbeat

## Primary Contact (Email) *

walletbeat@proton.me

## Primary Contact (Telegram) *

Username of your team representative who will be the main point of contact for this round.
@lucilajulianaa

## Primary Contact (X handle)

https://x.com/walletbeat

## Are you:

[] A registered organization /incorporated organization

[X] A working group

[] Solo contributor/applying as an individual

# Your Work & Traction

## What are you building and who is worse off if it stops existing? *

Walletbeat rates Ethereum wallets publicly, on a methodology anyone can check, without asking the teams being rated for permission. We look at what a wallet's code and network traffic actually do, not what its landing page says, and score it pass/fail across five categories: Security, Privacy, Self-sovereignty, Transparency, and Ecosystem fit. Today that's 21 software wallets and 11 hardware wallets, plus open trackers for privacy- and security-relevant standards like stealth addresses (ERC-5564) and clear signing (ERC-7730/ERC-8213).

If we stopped, three things get worse.

- Users lose the only standardized way to tell which wallets actually protect their privacy versus which ones just say they do.
- Wallets lose a public accountability mechanism that has already changed what they ship, not hypothetically, we have the receipts below.
- The ecosystem-wide privacy efforts we support from the sidelines, Kohaku, Encrypt the Mempool, Clear Signing, lose the one observer mapping their standards to real wallet adoption without a wallet-industry conflict of interest.

## What privacy properties do you provide and what does a user have to trust for them to hold? *

We're not a privacy tool a user installs. What we provide is visibility into whether the wallets people already use actually implement privacy properly, and public pressure when they don't.

Concretely, we track per wallet, pass or fail:

- Stealth address support, and private token transfers beyond it, tracked via our ERC-5564 tracker.
- Multi-address correlation privacy: does the wallet give you a fresh address per app, or can your activity be trivially linked across everything you touch.
- Per-app wallet address isolation.
- Orderflow transparency: does the wallet disclose how, or whether, it profits from routing your transactions. We shipped this attribute in July 2026, borrowing the disclosure logic TradFi already applies to payment-for-order-flow, and applied it immediately to MetaMask, Rainbow, and Zerion.
- Data collection: what telemetry or third-party RPC traffic leaves your device. We verify this from source code, and we teach people to check it themselves too. Our Berlin Blockchain Week "Brew" workshop was a live session on capturing a wallet's network traffic to look for exactly this kind of leak.

For any of this to mean something, a user has to trust a few things about us specifically:

- That our rules are objective: we only score what's checkable from public source or observable traffic, never a team's word for it.
- That we have no reason to go easy on anyone: we turn down funding from wallet-related entities specifically so no wallet team is ever also a funder.
- That we're not creating a new privacy risk ourselves: the site is static, hosted on IPFS, no accounts, nothing to leak.
- That the whole process is checkable: the ruleset, the wallet data, and the pipeline that turns one into the other are all open-source on GitHub, so anyone who disagrees with a rating can show us why in public.

None of this makes a wallet more private on its own. What it does is make it costly for a wallet to be quietly bad at privacy, and cheap for a good one to prove it. That's the lever we pull.

## Github Repository Links *

List all relevant Github repos separated by commas.
https://github.com/walletbeat/walletbeat

## Software License(s) *

List the license(s) of your privacy-critical code. They must be a recognizable open-source license to be eligible for the round.
MIT License

## What is your quantifiable traction? *

Define the best measure(s) of your traction. Provide numbers and links. See our examples based on category. https://docs.google.com/document/d/1nGZTwhXyxolIKDYhaOFSNapbnwnWBJedo-InIhe-T94/edit?usp=sharing

Here's where we actually stand:

- 21 software wallets and 11 hardware wallets under active, source-verified rating, live at beta.walletbeat.eth.limo.
- Our repo: 114 GitHub stars, 83 forks, 2,576 commits on the beta branch, 107 open issues, 24 open PRs, MIT-licensed. github.com/walletbeat/walletbeat
- Wallets changing behavior because we called something out, not because we asked:https://github.com/walletbeat/walletbeat/blob/beta/resources/docs/impact/impact.md
- Grown from close to zero to 1,000+ followers on X (@walletbeat) with no paid promotion.
- Talks and workshops at Berlin Blockchain Week 2026 (four sessions, including a Neo-Cypherpunk Summit privacy panel and the network-traffic "Brew" workshop above), EthCC[8], and Devcon Buenos Aires.
- Named by @web3privacynow alongside GrapheneOS, Tor Project, Brave, Nym, Radicle, DarkFi, and Kohaku Wallet in their overview of the on-chain privacy landscape.
- $106,100 USD from the Ethereum Foundation's ESP program, funded and disbursed starting September 2025, which paid for finalizing our rating methodology (including the privacy attributes above), our stage-rating system, and early governance.
- One prior Giveth quadratic-funding round, which raised roughly two months of operating costs.
- A public treasury transparency report we update continuously, address by address, expense by expense.

# Your Funding & Future

## Please share funding goal for Epoch 13: *

$10,000 USD in USD.
It's our own internal floor for what a matching round like this should raise. It sits inside a bigger 2026 target of $90,000 across all funding sources. Our treasury is around $20,000 right now against roughly $10,000 a month in operating costs, covering one full-time and four part-time contributors, so this round buys real, specific time.

One honest note on how we'd handle it: we learned the hard way that holding our whole treasury in ETH cost us around 35% of our EF grant's value to market movement over the past year. We've since moved to splitting new funding between ETH and USDC and are gradually converting the rest, so this isn't a repeat mistake.

## What would this funding unlock for your project? *

Be specific.

Two things we've already committed to publicly and would move faster with support: reviewing Kohaku's privacy profile using our own tooling before its launch, and extending our hardware wallet privacy methodology.

It also funds turning our Berlin Blockchain Week footage into content people can actually learn the methodology from, and it keeps our monthly ecosystem updates landing on time, which is what keeps the pressure on wallets consistent instead of one-off.

## What type of non-financial support (if any) would make a difference in your progress and growth journey *

Be specific. Talent, time, legal, distribution, infrastructure, etc?

Amplification within Octant's network, since almost all of our growth so far has been organic and we don't have a marketing budget to speak of.

## Have you raised venture capital or launched a token? *

If applicable, please give details on amounts, timing, and structure.

No, and we don't plan to. We're a working group that turns down funding from wallet-related entities on purpose, because the moment a wallet team is also a funder, our ratings stop being trustworthy. Our funding has been grants and public donation rounds, nothing else.

## Have you received direct grant funding or sponsorship in the last year? *

If applicable, please give details on amounts, timing, and what it funded.

Yes: $106,100 USD from the Ethereum Foundation's ESP program, proposed July 2025, funds disbursed starting September 2025. It funded finishing our software wallet rating methodology, our stage system, initial data collection, and early marketing work.

We also participated on one Giveth Ethereum Security round that raised about two months of operating costs.

## Have you received Octant funding before? *

If applicable, provide the epoch number(s), funding total, and what it funded.

No.

## Who has endorsed or funded your research to date? *

Please provide references.

The Ethereum Foundation, through the ESP grant above, and several of our regular technical contributors are also EF members. We presented at EthCC[8], introduced by the EF's Tomasz K. Stańczak. @web3privacynow named us alongside GrapheneOS, Tor Project, Brave, Nym, Radicle, DarkFi, and Kohaku Wallet in their privacy landscape overview. And our data already gets used under the hood by third-party tools like WalletRadar.

## What KPIs do you want to be measured by? *

Provide 1-2 verifiable measures.
- Wallets changing behavior because we called something out, not because we asked:https://github.com/walletbeat/walletbeat/blob/beta/resources/docs/impact/impact.md
- 21 software wallets and 11 hardware wallets under active, source-verified rating, live at beta.walletbeat.eth.limo.
- Our repo: 114 GitHub stars, 83 forks, 2,576 commits on the beta branch, 107 open issues, 24 open PRs, MIT-licensed. github.com/walletbeat/walletbeat

## Need Help?

DM us on Twitter at @OctantApp if you have more questions about the Epoch and/or your application.
