---
Status: Draft
Grant recipient: Walletbeat (collective)
Amount: 106100
Currency: USD
---

# Walletbeat 2025 EF funding grant proposal

## Team profile

_Briefly describe your organization. Provide links to previous work. How is your organization suited to the project's objectives, and how does it provide the necessary expertise?_

Walletbeat is a collective of contributors who believe the Ethereum wallet ecosystem is in need of a watchdog-type organization. Like L2BEAT, we believe a steward is necessary to uphold Ethereum values in the wallet ecosystem. This includes security, privacy, self-sovereignty, transparency, and standards alignment.

[Walletbeat's beta revamp](https://beta.walletbeat.eth.limo) has been in the works since November 2024 by:

- **Individuals**:
  - [polymutex](https://github.com/polymutex) (dev, wallet attribute design & research, project stewardship)
  - [darrylyeo](https://github.com/darrylyeo) (dev, UX)
  - [Hugoo](https://github.com/Hugoo) (wallet research, UX)
  - [PatrickAlphaC](https://github.com/PatrickAlphaC) (hardware wallet attribute design & research)
- **EF members**:
  - [nconsigny](https://github.com/nconsigny) (dev, hardware wallet attribute design & research, Walletbeat project stewardship within EF)
  - [lucemans](https://github.com/lucemans) (dev, UX)
  - [nloureiro](https://github.com/nloureiro), [Jontes-Tech](https://github.com/Jontes-Tech), [minimalsm](https://github.com/minimalsm) (UX)

Our work so far can be seen at **[`beta.walletbeat.eth`](https://beta.walletbeat.eth.limo)**.

None of Walletbeat's regular contributors are affiliated with wallet companies (with the exception of Fluidkey, which is why Fluidkey's wallet product is not and will not be listed on Walletbeat).

## Project category

_Please choose a category that your project best fits in._

"Other"

(Comment: There are no category options that are about wallets or the app layer in general...)

## Brief project summary

_Describe your project in a few sentences (you'll have the chance to go into more detail in the long form). If it's already underway, provide links to any existing published work._

Walletbeat aims to be the L2BEAT of wallets. It reviews wallets in an effort to ensure the Ethereum wallet ecosystem remains competitive, interoperable, and upholds Ethereum values.

## Describe the current status of the project and progress achieved so far

_For example, do you have an MVP? Please describe its functionality and limitations and provide a link to it here._

Walletbeat was kicked off by [Fluidkey](https://fluidkey.com/)'s [mozrt2](https://github.com/mozrt2) in December 2023, documenting the state of Ethereum wallets, at [walletbeat.fyi](https://walletbeat.fyi). The idea was to follow the lead of [L2BEAT](https://l2beat.com), and to do for Ethereum wallets what L2BEAT has done for Ethereum rollups. Walletbeat rates Ethereum wallets on criteria such as multi-chain support, ENS integration, open-source licensing, account recovery, etc.

In November 2024, inspired by [Vitalik Buterin's post on Ethereum alignment](https://vitalik.eth.limo/general/2024/09/28/alignment.html), [polymutex](https://github.com/polymutex) kicked off an effort to revamp Walletbeat. This work took on the name of "Walletbeat Beta". The purpose of this effort was to go deeper into each wallet and expand the way wallets in which are evaluated to closely map with Ethereum values. See [Ethereum Magicians kickoff thread on this](https://ethereum-magicians.org/t/making-ethereum-alignment-legible-wallets/21841). Shortly thereafter, Vitalik Buterin published a [blog post on what Ethereum wallets should implement](https://vitalik.eth.limo/general/2024/12/03/wallets.html). Other contributors have joined the effort: [darrylyeo](https://github.com/darrylyeo), [nconsigny](https://github.com/nconsigny), [lucemans](https://github.com/lucemans), [nloureiro](https://github.com/nloureiro), [Jontes-Tech](https://github.com/Jontes-Tech), [minimalsm](https://github.com/minimalsm), [Hugoo](https://github.com/Hugoo), and [PatrickAlphaC](https://github.com/PatrickAlphaC).

This work now lives at [`beta.walletbeat.eth`](https://beta.walletbeat.eth.limo) and was [presented at the EthCC[8] by Tomasz K. Stańczak](https://farcaster.xyz/polymutex.eth/0x2246c5ac). The aim of this effort is to replace the canonical `walletbeat.fyi` site, once the launch criteria (described in the roadmap below) are met.

## What problem(s) are being solved by within the scope of the grant?

_What is the specific problems, research questions, or needs you are trying to address?_

The scope of the grant is to fund work on the **launch blockers** for Walletbeat beta, and to "launch" Walletbeat beta as the canonical version of Walletbeat, replacing `walletbeat.fyi`.

What "launch" means here is:

- All pre-launch tasks are completed, as documented below.
- `beta.walletbeat.eth` redirects to `walletbeat.eth`
- `walletbeat.fyi` also redirects to `walletbeat.eth`

These criteria represent the work necessary to get Walletbeat beta to be sufficiently comprehensive such that it provides tangible benefits to Ethereum users looking to make an informed decision about which wallet to use, and to wallet development teams to help them understand the wallet landscape and make long-term product decision about their own roadmaps. The specific tasks involved are detailed in the section below, but at a high level, they are about stabilizing the set of data Walletbeat collects and tracks about wallets, finalizing the methodology by which this wallet data is turned into easy-to-understand ratings, and collecting data about a sufficient number of wallets to make the site useful.

## Proposed tasks, roadmap and budget?

_Provide a summary that includes a timeline of the expected work and an estimated budgetary breakdown._

At a high level, the tasks needed for launch are as follows:

- **Wallet data collection**: Collecting wallet data for a meaningful number of software and hardware wallets, so that they can be rated using this data.
- **Wallet methodology stabilization**:
  - Stabilizing the individual attributes and methodology by which wallets are rated using the aforementioned data.
  - Stabilizing the wallet "Stage" rating system (similar to L2BEAT's stage 0/1/2 system), which synthesizes individual wallet attributes into a high-level, easily-communicable singular score.
- **UI/UX**: Getting the site UI and UX up to a stable level.
- **Legitimacy**: Formalizing the governance structure of Walletbeat as an organization, and put it on a path to becoming a credible institution within the Ethereum ecosystem.

Each of these corresponds to a **track** below, with its own milestones.

### Track: Wallet methodology stabilization

**Objective**: Converge on a set of wallet attributes and rating methodology that is stable enough such that wallet development teams feel comfortable making product decisions around.

This does _not_ mean rating criteria will not change over time (they will), but it _does_ mean that we must reach a sufficient degree of stability and confidence around the launch-time set of criteria. This is necessary to mitigate the risk of lack of credibility that Walletbeat may suffer from (see "Risks" section below for more on this).

**Coordinator**: polymutex for direction and implementation of software wallets. Other contributors also need to be involved to provide input and consensus formation around the rating criteria, due to the need to ensure they are well-calibrated. Other contributors may also be involved in the implementation of specific attributes.

#### Milestone: Finalize wallet attribute set

This milestone contains the following criteria that still need implementation:

- **Security**:
  - [Private key access security](https://github.com/walletbeat/walletbeat/issues/218)
  - [Account recovery](https://github.com/walletbeat/walletbeat/issues/191)
  - [Transaction simulation](https://github.com/walletbeat/walletbeat/issues/190)
  - [Transaction legibility](https://github.com/walletbeat/walletbeat/issues/200) (owner: PatrickAlphaC)
  - [Wallet bug bounty program](https://github.com/walletbeat/walletbeat/issues/230) (owner: PatrickAlphaC)
  - [Security history](https://github.com/walletbeat/walletbeat/issues/231) (owner: PatrickAlphaC)
- **Privacy**:
  - [Private token transfers beyond Stealth Addresses](https://github.com/walletbeat/walletbeat/issues/192)
  - [Per-dapp wallet addresses](https://github.com/walletbeat/walletbeat/issues/193)
- **Transparency**:
  - [Orderflow transparency](https://github.com/walletbeat/walletbeat/issues/194)
- **Ecosystem**:
  - [Sign In With Ethereum (SIWE) support](https://github.com/walletbeat/walletbeat/issues/203)
  - [Warnings for dapp-specified EIP-7702 delegation requests](https://github.com/walletbeat/walletbeat/issues/166)
  - [Unified cross-chain balances](https://github.com/walletbeat/walletbeat/issues/164)
  - [EIP-7702 transaction batching support](https://github.com/walletbeat/walletbeat/issues/219)
- [Software and hardware wallet attribute consolidation](https://github.com/walletbeat/walletbeat/issues/181), refactor "maintenance" attribute group (owner: PatrickAlphaC)

This list may grow as the project continues; the above is only the known set of missing attributes. We welcome feedback around existing and missing attributes that should be added to this set.

- **Owner**: polymutex, except otherwise noted on specific attributes
- **ETA**: 2.5 months
- **Funding**: 45,000 USD
  - 40,000 USD, distributed to contributors on a per-implemented-attribute basis. We expect the set of needed attributes may still change between now and launch, but in order to keep the grant application size fixed, this sum will be split between however many attributes end up being implemented.
  - Additional 5,000 USD specifically for the software/hardware wallet attribute consolidation, as it is a large refactor involving many attribute redesigns.

#### Milestone: Finalize the wallet stage system

This milestone represents the finalization of the set of criteria that go into assigning a single "Stage" rating to all wallets. The intent of the stage system is to reduce the amount of rating information that Walletbeat has on wallets down to a single easy-to-communicate label, similar to L2BEAT's stage system.

- **Software wallets**:
  - [Define what "stage 1" means for a wallet](https://github.com/walletbeat/walletbeat/issues/173)
  - [Define what "stage 2" means for a wallet](https://github.com/walletbeat/walletbeat/issues/195)
  - [Implement UI features for stage system](https://github.com/walletbeat/walletbeat/issues/221)
- **Hardware wallets**: Same set of issues.

- **Owner**: polymutex for software wallets, PatrickAlphaC for hardware wallets.
- **ETA**: 2 weeks
- **Funding**: 10,000 USD (5,000 USD for software wallets, 5,000 USD for hardware wallets)

### Track: Wallet data collection

**Objective**: Populate Walletbeat's database with data about major wallets, and make it easy for wallet data to be added or updated in the future.

This work runs in parallel with the "Wallet methodology stabilization" track, but cannot fully complete until that track is complete. This is because the set of data needed on all wallets depends on the methodology used to rate wallets to begin with. Therefore, while it is possible to input data about wallets that we already know we need, it is possible that as the rating methodology evolves, further data on wallets will need to be gathered.

**Coordinator**: None; this type of work is easily sharded out to multiple contributors without the need for high-level coordination, as seen below.

#### Milestone: A sufficient number of software wallets are >90% rated

This milestone represents a meaningful amount of software wallet review work, such that wallet users and developers understand the landscape.

"Why >90%": A wallet being ">90%" rated means it has sufficient information such that at least 90% of Walletbeat's final attributes have the data necessary to arrive at a conclusion, and that these attributes are sufficient to determine the stage of a wallet. This non-100% threshold ensures that this milestone can make progress even if the "Wallet methodology stabilization" lags behind.

Walletbeat already has the following 3 software wallets >90% rated:

- Rabby, browser extension version
- Daimo, mobile version
- Ambire, browser extension version

We have selected the following 10 software wallets, bringing the total of rated wallets up to 13:

- **Coinbase Wallet**, [mobile](https://github.com/walletbeat/walletbeat/issues/98) and [browser extension](https://github.com/walletbeat/walletbeat/issues/97) versions. (Owner: Hugoo)
- **Rainbow wallet**, [mobile](https://github.com/walletbeat/walletbeat/issues/96) and [browser extension](https://github.com/walletbeat/walletbeat/issues/95) versions. (Owner: Hugoo)
- **MetaMask**, [mobile](https://github.com/walletbeat/walletbeat/issues/94) and [browser extension](https://github.com/walletbeat/walletbeat/issues/93) versions. (Owner: polymutex)
- **Phantom** [mobile](https://github.com/walletbeat/walletbeat/issues/232) and [browser extension](https://github.com/walletbeat/walletbeat/issues/233) versions. (Owner: Hugoo)
- **Zerion** [mobile](https://github.com/walletbeat/walletbeat/issues/234) and [browser extension](https://github.com/walletbeat/walletbeat/issues/235) versions. (Owner: Hugoo)

- **Owner**: Per-wallet
- **ETA**: 2 weeks per wallet, can be done in parallel if assigned to different contributors.
- **Funding**: 2,500 USD per wallet, so 25,000 USD for 10 wallets.

#### Milestone: A sufficient number of hardware wallets are >90% rated

This milestone is the same as the above, but for hardware wallets. None of the hardware wallets are fully rated at the moment. We have selected the following hardware wallets for rating:

- [Ledger](https://github.com/walletbeat/walletbeat/issues/196) (Owner: PatrickAlphaC & nconsigny)
- [Trezor](https://github.com/walletbeat/walletbeat/issues/197) (Owner: PatrickAlphaC & nconsigny)
- [GridPlus](https://github.com/walletbeat/walletbeat/issues/220) (Owner: PatrickAlphaC)

- **Owner**: Per-wallet
- **ETA**: 2 weeks per wallet, can be done in parallel if assigned to different contributors.
- **Funding**: 5,000 USD per wallet, so 15,000 USD for 3 wallets.
  - The per-wallet rate is higher than software wallets, because testing hardware wallets requires buying a physical device, tests are more manual, and require testing integration of the hardware wallet with multiple software wallets.

#### Milestone: Easy data entry

The goal of this milestone is to make initial wallet data entry easy for new wallets that wish to contribute to Walletbeat's database. We expect an initial surge of interest from wallet development teams to contribute data about their own wallets. For this reason, we must make it easy for them to contribute an initial data set.

This includes [documentation around the data entry process](https://github.com/walletbeat/walletbeat/issues/198), and may grow to encompass an intake form to collect some high-level data in a more structured manner.

- **Owner**: Hugoo
- **ETA**: 2 weeks
- **Funding**: 5,000 USD

### Track: Walletbeat UI/UX

**Objective**: Get the Walletbeat website to a decent level of usability and accessibility.

**Coordinator**: polymutex

#### Milestone: Finish migration to Astro/Svelte

This work has been ongoing since January 2025, and is nearing completion. It revamps the site away from React and Next.js to modern Astro and Svelte. It also features UX improvements around the pie chart components, as well as accessibility and performance improvements from the use of Astro and Svelte.

- **Owner**: darrylyeo
- **ETA**: 3 weeks
- **Funding**: 0 USD (Work is already funded out of pocket by polymutex)

#### Milestone: EIP-7702 tracker

This work is already funded by [a 577.02 USD grant from the EF as part of the Pectra Proactive Grant round](https://github.com/walletbeat/walletbeat/tree/beta/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round). This work is therefore not part of this grant, but is nonetheless part of Walletbeat's pre-launch roadmap.

This milestone is only about the incremental work of exposing Walletbeat's EIP-7702 data on a dedicated EIP-7702 tracker page. The bulk of the 7702-related work (determining the data to track from wallets and gathering it) is already part of the "Wallet methodology stabilization" and "Wallet data collection" tracks.

The UI [work](https://github.com/walletbeat/walletbeat/issues/199) has [already started](https://beta.walletbeat.eth.limo/wallet/7702/), but has not been completed due to:

- Other EIP-7702 wallet feature data has not yet been added; it is part of the "Wallet methodology stabilization" track, which has progressed a lot since then but not yet on EIP-7702-specific data.
- Svelte migration changing the table component used; further work on the EIP-7702 tracker UI would have to be re-done after the Svelte migration to use the new table component.

- **Owner**: polymutex
- **ETA**: 2 weeks incremental work
- **Funding**: 0 USD (Work is already funded by Pectra Proactive Grant round)

#### Milestone: Finalize Walletbeat branding

While Walletbeat's website design is fairly stable, [the project lacks strong and recognizable logo/branding/press materials](https://github.com/walletbeat/walletbeat/issues/80). This is needed pre-launch such that the project has consistent and recognizable representation on social media.

- **Owner**: lucemans, Hugoo
- **ETA**: 1 week
- **Funding**: 2,000 USD to Hugoo (as lucemans cannot receive grant funding as an EF member)

### Track: Walletbeat legitimacy

**Objective**: Put Walletbeat on a path to relevance, legitimacy, and credibility within the Ethereum ecosystem.

Ecosystem-wide relevance and credibility is _existential_ to the mission of a watchdog-type organization. In other words, if no one looks or cares about Walletbeat and its wallet ratings, then wallet development teams will not feel any pressure to work towards improving their stance on these ratings, and therefore Walletbeat as an organization would fail to achieve its mission of pushing the wallet ecosystem forward. This track is about ensuring that Walletbeat rises to a place where its mission can succeed.

Part of this is to establish Walletbeat as a more formal organization. For it to be perceived as credibly-neutral, Walletbeat needs a legible governance structure.

#### Milestone: Decentralized governance: Create an onchain entity (`walletbeat.eth` multisig)

[Creating an onchain multisig](https://github.com/walletbeat/walletbeat/issues/202) with at least 5 different entities represented on it is the minimum necessary to decentralize Walletbeat's operation and to show that governance is decentralized, not just one person's pet project.

- **Owner**: polymutex
- **ETA**: 1 or 2 days, assuming a sufficient diversity of members can be found
- **Funding**: 100 USD (covers initial gas fees for setting up Safe multisig; remaining funds will go to an EOA with ENS `contentHash` record modification permissions to be used for CI to deploy new versions of the site)

#### Milestone: Formalize governance structure

Write up a governance charter and ratify it by all multisig members. At a high level, the goal of this charter should be to define the duties of Walletbeat multisig members, the membership change process, and document anti-capture provisions (e.g. members must be fully divested from wallet projects that are reviewed on Walletbeat in order to participate in governance).

- **Owner**: polymutex, but needs consensus from all participants
- **ETA**: 1 day of active work, 1 week of consensus-gathering
- **Funding**: 0 USD

#### Milestone: Secure endorsements from other parts of the ecosystem

Walletbeat has to build and maintain credibility. This can be achieved through endorsements of trusted actors in the space, such as the Ethereum Foundation (this has [already happened](https://farcaster.xyz/polymutex.eth/0x2246c5ac)), and other watchdog-type organizations like L2BEAT and others. Walletbeat will seek to create a [webring](https://en.wikipedia.org/wiki/Webring) with these organizations, so that they link to each other as endorsement of each other's work and to drive additional mutual traffic.

- **Owner**: polymutex
- **ETA**: 2 weeks
- **Funding**: 1,000 USD

#### Milestone: Research and implement a social media strategy

Only a hundred people or so know about Walletbeat today. To achieve a level of prominence sufficient to achieve its mission of pushing the wallet ecosystem forward, Walletbeat's reach needs to grow by 10x to 100x. Therefore, Walletbeat has to initially be _loud_ on social media to make itself more known, while not being too obnoxious so that people start to dismiss it.

Historically, social media posts have been mostly about [Walletbeat's efforts to be built in public](https://farcaster.xyz/~/channel/walletbeat).
These posts will continue pre-launch, but we also need additional vectors to drive additional attention to Walletbeat post-launch.

- Reviews of specific wallets across multiple attributes at once.
- Explanation threads of the benefits of specific wallet attributes, annotated with examples of wallets that do it right and that don't do it right.
- Quote-tweets/quote-casts of wallet feature announcements, reminding users of the wallet's ratings and showing the progress (or lack thereof) that wallets are making with regards to their implementation and prioritization decisions.

This milestone tracks the formalization of this strategy, along with the creation of pre-written posts of this nature to be ready by launch, in formats ready to be posted on X and Farcaster.

- **Owner**: polymutex
- **ETA**: 1.5 weeks
- **Funding**: 1,000 USD

#### Milestone: Prepare conference materials for wallet attributes

Ethereum conferences are a good vector to make Walletbeat more known within the ecosystem. This milestone tracks the preparation of conference materials about Ethereum's values, how they map onto wallet attributes, and how Walletbeat's rating methodology lines up with these values. The materials need to show why Ethereum values matter, and can mention specific wallets that do things right and others that don't.

This effort is blocked by the need to have consistent branding/logo/press materials.

- **Owner**: polymutex
- **ETA**: 3 weeks
- **Funding**: 2,000 USD

#### Milestone: Organize a public donation campaign

Raise additional funds through a public donation campaign to fund ongoing development and wallet reviews. Walletbeat will purposefully refuse donations from sources known to be affiliated with wallet development entities.

- **Owner**: polymutex
- **ETA**: A few days to set up website materials
- **Funding**: 0 USD, should be hopefully self-funding.

### Timeline

- **ETA**:
  - **Wallet methodology stabilization**: 3.5 months
  - **Wallet data collection**: 2 months (somewhat in parallel, somewhat behind Wallet methodology stabilization track)
  - **Walletbeat UI/UX**: 2 months (in parallel)
  - **Walletbeat legitimacy**: Varies (depends on contributor availability) but probably not the limiting factor.
  - polymutex plans to take a few months from full-time commitment to focus on Walletbeat, which will allow the bulk of this effort to be focused during this time.
    The timing of this is still undecided as of this writing (2025-07-23), but likely starting in late September.
    If so, this provides a reasonable timeline of launch by the end of 2025.
- **Total funding requested**: 106,100 USD.

## Why is your project important?

_Why should solving these problems or addressing these needs be prioritized, what evidence do you have of importance or demand?_

Walletbeat aims to level up the Ethereum wallet ecosystem with regards to Ethereum and cypherpunk values. The wallet ecosystem today is lackluster on many aspects. Few wallets integrate a light client or privacy-preserving transactions. Most wallets will leak the user's IP address to a centralized RPC provider. Almost none provide true censorship resistance. One of the most popular Ethereum wallets (Phantom) today is closed source.

It is imperative for wallets to embody Ethereum values, such as privacy and censorship resistance; without this, the chain's own properties (such as censorship resistance) do not benefit Ethereum users.

As an example, a lot of research work has gone into ensuring that the Ethereum L1 chain has wartime-level censorship resistance properties. However, users do not benefit from these properties in practice, unless wallets actually take advantage of them. Yet most of them today rely on trusted intermediaries to post transactions to the chain; intermediaries who are in a position to censor transactions. This prevents users from actually reaping the benefits of the censorship resistance research that the EF has funded.

Walletbeat fixes this by examining the reliance of wallets on these intermediaries, which has the side-effect of applying social pressure for them to compete on this axis. In turn, this creates ecosystem momentum for wallets to become more censorship-resistant.

## How does your project differ from similar ones?

_What other solutions are being worked on, what unique contribution will you make or advance will you provide beyond the state of the art?_

Walletbeat is very similar to these projects in terms of its approach: a watchdog-type organization that aims to direct social pressure on a specific part of the ecosystem to align with Ethereum values, in such a way that market incentives alone may not necessarily converge on. Where Walletbeat differs is its area of focus. Other watchdog-type projects focus on other parts of the Ethereum ecosystem:

- [L2BEAT](https://l2beat.com) focuses on Layer 2s.
- [DeFiScan](https://www.defiscan.info) focuses on DeFi applications' trustlessness.
- [DappRank](https://dapprank.eth.link) focuses on decentralized frontends.
- [Client Diversity](https://clientdiversity.org) focuses on Ethereum node software diversity.
- [StorageBeat](https://storagebeat.eth.limo) focuses on decentralized storage solutions.

Walletbeat is unique in that it focuses on wallets. Wallets are a critical part of the Ethereum ecosystem, as it is the interface by which users interact with it. Nonetheless, these other projects are also critical to Ethereum as an ecosystem, and Walletbeat benefits from them as well; in particular, we have learned a lot from L2BEAT's experience and project structure while building and coming up with the methodology used by Walletbeat.

There are also other projects that focus on a _narrow focus_ of what makes a good Ethereum wallet:

- [Coinspect](https://www.coinspect.com/wallets/testing/) focuses on wallet security.
- [Wallet Test Framework](https://wtf.allwallet.dev) focuses on wallets' automated testing development practices.
- [7702Beat](https://swiss-knife.xyz/7702beat) focuses on wallets' (and chains') EIP-7702 readiness.

Walletbeat aims to be a broader, higher-level view of the wallet ecosystem as a whole. That said, Walletbeat aims to eventually incorporate their rating methodology and/or data (as appropriate and as licensing permits), so any funding that goes towards these projects is a net good for Walletbeat as well.

## Describe how your project will result in a public good.

_Public goods are things like open source code, shared infrastructure, openly shared research, documentation, community building or other benefits provided to the community that are typically under-provided by the free market._

Walletbeat is an open-source, open-data public resource that aims to document the state of the ecosystem. Like L2BEAT, the intent is to have it become a trusted, unbiased, and objective source of truth about wallets, their internals, and how well they convey Ethereum values. In turn, this creates social and competitive pressures on the wallet ecosystem to become more Ethereum-aligned.

## Will your results be open source?

_If not, please explain why._

Walletbeat's website code, rating pipeline, and wallet database are all and will all remain licensed under the [MIT License](https://github.com/walletbeat/walletbeat/blob/beta/LICENSE), a [Free and Open Source Software license](https://opensource.org/license/MIT).

## Describe the expected effects of your project proposal on the Ethereum ecosystem.

_Please list the expected results of the project and explain how they will have a positive effect on the Ethereum ecosystem at large._

We expect that Walletbeat will become the canonical place that Ethereum users and wallet developers alike come to understand the state of the Ethereum wallet ecosystem, in the same way that Ethereum users and L2 developers come to L2BEAT to understand the state of Ethereum L2s.

In turn, we expect that this will create additional incentives for wallet development teams to focus on features that are important for Ethereum users and align with Ethereum's values, beyond the ones that market incentives alone would converge on.

Here are a few examples of important, Ethereum-values-aligned features that market incentives have so far failed to deliver at scale across the wallet ecosystem:

- **Security**: Chain verification using light clients.
- **User safety**/**UX**: Social recovery and/or key rotation for smart wallets.
- **Privacy**: Integrated privacy-preserving transfers, such as Stealth Addresses or Privacy Pools.
- **Self-sovereignty**: Support for users to force-withdraw their funds from L2s without relying on centralized providers.
- **Transparency**: Fee transparency and disclosures around wallets' built-in financial features such as swaps and cross-chain bridging.
- **Ecosystem**: Support for chain-abstracted balances, addressing, and spending (e.g. "send 1 Ether to `alice.eth` on their favorite L2, using whichever balances I have, automatically bridging as necessary").

While these features exist in _pockets_ of the wallet ecosystem today, they are not widespread, despite being table stakes given Ethereum's roadmap and values. We expect that Walletbeat, once recognized as a trustworthy institution by the ecosystem in a similar manner as L2BEAT, will be able to generate sufficient social-pressure incentives for these features (and others) to become important priorities for all Ethereum wallets.

## Describe key risks and challenges to your project.

_What are the critical risks, relating to both project implementation and achieving expected impacts?_

### Risk: Walletbeat fails to reach ecosystem recognition critical mass

**Risk**: Ecosystem-wide recognition and trustworthiness is existential to the mission of a watchdog-type organization. If no one looks or cares about the ratings, then wallet development teams will not feel any pressure to work towards improving their stance on these ratings, and therefore Walletbeat as an organization would fail to achieve its mission.

**Mitigations**: To reach relevance and remain there, Walletbeat needs two scarce resources: **attention** and **legitimacy**. The "Walletbeat legitimacy" track covers how we plan to mitigate this risk. At a high level, the strategy is to formalize and decentralize Walletbeat's governance structure, acquire endorsements from other already-legitimate parts of the ecosystem, and to make Walletbeat more widely known within the ecosystem.

### Risk: Walletbeat is captured by wallet development teams

**Risk**: Without a critical mass of unaligned contributors, Walletbeat as an organization is at the mercy of being influenced by wallet development teams pushing their agenda such that the rating methodology favors their wallets and/or disfavors their competitors'; or meddles with the wallet data entry process to hide inconvenient properties of the wallet.

**Mitigations**:

On a **governance** level:

- Walletbeat governance shall require that all individuals making rating methodology decision (or participating in the discussions thereof) must disclose their affiliation.
- Additionally, if an individual sits on the Walletbeat multisig, any wallet created by an entity that individual has a stake into becomes ineligible for being listed on Walletbeat.
  - This measure is especially relevant in the case where Fluidkey (the organization which started Walletbeat) would retain a stake in Walletbeat. If so, the wallet software that Fluidkey produces would not be eligible to be listed on Walletbeat.

On a **technical** level:

- All GitHub contributors submitting PRs must disclose their affiliation; this is [enforced by the type system](https://github.com/walletbeat/walletbeat/blob/7c22d4ae04067df2a280ce761bbab4279a09692d/src/schema/wallet.ts#L47-L66).
- Walletbeat maintains strong decoupling between wallet _feature data_ (data about wallets, designed to be as objective as possible) vs _attribute methodology_ (a non-wallet-specific pipeline that takes _feature data_ as input and turns it into a subjective rating on a specific attribute). This decoupling ensures that the wallet-specific data entry is unambiguous, difficult to bias, and minimizes the chance of debate being possible on a per-wallet basis, as all the subjective decisions happen at a later non-wallet-specific stage.

### Risk: Walletbeat rating methodology is miscalibrated at launch

**Risk**: Walletbeat's rating methodology is seen as too onerous or too generous by wallet development teams and/or users, or requires too much churn early on, causing Walletbeat to lose credibility.

Walletbeat's attribute set, rating methodology, and stage system criteria must be stable and fair by launch. Walletbeat "launching" means instantly creating implicit "demands" from Walletbeat to wallet developers. These "demands" must be mutually-beneficial, useful, consistently-applied, sustainable, reasonable, achievable, applicable, meaningful, fair, stable, and ecosystem-aligned. Otherwise, they may be perceived as illegitimate, unaligned, or not be worth paying attention to. They may also require revision and churn, which would also be perceived as unfair and non-credible.

**Mitigation**: There is no silver bullet here, but Walletbeat should take a few notes out of watchdog-type organizations who have been here before (L2BEAT).

Walletbeat will:

- Seek maximal consensus pre-launch about attribute design from the EF, contributors, and some feedback from wallet development teams (taken with a grain of salt).
- Add a disclaimer at launch that the rating methodology is subject to change, to be removed after a few months.
- Mark the stage system as "beta" initially at launch for a few months, as it is likely to require some churn.
- Commit to not changing the methodology for individual attributes more than once per year (after a few months of launch), other than for removal of attributes which may take place at any time.
- When the methodology does need to change, display results of the old rating methodology for some time, with a multi-month timer showing what will happen with the new methodology.

### Risk: Walletbeat launch timeline slips due to contributor constraints

**Risk**: A large amount of work is owned by polymutex, who has existing full-time commitments. This grant would allow polymutex to put these commitments to the side and work full-time on Walletbeat for some time, but this requires approval out of polymutex's control which may not be granted.

**Mitigation**: No mitigation, but an understanding that such approval is not granted, the ETA for polymutex-owned tasks on this list will have to be redistributed across other contributors, and the tasks done by polymutex will likely take 5 to 6 times longer (nights and weekends). This can delay launch until early to mid-2026.

This is not an existential risk for Walletbeat as a project, but the earlier Walletbeat launches, the easier its mission will be to push the wallet ecosystem towards Ethereum values, before Ethereum as an ecosystem becomes overly integrated and ossified into hard-to-change legacy structures (e.g. traditional financial system and banking, Internet identity systems, etc). This is especially important for values such as privacy and self-sovereignty, which if not well-ingrained as part of the ethos of Ethereum wallets, risks being compromised or only half-implemented in wallets.

## What are your plans after the grant is completed?

After this grant, Walletbeat would be in a "launched" state. As described earlier, this means it has stable methodology for rating wallets, and a meaningful number of wallets have been fully rated. At that point, the work that remains to be done is:

- Driving attention and adoption to Walletbeat through social media and advocacy at Ethereum conferences.
- Reviewing more wallets.
- Updating wallet data as wallets evolve.
- Establishing long-term governance structure.
- Establishing long-term funding mechanisms while avoiding capture risk.
- (Slowly) refining the methodology and attribute sets by which wallets are rated.
- General open-source project maintenance duties: reviewing PRs, fixing bugs, keeping the website up-to-date, etc.
- General project governance duties: Handling potential churn in contributors and governance.

Walletbeat has a [longer-term roadmap document](https://github.com/walletbeat/walletbeat/tree/roadmap-2025/governance/roadmap) describing some of this work in more detail.

## If you didn't work on this project, what would you work on instead?

Walletbeat has been a passion project so far, both in its Fluidkey era and in the Walletbeat Beta era. Therefore, its contributors would likely work on it regardless of the acceptance of this grant proposal. What the grant changes is the ability to dedicate a larger portion of time to the project and enable it to make rapid progress until launch.

## Have you applied for or received other funding?

Walletbeat has applied for and received [a 577.02 USD grant from the EF as part of the Pectra Proactive Grant round](https://github.com/walletbeat/walletbeat/tree/beta/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round) to fund its EIP-7702 tracking efforts.

No other funding has been sought or received as of this writing, but Walletbeat plans to apply for retroactive funding where possible (e.g. Gitcoin Grants) after launch.

## Anything else you'd like to share?

As Lucemans and nconsigny are EF members, they will decline the funding, and any funds assigned to items listing them will be redirected to other contributors. Nonetheless, they will still be able to contribute to the project.

## How did you hear about the Ecosystem Support Program?

A member of the Ethereum Foundation (Nicolas Consigny) got in touch and recommended we apply.

## Did anyone recommend that you submit an application to the Ecosystem Support Program?

_Please include the person's name and details of their referral._

**Nicolas Consigny**:

- ENS: `niard.eth`
- Farcaster: [niard](https://farcaster.xyz/niard)
- GitHub: [nconsigny](https://github.com/nconsigny)
- X: [ncsgy](https://x.com/ncsgy)
