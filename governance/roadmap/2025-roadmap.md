# Walletbeat 2025 Roadmap

- _Date_: July 2025

_The purpose of this document is to come to a consensus of what Walletbeat needs to achieve in 2025 for the graduation of its revamped ("beta") version into the main version._

## Background & project history

Walletbeat was kicked off by [Fluidkey](https://fluidkey.com/)'s [mozrt2](https://github.com/mozrt2) in December 2023, documenting the state of Ethereum wallets, at [walletbeat.fyi](https://walletbeat.fyi). The idea was to follow the lead of [L2BEAT], and to do for Ethereum wallets what L2BEAT has done for Ethereum rollups. Walletbeat rates Ethereum wallets on criteria such as multi-chain support, ENS integration, open-source licensing, account recovery, etc.

In November 2024, inspired by [Vitalik Buterin's post on Ethereum alignment](https://vitalik.eth.limo/general/2024/09/28/alignment.html), [polymutex](https://github.com/polymutex) kicked off an effort to revamp Walletbeat. This work took on the name of "Walletbeat Beta". The purpose of this effort was to go deeper into each wallet and expand the way wallets in which are evaluated to closely map with Ethereum values. See [Ethereum Magicians kickoff thread on this](https://ethereum-magicians.org/t/making-ethereum-alignment-legible-wallets/21841). Shortly thereafter, Vitalik Buterin published a [blog post on what Ethereum wallets should implement](https://vitalik.eth.limo/general/2024/12/03/wallets.html). Other contributors have joined the effort: [darrylyeo](https://github.com/darrylyeo), [nconsigny](https://github.com/nconsigny), [lucemans](https://github.com/lucemans), [nloureiro](https://github.com/nloureiro), [Jontes-Tech](https://github.com/Jontes-Tech), [minimalsm](https://github.com/minimalsm), [Hugoo](https://github.com/Hugoo), and [PatrickAlphaC](https://github.com/PatrickAlphaC).

Whereas Walletbeat was a single large comparison table, Walletbeat Beta goes in depth on all of the attributes it rates. Each attribute comes with rationale as to its importance, and each wallet rating comes with a reason for the rating, a set of steps the wallets can take to improve its rating, etc. Attributes are grouped around Ethereum values: **Security**, **privacy**, **self-sovereignty**, **transparency**, and **ecosystem alignment**.

As Walletbeat Beta has been getting closer to finalizing its attribute set and rating more wallets, this roadmap doc (written in June 2025) aims to determine the goals that Walletbeat needs to achieve to officially launch and replace the site currently at [Walletbeat](https://walletbeat.fyi), as well as other goals we should aim for beyond that point.

## Goals already achieved as of June 2025

Walletbeat Beta currently features 12 software wallets, 7 hardware wallets, 5 attribute groups, and 30 rated attributes. While many of the wallets do not have full feature data, the site does have a large amount of information that is valuable to the public. Launching in a not-fully-rated state also encourages others to contribute to fill in the missing data. Notably, the Ambire wallet development team has already contributed PRs to fill out the wallet feature data for their own wallet, and a MetaMask developer has also offered to do so in the future once the attribute set is finalized.

The project has benefited from other regular and non-regular contributors joining in to help. The project having multiple regular contributors is essential for Walletbeat's long-term legitimacy, sustainability, and decentralization; it must not be "just some internet person's opinion".

We have also achieved recognition from important parts of the ecosystem (Ethereum Foundation contributors, shout-out on the Daily Gwei, one "new attribute" tweet retweeted by Vitalik Buterin), received a grant from the Ethereum Foundation, and have been offered 2 podcast spots (declined due to pre-launch status, but may apply post-launch).

## Goals for launch

### Wallet methodology stabilization

- **Finalize wallet attribute set**:
  - _Why important_: This determines the criteria by which wallets are judged. It is critical for Walletbeat as a public wallet rating site to get this right.
  - _Why a goal for launch_:
    - Making major post-launch changes to the attribute set would be seen as flaky and arbitrary. While attribute set will (and should be expected to) change over time, it needs to be reasonably stable over the 6 months past launch to give wallets a static target to aim for and catch up, before increasing the difficulty by raising the bar further.
    - We expect a large initial influx of wallet review data to come in from wallet development teams shortly after launch. The feature set and attribute set should be stable by the time this influx arrives.
  - _Details_: This contains the following criteria that still need implementation:
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
    - _(Potentially more to come.)_
    - In addition, this includes an effort to [consolidate software and hardware wallet attributes](https://github.com/walletbeat/walletbeat/issues/181) and refactor the "maintenance" attribute group.
- **Finalize the "stage" system**:
  - _Why important_: The stage system is similar to L2BEAT's rollup stage system, which Ethereum users are familiar with and would expect out of a site named similarly to L2BEAT. This stage system gives users a meaningful summarization of the quality of a wallet.
  - _Why a goal for launch_: Upon launch, almost all wallets will look rather bad. The stage system (similar to L2BEAT's rollup stage system) gives wallets a specific, realistically-achievable, cross-attribute target to aim for.

### Wallet data collection

- **Finish rating a sufficient number of wallets**:
  - _Why important_: This is a measure of how serious Walletbeat is at scrutinizing wallets. We must spend research effort doing the grindy work of wallet research; this is inherent to the mission.
  - _Why a goal for launch_:
    - Launching with a lot of data unpopulated with make the site useless to wallet users.
    - Wallet development teams would not be motivated to fill in their wallets' data when so few of their competitors are fully rated.
  - _Details_: Includes both software and hardware wallets. See [issues tagged `wallet-research` on issue tracker](https://github.com/walletbeat/walletbeat/issues?q=is%3Aissue%20state%3Aopen%20label%3Awallet-research%20label%3Apre-launch).
- **Make wallet data easy to fill in or rectify**:
  - _Why important_: We cannot rely on Walletbeat contributors alone to fill in wallet feature data.
  - _Why a goal for launch_:
    - We expect a large initial influx of wallet review data to come in from wallet development teams shortly after launch. We need to make the data ingestion process easy and streamlined.
    - Data at launch will have received very little double-checking, and is therefore more likely to be incorrect. Public exposure increases scrutiny and is likely to find the mistakes that slipped through. We should therefore expect many requests to rectify invalid data, which we need to be able to handle quickly and efficiently.

### Walletbeat UX

- **Establish a common UX theme for the site**:
  - _Why important_: Walletbeat Beta has so far been worked on mostly by non-UX-specialized engineers with little sense of design. The EF has contributed their designers to address a lot of these problems, but more UX work remains around consistent iconography, logo, press materials, etc.
  - _Why a goal for launch_: Walletbeat may be featured in articles and screenshotted quite often at launch, and these screenshots and articles to stand the test of time.
- **Flesh out EIP-7702 adoption tracker**:
  - _Details_: Flesh out the EIP-7702 feature set, populate its data for 12 wallets, and reflect this on a dedicated EIP-7702 tracking page.
  - _Why important_: This was promised to the EF in the [Pectra Proactive Grant Round](https://esp.ethereum.foundation/pectra-pgr).
  - _Why a goal for launch_: This is not strictly a launch goal, but timeline-wise these things are pretty much the same, so might as well treat it as a launch goal.

### Walletbeat legitimacy

Ecosystem-wide relevance and credibility is existential to the mission of a watchdog-type organization.

- **Establish new ownership of "Walletbeat" name**:
  - _Details_: The name "Walletbeat" is currently overloaded, half owned by Fluidkey (`walletbeat.fyi`), half owned by polymutex (`beta.walletbeat.eth`). If Walletbeat Beta is to replace its predecessor, there should be a formal handover of the Walletbeat name.
  - _Why a goal for launch_: Needed for clarity of the status of Walletbeat as a name.
- **Decentralized governance: Create an onchain entity (`walletbeat.eth` multisig)**:
  - _Why important_: Necessary to start decentralizing governance.
  - _Why a goal for launch_: Part of establishing Walletbeat as a more formal organization for it to be perceived as credibly-neutral.
  - _Details_: Creating an onchain multisig with at least 5 different entities represented on it is the minimum necessary to decentralize Walletbeat's operation and to show that governance is decentralized, not just one person's pet project. Details in the "Governance structure" section below.
- **Secure endorsements from other parts of the ecosystem**:
  - _Why important_: Need to acquire legitimacy from existing watchdogs in order to be recognized as one.
  - _Why a goal for launch_: Part of putting Walletbeat on a path to relevance, legitimacy, and credibility within the Ethereum ecosystem.

## Non-goals for launch, but still in scope for 2025

- **Finish migration to Astro/Svelte**:
  - _Why important_: This work is already funded. This will make Walletbeat leaner and more future-proof.
  - _Why non-goal for launch_: As this is a UX-only change, it does not materially improve of Walletbeat as a _content_ site in the moment. The benefits of this migration are more felt in the long term when it comes to maintainability, which is a post-launch concern.
  - _Details_: Why this isn't a launch goal, progress so far suggests that this will be done by launch nonetheless.
- **Make governance structure legible**:
  - _Why important_:
    - Necessary for current contributors to feel that they have legitimate ownership of the project, which is critical to Walletbeat being a decentralized, community-owned project.
    - Necessary to avoid long-term capture by wallet development teams.
  - _Why non-goal for launch_: The main purpose of the launch is to propagate Walletbeat as an idea and an informational resource. Launch itself may end up attracting more new contributors who may be further motivated to contribute rather than the current set which is limited in size.
  - _Details_: Write governance charter of Walletbeat as an organization.
- **Research and implement a social media strategy**:
  - _Why important_: To reach relevance and remain there, Walletbeat doesn't just need credibility; it also needs people to pay attention.
  - _Why a non-goal for launch_: Only effective once the site is launched; social media involvement should remain a low-priority until then.
- **Social media preview images for wallet ratings**:
  - _Why important_: Walletbeat's ultimate goal is to push the Ethereum wallet ecosystem forward. To that end, it is critical to keep the pressure on wallets to improve. Having Walletbeat data be visually understandable at a glance and shareable in this easy-to-parse format allows Walletbeat's influence to stretch beyond its own tiny presence on the Internet.
  - _Why non-goal for launch_: There is no specific utility to having this feature done by launch time; it is more of a long-term pressure-keeping feature which can be implemented at any time later.
- **Prepare conference materials for wallet attributes**:
  - _Why important_: Spreading the word about Walletbeat, both for credibility and for attention. Spread Ethereum values and explain why they matter to whoever will listen.
  - _Why a non-goal for launch_: Only makes sense once Walletbeat is worthy of that attention, which implies having the site ready for visitors.
- **Organize a public donation campaign**:
  - _Details_: Raise additional funds through a public donation campaign to fund ongoing development and wallet reviews. Walletbeat will purposefully refuse donations from sources known to be affiliated with wallet development entities.
  - _Why important_: Establish long-term funding source while avoiding capture risk.
  - _Why a non-goal for launch_: No sense in asking for donations for a site that isn't launched.
- **Making Walletbeat data open and accessible to all**:
  - _Details_: Make Walletbeat wallet rating data exportable as JSON (for machine readability) and Markdown (for LLMs) to consume.
  - _Why important_: Walletbeat is at its core an informational site, and the value in that information lies in how trustworthy, reliable, and widespread it is. Expanding the reach of this data helps all of these goals.
  - _Why non-goal for launch_: The primary audience of the launch is humans, not machines.

## Non-goals for 2025

- **Embedded wallets**:
  - _Why important_: Embedded wallets are an increasingly important part of the Ethereum ecosystem, and also a possible centralization vector by which users may be veered away from self-sovereignty, censorship-resistance, and privacy. Like the rest of the wallet ecosystem, Ethereum values should be expected of these wallets too.
  - _Why non-goal for 2025_: This is a large-scope project and approaching it thoughtfully will take significant time and research effort.
- **Wallet usage statistics**:
  - _Why important_: Useful for wallet users as an indication of their relative popularity, and can be a good sorting signal for the comparison table.
  - _Why non-goal for 2025_: Not very important relative to other types of data for Walletbeat to keep track of, and only valuable after a few months' worth of data can be gathered.

## Responsibilities for launch priorities

- **polymutex**:
  - Finalize software wallet attribute set
  - Finalize the software wallet stage system, implement stage system UI components
  - Collect data on wallets: MetaMask (mobile and browser extension)
  - EIP-7702 adoption tracker
  - Create an onchain entity (`walletbeat.eth` multisig)
  - Secure endorsements from other parts of the ecosystem
  - Research and implement a social media strategy
  - Prepare conference materials for wallet attributes
  - Organize a public donation campaign
- **nconsigny**:
  - Finish rating at least 6 wallets (Ledger, Trezor)
- **lucemans**:
  - Establish a common UX theme for the site (Finalize Walletbeat branding)
- **darrylyeo**:
  - Finish migration to Astro/Svelte
- **Hugoo**:
  - Collect data on wallets: Coinbase Wallet (mobile and browser extension), Rainbow wallet (mobile and browser extension), Phantom (mobile and browser extension), Zerion (mobile and browser extension)
  - Make wallet data easy to fill in or rectify
  - Establish a common UX theme for the site (Finalize Walletbeat branding)
- **PatrickAlphaC**:
  - Finalize hardware wallet attribute set (Transaction legibility, Wallet bug bounty program, Security history)
  - Consolidate software and hardware wallet attributes
  - Define hardware wallet stage system
  - Collect data on Ledger, Trezor, GridPlus.

## Governance structure

Walletbeat's governance structure is currently a nebulous combination of the following:

- [Fluidkey](https://github.com/fluidkey) provides hosting for `walletbeat.fyi` and own this domain name.
- [mozrt2](https://github.com/mozrt2) provides PR review and maintenance for `walletbeat.fyi`.
- [polymutex](https://github.com/polymutex) owns `walletbeat.eth`.

The ideal state for Walletbeat's post-launch, pre-2026 governance structure should have the following properties:

- `walletbeat.eth` shall be owned by a multisig with at least 5 active members. Volunteers so far:
  - polymutex
  - nconsigny
  - lucemans
  - darrylyeo (maybe)
  - PatrickAlphaC
- Multisig membership goals:
  - None of the members share the same organization as each other
  - None of the members are associated with an organization which develops a wallet reviewed on Walletbeat
- Fluidkey formally recognizes this multisig as owning "Walletbeat" as a name.
- Walletbeat may have a [BDFL](https://en.wikipedia.org/wiki/Benevolent_dictator_for_life)-like structure for maintainership, but that person should not have unilateral authority over the `walletbeat.eth` multisig.

[nconsigny](https://github.com/nconsigny) has volunteered for BDFL role for a few months as of this writing (July 2025). [polymutex](https://github.com/polymutex) cannot commit to the project full-time for these few months, though future availability may be greater.

## Post-launch goals

After launch, the work that remains to be done is:

- Reviewing more wallets.
- Driving attention and adoption to Walletbeat through social media and advocacy at Ethereum conferences.
- Updating wallet data as wallets evolve.
- Establishing long-term governance structure.
- Establishing long-term funding mechanisms while avoiding capture risk.
- (Slowly) refining the methodology and attribute sets by which wallets are rated.
- General open-source project maintenance duties: reviewing PRs, fixing bugs, keeping the website up-to-date, etc.
- General project governance duties: Handling potential churn in contributors and governance.
