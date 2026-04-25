# Walletbeat ↔ wallet ecosystem communications policy

## Motivation

Walletbeat's mission is to push the wallet ecosystem forward towards Ethereum values. It does so by creating competitive incentives between wallet development teams. Critical to the effectiveness of these incentives is Walletbeat's own credibility as an impartial and fair institution, not biased in favor of any particular wallet.

This is in tension with the practical reality that Walletbeat inevitably has to interface with wallet development teams. This comes up in the context of wallet data entry, fielding questions on Walletbeat's methodology, reaching out to wallet development teams to get them onboarded onto Walletbeat's dashboard, etc. However, such communications have the potential to be perceived as backchannels that harm Walletbeat's credibility and impartiality. Whether such communications are **actually** or only **perceptually** backchannels is not important: either way, the mere perception harms Walletbeat's credibility and impartiality, and therefore harms its mission.

To resolve this tension, this document aims to establish an upfront policy which Walletbeat contributors and wallet development teams alike must acknowledge prior to engaging in any substantive communication or establishing long-term communications channels (group chats etc.)

## Scope

### Entities in scope

- **In scope**: any entity that develops wallet software or hardware, as well as any wallet-related entity that wallet software or hardware development teams may have a commercial relationship with. This includes (but is not limited to):
  - RPC providers. Example: Alchemy.
  - Transaction simulation services. Example: Blocknative.
  - Security auditors. Example: Trail of Bits.
  - RPC bundlers. Example: Pimlico.
  - Secure hardware element manufacturers.
  - Commercial wallet SDK providers. Example: Reown.
  - Venture capital firms that fund wallets. Example: a16z crypto.

* **Not in scope**:
  - Entities that wallet software or hardware development teams have exclusively-non-commercial relations with with, such as developers of unencumbered (free and open-source software) SDKs. Examples: Geth, Kohaku, Portal Network.
  - Entities that wallet development teams rely on but have nothing to do with the wallet specifically, such as employee payroll/HR services that wallet development team rely on for their operations.

### Communication channels in scope

- **In scope**:
  - Any form of private group chat, defined as 3 or more human participants.
    - "Participant" does imply active contribution; passive listeners are counted as participants.
  - Conference panels and similar in-person discussions where the conversational part (i.e. not single-sided presentation) is longer than 15 minutes.
- **Not in scope**:
  - Any communication on public communications channels. Examples: GitHub issues/PRs, X tweets, Farcaster, etc.
  - Communications that are not about any of: Walletbeat, wallets, or financial compensation.
  - Conference panels and similar in-person discussions where the conversational part (i.e. not single-sided presentation) is shorter than 15 minutes.
  - Group chats created prior to the creation of this policy (2026-03) on which the subject of Walletbeat does not come up.

## Policy

- The _existence_ of in-scope communication channels should be disclosed by publicly recording the following information:
  - Names of the set of Walletbeat contributors involved
  - Name of the associated wallet development team(s)
  - The closest number in the Fibonacci sequence (2, 3, 5, 8, 13, 21, etc) to the total number of participants, rounded up if equidistant between two numbers in the sequence.
  - Year and month (`YYYY-MM`) that the communication channel was established
  - Communications medium: Email, Signal, Farcaster DMs, X DMs, Discord, Telegram, SimpleX, etc.

* Upon the first week of formation of an in-scope communication channel, at least one Walletbeat contributor must post a link to this policy page such that all members of the communication channel are aware.
  - New members later joining the communication channel must also be made aware, whether by explicit statement upon joining or by other means available depending on the communications channel (e.g. group chat topic).
* Any member of the communication channel may **unilaterally decide to publish** part of or all of the conversation, so long as the following are respected:
  - All personally-identifying information are removed; people's names or pseudonyms are replaced with their affiliation details ("Walletbeat contributor" or "Member of [some wallet development team]").
  - The contents being disclosed accurately depict the surrounding context of the conversation (i.e. no adversarial selective quoting). This is implicitly enforceable by other members of the communication channels being able to expand the subset of the conversation that is published.
  - The person publishing the subset of the conversation must publicly disclose:
    - Their own identity/pseudonym and affiliation
    - The communications channel that the subset of the conversation is from
    - The span of time that the conversation covers (start/end dates as `YYYY-MM-DD`).
  - Exception: Large-scale communication channels (21 human participants or more) that feature both **ongoing open entry policy to wallet development teams** and **ability for new participants to look at past conversation history** are not subject to this publication, since other wallet development teams may join them and look back through the history at any time. The _existence_ of such communications channels must still be disclosed.
* Questions about Walletbeat methodology/clarifications do not _need_ disclosure, as it is helpful for wallet development teams to request clarifications on Walletbeat criteria. However, if any such discussion ends up resulting in a methodology _change_ on the Walletbeat website/repository (even just a wording/clarification change without an underlying policy change), the change _must_ disclose which communication channel was at the source of this change.
  - All methodology changes (whether the result of communications or not) must always come with accompanying rationale.
* Discussions about financial compensation **must** always be disclosed in full, unless they match already-published universal terms that Walletbeat already publicly offers to any other wallet development team.
  - Note: As of this writing (2026-03), Walletbeat does not have a business/funding model that involves financial compensation from wallet development teams, and there are no current plans to change this. However, if that _were_ to change in the future, this must change in a way where every wallet development team gets consistent, publicly-visible terms. Hence the principle that any compensation offer that deviates from such universal terms must be disclosed.

## Disclosure process

All disclosures must go in the Walletbeat repository in the `governance/communications/transparency` subdirectory.
