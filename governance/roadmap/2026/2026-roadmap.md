---
title: Walletbeat 2026 Roadmap
description: 'Roadmap for Walletbeat objectives in 2026 leading up to the end of the year.'
date: 2026-07
author: polymutex
---

# Walletbeat 2026 Roadmap

_July 2026, written by polymutex. The purpose of this document is to come to a consensus of what Walletbeat needs to achieve in 2026._

## Background & project progress

It has been 12 months since the [last roadmap document for Walletbeat](../2025/2025-roadmap.md). Thanks in large part to a [generous grant from the 1TS initiative of the Ethereum Foundation](../../grants/2025-07-ethereum-foundation-esp-grant-proposal/proposal.md), we have been able to make great progress and grow to a much more mature state.

## Goals already achieved as of July 2026

Please read [**this July 2026 update** on the 1TS grant](../../grants/2025-07-ethereum-foundation-esp-grant-proposal/2026-07-update/2026-07-update.md) for the details here.

**tl;dr**:

- Software wallet methodology is done
- Software wallet rating work is almost done
- Hardware wallet methodology and rating work is where we most fell short
- We did lots of adjacent work that wasn't in the proposal but greatly contributed to Walletbeat's mission nonetheless:
  - A whole branding exercise/identity, giving the site a more consistent identity and making methodology easier to understand in the process by having a visually-clearer rating system
  - Detailed contributor guides and quality-of-life improvements for contributors, some of which has materialized into more contributions, but we are still hoping most of the gains to be realized from this are ahead of us.
  - Original workshops, presentations, and talks, a lot of which can be reused for future conference materials at lower incremental cost to refresh vs the effort to create them the first time around.
  - Conference attendance and social media growth, growing Walletbeat's prominence and credibility in the ecosystem (necessary for Walletbeat's mission success, but still a lot more work to do here).
- While we did not go over budget, we _did_ go over on time. Most of this can be explained by contributor dropoff shortly after kicking off the effort, which took time to build back up.

## Goals for 2026

At a high level:

1. Priority #1 is to **finish what we promised we'd do**.

- This is critical, because without it, we'll forever face credibility challenges (egg on our face) when looking for further funding.
- We do not need to finish everything, but we need at the minimum to show a _capacity for getting there_, i.e. an ability to execute.

2. Priority #2 is to **increase the project's short-term and medium-term financial security**.

- This is necessary for the effort to continue uninterrupted. Going back to a volunteer-only, spare-time-only regime would set the project back quite a bit.
- This is priority #2 only because priority #1 hinders it.

3. Priority #3 is to **grow our ecosystem presence**.

- Social media presence is a necessary part of this, but not sufficient on its own.
- We need investment and partnerships here. Any partnerships we draw here should be on the more mature side of Walletbeat, i.e. the software wallet side of things. More on this below.
- This is priority #3 because we cannot afford to do much of it until priority #2 is solved.

We could add more priorities here, but 3 priorities is already quite enough for the rest of the year. If we had to add a fourth, it would be polish and QA. There remains low-hanging fruit and some points where our site feels neglected. This includes making the site work well on all platforms, addressing UI pain points, making the wallet data entry smooth, reliable, easy to verify, etc. But this comes secondary to all the above.

### Priority #1: Finish what we promised

Within the next 2 months, we need to:

