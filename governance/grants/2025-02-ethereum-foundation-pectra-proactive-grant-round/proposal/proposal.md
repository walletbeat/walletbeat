---
Status: Funded
Project name: Walletbeat beta EIP-7702 tracking
Project category: Other
Grant recipient: polymutex (Individual)
Fiat currency: USD
Amount: 577.02
How did you hear about this grant round: Other - Farcaster - https://warpcast.com/ef-esp/0xbe473fa9
Twitter handle: polymutex
Website: https://beta.walletbeat.eth.limo/
Farcaster: '@polymutex.eth'
Applied to any grants before: No
Any questions about this grants round: No
---

# Walletbeat beta EIP-7702 tracking

## Brief project summary

Walletbeat aims to be the L2Beat of wallets. It reviews wallets in an effort to ensure the Ethereum wallet ecosystem remains competitive, interoperable, and upholds Ethereum values. As part of this effort, Walletbeat's beta version wishes to assess and track wallets' EIP-7702 readiness and features. This grant is specific to this EIP-7702 effort.

- Beta version of Walletbeat: [https://beta.walletbeat.eth.limo/](https://beta.walletbeat.eth.limo/)
- Example of a wallet assessment: [https://beta.walletbeat.eth.limo/rabby/?browser](https://beta.walletbeat.eth.limo/rabby/?browser)

## Why is your project important?

Walletbeat aims to level up the Ethereum wallet ecosystem with regards to Ethereum and cypherpunk values. The wallet ecosystem today is lackluster on many aspects. Few wallets integrate a light client or privacy-preserving transactions. Most wallets will leak the user's IP address to a centralized RPC provider. Almost none provide true censorship resistance. The most popular Ethereum wallet today is closed source. And, specific to this grant: almost none are EIP-7702 ready. Walletbeat beta's EIP-7702 readiness and features tracking will provide users a way to see which wallets take advantage of EIP-7702 features, as well as social pressure for wallet development teams to start integrating these features.

## How is it different?

Walletbeat is one of few projects of its kind. There are other wallet review and comparison sites, but they tend to focus on one particular aspect, such as security or development practices (see links in the replies to [this Ethereum Magicians thread](https://ethereum-magicians.org/t/making-ethereum-alignment-legible-wallets/21841)). Walletbeat aims to take a broader view of the role of wallets within the Ethereum ecosystem.

## Formal proposal

_Following template_: [`https://notes.ethereum.org/@BOR4/HJVaegyByl`](https://notes.ethereum.org/@BOR4/HJVaegyByl)

### Project Abstract

[Walletbeat beta](https://beta.walletbeat.eth.limo/) is a public good, [open-source](https://github.com/fluidkey/walletbeat) MIT-licensed project that brings transparency to the Ethereum wallet ecosystem. As L2Beat has done for Ethereum Layer 2s, Walletbeat beta aims to do the same for Ethereum wallets. As a wallet review site, Walletbeat beta will assess wallets' EIP-7702 readiness, as well as the set of features enabled by EIP-7702 that each wallet implements. The main goal of this grant is to provide an objective and up-to-date look at the adoption and progression of EIP-7702 and the security and user experience features it enables for Ethereum users. Wallet users may use Walletbeat beta to inform their choice of which wallet to use, and wallet development teams may use Walletbeat beta to get a sense of what their competitors are doing and which features they can implement to differentiate themselves.

### Project Team

- **polymutex**: Lead on this EIP-7702-specific project; [`@polymutex.eth` on Farcaster](https://warpcast.com/polymutex.eth). Currently revamping Walletbeat (referred to as "Walletbeat beta" in this proposal). EIP-7702 is a part of this revamping effort. Roles: designing EIP-7702 readiness and features criteria, reviewing wallets, and coordination with other potential contributors on this project.
- Other contributors may also take part in this project, for purpose of specific per-wallet research or for providing feedback on the EIP-7702-related criteria. Walletbeat beta is open-source and everyone is free to contribute on GitHub.

### Background

Walletbeat is a public good, [open-source](https://github.com/fluidkey/walletbeat) MIT-licensed project that brings transparency to the Ethereum wallet ecosystem. As L2Beat has done for Ethereum Layer 2s, Walletbeat aims to do the same for Ethereum wallets.

Walletbeat was kicked off by [Fluidkey](https://fluidkey.com/) at [https://walletbeat.fyi](https://walletbeat.fyi) - but currently mostly in maintenance mode. However, in recent months, polymutex has kicked off an effort to revamp it from scratch (referred to as "Walletbeat beta" in this proposal) which goes deeper into each wallet and change the way wallets are evaluated to align with Ethereum values. See [Ethereum Magicians thread on this](https://ethereum-magicians.org/t/making-ethereum-alignment-legible-wallets/21841). This effort has been a building-in-public endeavor, with week-by-week progress posted on the [`/walletbeat` Farcaster channel](https://warpcast.com/~/channel/walletbeat).

This grant is _not_ intended to represent a grant from the Ethereum Foundation to Fluidkey. While currently part of Fluidkey, Walletbeat beta aims to decentralize away from it, but does not yet have a large enough credibly-decentralized contributor set at this time to make such a move practically meaningful. As such, for the purposes of this grant, polymutex (as an individual unaffiliated with the Fluidkey organization) is the sole intended recipient.

EIP-7702 readiness is one of the planned attributes for wallets listed on Walletbeat beta. EIP-7702 has massive potential for improved security and user experience for wallets, but these benefits are only realized if wallets adopt such features. However, there are adoption challenges, and concerns over the lack of adoption has been raised as a problem:

- [https://x.com/tyneslol/status/1885830752891228500](https://x.com/tyneslol/status/1885830752891228500)
- [https://warpcast.com/chaskin.eth/0xd81f324f](https://warpcast.com/chaskin.eth/0xd81f324f)

### Related Pectra EIP

[**EIP-7702**](https://eips.ethereum.org/EIPS/eip-7702): Set EOA account code.

The proposal builds upon this EIP by tracking its adoption in the Ethereum wallet ecosystem, funneling users into wallets that provide these features and creating social pressure for wallet development teams to implement such features.

### Objectives

Walletbeat beta will have additional criteria for EIP-7702 readiness and features, and track the EIP-7702 feature status of more wallets than the current 2 wallets it has data for.

### Outcomes

Three sets of people benefit:

- **Ethereum users** can use Walletbeat beta to decide which wallets provide them with useful EIP-7702-enabled features.
- **Wallet developers** can use Walletbeat beta to get a sense of what their competitors are doing and which features they can implement to differentiate themselves.
- **Ethereans as a whole** can use Walletbeat beta to track the adoption of EIP-7702 and EIP-7702-enabled end-user features over time.

### Grant Scope

This grant is specific to the EIP-7702 readiness and features tracking of Walletbeat beta. Walletbeat beta already has a basic "does the wallet make use of EIP-7702" attribute, but it is just a boolean and does not reflect the richness of the features that EIP-7702 enables. Additionally, Walletbeat beta only has data on this attribute for 2 wallets (Daimo and Rabby).

This grant covers two broad categories of work:

- Extension of wallet feature data to cover new functionality that EIP-7702 enables, such as transaction bundling (esp. token approvals), security features like key rotation and selective delegations, passkey-enabled transaction signing support, level of user control and custody over the smart contract wallet code used by the wallet, gas fee sponsorships, etc. It is expected that EIP-7702 will enable new yet-unimagined features as well, which would be researched and added to the Walletbeat beta wallet schema accordingly.

- Individual wallet research: the act of verifying wallet behavior (and code, if open-source) and populating the EIP-7702-feature-related information in Walletbeat beta's database. Walletbeat beta aims to add many wallets beyond the two it already has data for, and isn't useful as a wallet reviewing site until it has at least a dozen wallets.

### Methodology

Walletbeat beta is built as an open-source static frontend hosted on IPFS. Development is done in the open on GitHub and discussion on the [`/walletbeat` Farcaster channel](https://warpcast.com/~/channel/walletbeat). Technologies used include Astro, Material UI, TypeScript, etc. The Walletbeat beta dashboard is public and accessible to all web browser users.

EIP-7702 readiness and features criteria will be determined by discussion and issues on GitHub and Farcaster. Wallet data updates will be conducted by GitHub pull requests, as a result of wallet testing and wallet code review. Review research tasks may be posted to [Bountycaster](https://warpcast.com/~/channel/bounties) to shard out the work.

This grant proposal itself is part of the [Walletbeat beta repository](https://github.com/fluidkey/walletbeat/blob/beta/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round) as part of the intention to keep governance for Walletbeat as a project fully public and transparent.

### Timeline

By July 2025, Walletbeat beta shall have a solid set of criteria for EIP-7702 wallet features, and at least 12 wallets reviewed for EIP-7702 readiness and feature status.

### Budget allocation

577.02 USD as a one-time upfront grant.

polymutex is given decision authority on how to split and redistribute this to other contributors that come around to help out with this project. Funding is used to cover the wallet research effort, and may be used for paying Bountycaster bounties in order to distribute research work.

- **Why not higher?** Because this grant is scoped to a small subset of Walletbeat beta's overall work, and because grants of size 600 USD or larger come with extra paperwork.
- **Why not lower?** Because a grant of a lower amount would not be a meaningful amount of funds for Walletbeat beta as a project.
- **Why 577.02 specifically?** Because it contains the digits of "EIP-7702" in it.