- Finish up the software wallet stage ladder
- Finish fully rating at least 5 software wallets
- Finish up [all other `pre-launch` items](https://github.com/walletbeat/walletbeat/issues?q=state%3Aopen%20label%3A%22pre-launch%22) on the issue tracker
- Get a solid start on hardware wallet methodology, sufficient to show our ability to execute there

### Priority #2: Increase project financial security

- Reach out to at least **3 potential funding sources**. Top candidates:
  - Ethereum Foundation 1TS, as continuation of existing grant funding.
    - Rationale for funding: Continuation of Clear Signing and other wallet security initiatives, e.g. ERC-8213 tracking.
  - Other parts of the Ethereum Foundation worth reaching out to: Ecosystem Support, or Access Layer.
    - Rationale for funding: Renewed EF focus on other CROPS-y aspect of wallets, especially privacy. Good synergy with EF's Kohaku initiative.
  - Ludlow Institute.
    - Rationale for funding: Valuable privacy research for web3 wallets.
    - Blocked on additional maturity of the wallet data collection tool, and fully-rated wallets using this tool.
- Create **non-grant-based sources of funding**.
  - Accept crypto donations. This may include creating "badge NFTs" (commemorative only, absolutely no governance implications) similar to e.g. Rotki per-release funding NFT badges.
  - Participate in further ecosystem grant matching rounds, e.g. Giveth.
- **Increase predictability** of future funding.
  - Convert 50% of net-new funding into USDC within 1 month of receipt. This will stabilize the volatility of the treasury funds and mitigate potential further downwards movement in treasury value.
  - Incrementally convert remaining treasury funds to USDC.
  - Invest 75% of treasury USDC funds into Aave for some low-risk returns on this idle capital. Rebalance when drift between target and actual investment amount exceeds ~10k USDC. Withdraw if yield drops lower than 2% APY as the smart contract risk this adds makes this no longer an attractive proposition.
- **Lower operational costs**. This doesn't secure additional funding but helps need it less.
  - Automate more of the wallet data collection process.
  - Create better automated tests to avoid automatically-detectable regressions (e.g. UI issues)
  - Steer agents better to avoid churn and human review loops (e.g. CSS attribute system)
  - Video content production is automated from existing presentation footage (e.g. automated clipping)
  - Coinspect data is ingested. (This will instantly add a lot of wallet data to Walletbeat for only a one-time integration cost.)

### Priority #3: Grow ecosystem presence

The following items are **contingent on funding**. This doesn't mean we can't plan for them until funding is secured, but that we should expect that **this work is unfunded** until then.

- Plan out our **attendance for Devcon Mumbai**. This potentially includes:
  - Workshops and/or community booth programming for some or all days of the conference.
  - Talks on Walletbeat and CROPS values as they apply to wallets. Berlin Blockchain Week presentation materials are largely reusable, but should be updated to reflect latest methodology and state of Walletbeat.
  - Difficult decisions on who gets their ticket reimbursed and who does not. We will likely not have sufficient funding to reimburse more than 1 or 2 contributors, and the others will inevitably be disappointed and would have to either not go, or go at their own expense. See [travel policy](../../decisions/2026/travel-policy/travel-policy.md) for how the selection process will go.
  - Consequently, out of the contributors that do go, a game plan on how to split attendance needs to exist. This should prioritize community engagement, relationship building with potential funding entities, and wallet development teams who would be able to submit information about how their wallets operate.
- **Operationalize social media**:
  - Turn our footage from Berlin Blockchain Week into social media content. We have hours of footage to use. We need to use it. At the same time, we need to do so cost-effectively (see priority #2).
  - Being on time with monthly Walletbeat updates.
  - Increase our meme game to encourage wallets to follow Walletbeat's methodology.
    - Inspiration: Fileverse's social media strategy, contrasting Big Tech (Google Docs, social media, etc.) versus their product (CROPS-y office suite, VPNs, GrapheneOS, etc.)
  - Progressively turn up the level of depth and level of sophistication of the content we put out.
- **Be more visible** to funders and partners.
  - Communicate monthly updates directly to the EF and any other potential funding partners we can get.
  - **Be in the room** for industry-wide initiative where Walletbeat has a role to play:
    - Clear Signing: Have Walletbeat's logo be on the Clear Signing website in its next iteration.
    - Kohaku: Review Kohaku's privacy profile using Walletbeat's tooling, check if Walletbeat can be part of its launch announcement.
    - Frame transactions: Incorporate into our methodology in Account Abstraction features, be on any relevant announcements.
    - Encrypt the Mempool: Amplify encrypted mempools as a valid mitigation to wallets' unverifiable orderflow monetization practices.
- Keep up with the **changing social media landscape**:
  - If Farcaster dies a slow death from lack of engagement, stop posting there other than if done at zero incremental cost. This may already be the case today.
  - Try LinkedIn for a month, but cap at ≤20% incremental social media labor cost. If we get any meaningful additional engagement (e.g. ≥3 new PRs directly attributable, or at least 1 new contributors directly attributable), maintain investment, otherwise drop.
- Increase **ecosystem talent pipeline visibility**:
  - Design curriculum content for SheFi.
  - Design curriculum content for Cyfrin Updraft.
- **Optimize website content for shareability**:
  - Create OpenGraph preview images for wallet pages so that linking to wallet pages on social media platforms gives a nice preview image that shows the wallet rating's flower-style chart.
  - Create "EIP tracker" pages for wallets that shows which wallets have implemented this or that EIP, again with social media preview images for optimal shareability.
  - Ensure website layout (especially on mobile) leads itself well to screenshottability, e.g. sticky pie chart rating system that stays with you as you scroll.

## Observable outcomes & responsibilities

Between now and the end of the year:

- **Finish what we promised**:
  - **Top 5 wallets** on the homepage have ≤10% "unrated" slices.
    - Owner: ren2140
  - We feel confident saying that we will **not change the software wallet stages** for the next 6 months
    - (With the possible exception of the stage 2 criteria, which is OK because no wallet is even close to stage 1, so changes in stage 2 criteria in that timeframe won't affect wallets in practice.)
    - Owner: polymutex
  - All **`pre-launch` issues are closed** on the issue tracker.
    - Owner: polymutex
  - There are **no more attribute files we'd consider "unmaintained"** the way we currently do for hardware-wallet-specific grab-bag-type attributes (e.g. "maintenance" attribute group, "user safety" attribute).
    - Owner: 0xMattmatt
- **Increase project's financial security**:
  - At least 90k USD of additional future funding is secured across all funding methods.
    - Owner: polymutex
  - Walletbeat donation page exists and has nice badge NFTs.
    - Owner: 0xMattmatt dev, Teresa art/assets
  - Donation drives (including matching rounds) secure at least 5,000 USD or 10% of all secured funding, whichever is greater.
    - Owner: Lucila
    - _(Contingent on there being a large ecosystem matching round with ≥250,000 matching pool funds.)_
  - Less than 10% of PRs require follow-on PRs to fix issues they introduced.
    - Owner: polymutex
  - Any additional funding received between now and end of year is split 50%/50% between ETH and USDC; current treasury is progressively converted to 50% ETH/50% USDC in 10% increments per month and invested in Aave.
    - Owner: Treasury signers
  - Operational cost reduction: Establish workflow reaching **≤1 hour of video production labor per 15 minutes of postable-quality output footage**.
    - Owner: 0xMattmatt
  - Operational cost reduction: **Ingest Coinspect data**.
    - Owner: thegeekygrower
- **Grow ecosystem presence** _(everything below contingent on securing funding)_:
  - **On-time monthly updates**. Every monthly update is posted before or on the 7th of the following month.
    - Owner: Lucila
  - At least **2 engagements by 2 different contributors** approved at Devcon (in whichever form, talk/workshop/booth).
    - Owner: Lucila
  - More than **75% of our Berlin Blockchain Week video footage** is posted as clips or long-form recordings in some form or another.
    - Owner: Lucila
  - **Follower count on X** organically grows to ≥2,000.
    - Owner: Lucila
  - A set of meme templates exist, roughly **1 per Walletbeat attribute**.
    - Owner: Teresa
  - Walletbeat's logo is visible on the **Clear Signing website**.
    - Owner: 0xMattmatt
  - At least one **public communication from the EF/Kohaku** features Walletbeat.
    - Owner: polymutex
  - Walletbeat's logo remains on the **Encrypt The Mempool** coalition website.
    - Owner: polymutex
  - SheFi incorporates Walletbeat into its curriculum.
    - Owner: Lucila
  - Cyfrin Updraft incorporates Walletbeat into its curriculum.
    - Owner: 0xMattmatt
  - **OpenGraph images for wallet pages** exist.
    - Owner: thegeekygrower
  - **EIP tracker pages** exist.
    - Owner: ren2140

## Non-goals for 2026

- Finishing hardware wallet methodology and rating.
  - This might have been realistic if we had sufficient funding and didn't have a Devcon conference to organize travel around, but neither of these things is true. As such, our bar here should be to show that we have the _capacity to execute_ on hardware wallets, not to finish it up.
- Embedded wallets remain a non-goal.
  - Not realistic when we haven't even made a meaningful dent in hardware wallets.
  - This won't stop us from talking about embedded wallets on social media, discussing methodology for them, and pointing out the user sovereignty and privacy challenges they present.
- Fully-automated wallet testing.
  - Not realistic yet, and would be a distraction versus the more-important goal of growing our presence in the ecosystem. This priority will organically become more important as we do, and until then, we don't need to put too much focus on it.
- Large website overhauls/redesigns.
  - We've done enough of this. Note that this doesn't mean no branding work; it's just that our branding work should only be a continuation of existing work, i.e. incrementally more icons, presentation materials, etc. which follow the already-established themes.
  - No large technology changes either; keep existing Astro/Svelte/TypeScript stack.
- Formal governance charter
  - Current contributor set seems to work well without one. Not out of the question, but seems like a distraction given the current state. _(Note that control over treasury funds is already distributed 2-of-3.)_
  - If a funding source requires a formal governance charter, we can certainly write one up.
- Securing long-term stable funding.
  - Not realistic nor useful until critical mass is achieved.
- Expanding the size of the long-term full-time contributor set.
  - Can't afford to. Contributors that leave may need replacement, but growth without commensurate would be irresponsible.
  - Bounties here and there may still be appropriate, but these are one-off, not long-term commitments.

## Intended timeline

- By end of July 2026:
  - Software wallet ladder finalized.
  - Initial outreach to 1TS and/or other EF parts.
  - ≥10% of treasury held in USDC.
- By end of August 2026:
  - Finishing up top-5 software wallet rating.
  - All **`pre-launch` issues are closed**.
  - ≥20% of treasury held in USDC.
- By end of September 2026:
  - Existing hardware wallet attributes all refactored or deleted.
  - Clear Signing re-launch happens _(may postpone further if delayed due to non-Walletbeat factors)_
  - ≥50% of video footage is released.
  - Set of meme templates exists for social media.
  - At least ≥10k USD future funding secured; ≥30% of treasury held in USDC.
- By end of October 2026:
  - Walletbeat donation page exists and has nice badge NFTs.
  - Kohaku partnership active; Kohaku is tested for privacy leaks.
  - At least one ongoing grant matching round is ongoing.
  - At least ≥25k USD future funding secured; ≥40% of treasury held in USDC.
- By end of November 2026:
  - Devcon Mumbai engagements have happened; this encompasses talks/workshops/booth programming.
  - OpenGraph preview images for wallet pages.
  - Coinspect data ingested.
  - EIP tracker pages exist.
  - At least ≥50k USD future funding secured; 50% of treasury held in USDC.
- By end of year:
  - Both SheFi/Cyfrin Updraft curriculum material is created (not necessarily approved yet).
  - Reach ≥2,000 X followers.
  - At least ≥80k USD future funding secured.
- Ongoing across the entire timeline:
  - Monthly updates posted on time.

## Why the 90k USD funding target?

Walletbeat's current treasury, as of July 2026, sits at around ~30,000 USD remaining (mostly in ETH). This gives us just enough to finish up what we promised (priority #1) and to go through the motions of asking for another grant.

Our situation in our [previous grant proposal](../../grants/2025-07-ethereum-foundation-esp-grant-proposal/proposal.md) had us assign each milestone to the speculative monetary value based on the estimated level of effort. However, this time around, we have an established contributor base and a [history of actual per-category spend over time](../../treasury/treasury-transparency.md). Walletbeat's current burn rate is on the order of 10k USD per month, with travel reimbursements sometimes spiking above this, otherwise it can be lower.

Based on this, we can infer that with 90k USD over 5 months, 50k of it would go towards monthly expenses, and 30k left over to carry us out for perhaps an additional 4 months. This gives us some operational leeway which we can hopefully use to get to EthCC 2027 (March 2027), or to work on items that may have slipped in the interim.

### Why not lower?

Any amount lower than this is not worth the operational overhead of going through the motions of grant-funding.

Note that 90k USD is **already a cut** from our previous grant fund amount of 106k USD. Yet Walletbeat has largely matured and de-risked itself as a project during this time. As such, a floor of 90k is already a compromise to take into account the state of the crypto market and ecosystem.

If we are unable to secure at least 90k funding, then our remaining treasury funds are better spent continuing to harden ourselves to spin down into a hobby project, i.e. working on walkaway-test attributes.

### Why not higher?

90k is the floor, not the ceiling. It is what would keep us operating for long enough to be able to make meaningful progress without the operational overhead of re-asking for further grants.

Nonetheless, Walletbeat's position isn't one of strength. We have not gone over-budget on our promises, but we have gone over time. We still have to prove our capacity to execute. While this remains the case, we need to continue being nimble. This also acts as a forcing function to diversify our future funding sources.

### What if funding cannot be secured?

Funding today allows Walletbeat to employ one full-time developer, and 4 25%-ish-time other contributors. In other words, this amounts to about **2 full-time people**. See [treasury transparency report](../../treasury/treasury-transparency.md) for the full breakdown. Walletbeat has so far **operated on a much smaller budget** relative to that of similar actors in the Ethereum ecosystem.

In 2026, **the crypto industry is in a dire state**. All ecosystem participants are hurting for funding. There has been a decade of what in retrospect looks largely like capital misallocation by the ecosystem at large. The high selectiveness of the remaining active players means the bar is high, and clearing it yields much smaller funding than what meeting that same bar used to yield even a year ago. Therefore, Walletbeat must contend with the potential of running out of funds.

Walletbeat losing funding implies a **loss of dynamism** and **lower execution bandwidth**. Walletbeat started as volunteer-based, spare-time project from the beginning. Operating without funding reverts it to that state. This wouldn't spell the end of the project, but it means reverting to a hobby project rather than an active ecosystem participant/"live player". This would mean, for example, that initiatives like Clear Signing or Kohaku wouldn't have Walletbeat acting as a neutral ecosystem observer mapping them to CROPS values and user benefits.

The hope: Walletbeat sits **exactly at the intersection of CROPS and the Ethereum access layer**, both of which are EF priorities this year. Walletbeat's mission has been centered around cypherpunk values from the very beginning, prior to the "CROPS" acronym ever existing, and [back when privacy was definitely not on people's minds](https://x.com/polymutex/status/2078005764711485571). Thus, given the exact alignment of these goals, it is unlikely that the EF would _not_ fund Walletbeat in some capacity this year. Nonetheless, Walletbeat must look beyond the EF as sole funder; see above for all the ideas it will also pursue.

Regardless of what happens: In many ways, **Walletbeat meets the walkaway test**. Every part of Walletbeat was built to be future-proof, in the spirit of the walkaway test. The rating pipeline is highly modular and can be adapted for non-wallet rating projects. The site is hosted on IPFS with paid-upfront hosting costs, so the site will not disappear. The domain is on ENS and prepaid for decades as well. The wallet test tooling is future-proof and some of it (e.g. the network traffic analysis) can be repurposed to non-wallet uses as well.
