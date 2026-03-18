# 1TS Wallet Security Benchmark discussion

_This discussion was [posted on GitHub](https://github.com/walletbeat/walletbeat/discussions/407) for comment from 2025-12-16 to 2026-03-14. Its latest version is archived here._

_It attempts to define a security benchmark for wallets, and how such a benchmark can be integrated into Walletbeat._

## Context

This is being considered as part of the Ethereum Foundation's [Trillion Dollar Security Initiative](https://blog.ethereum.org/2025/05/14/trillion-dollar-security) (1TS), whose goal is to enable Ethereum as an ecosystem to secure immense amounts of capital. The 1TS effort has [funded Walletbeat](https://blog.ethereum.org/2025/08/20/trillion-dollar-sec-2), and one of 1TS's objectives is to come up with a sensible security benchmark for all parts of the Ethereum ecosystem, of which wallets are a part.

Walletbeat is well-positioned to formulate and deliver such a benchmark for the good of the Ethereum wallet ecosystem, and potentially to incorporate the benchmark's methodology inside Walletbeat.

## Terminology

"**Security**" in this context refers to security in the 1TS sense. This means security measures which enable Ethereum as an ecosystem to secure immense amounts of capital, and keep it in the control of their intended users in the face of hacks and well-funded adversaries. This slightly differs from Walletbeat's definition of "security" (as defined by the "Security" attribute group), because the 1TS definition of "Security" here also includes things that Walletbeat would call "**self-sovereignty**"; namely, the assurance that the user's funds remain theirs in the face of various scenarios (malicious RPC endpoint, compromised wallet development team).

## Prior art

[Coinspect Wallet Security Verification Standard](https://github.com/coinspect/wallet-security-verification-standard) is a great resource and is very detailed in some of its aspects. There's a lot of overlap with the list below and Coinspect's benchmark.

## A taxonomy of wallet security improvements

To better encapsulate what "Security" means here, one way to think about it for wallets is to think in terms of **threat model**: what are the possible threat vectors we must defend against to ensure security (in the 1TS sense)?

- **User safety**: Prevent users from making mistakes
  - **Threat model**:
    - The wallet has no bugs
    - The wallet team/dev process is not compromised
    - But **the user is easily deceived** or **the dapp they use is malicious**
  - **General threat vector**: Can the user make a mistake that the wallet could have automatically helped them avoid by warning them about it?
  - **Examples**:
    - Account recovery: What if the user drops their phone in a puddle or forgets their seed phrase? Can they still recover their account?
    - Hardware wallets: Can the user airgap their keys?
    - Transaction legibility: Is it clear to the user what they are signing?
- **Runtime security**: The type of issues that security auditors would point out
  - **Threat model**:
    - The wallet team/dev process is not compromised
    - The user does nothing wrong
    - But **the wallet has security flaws**
  - **General threat vector**: Does the wallet have exploitable security flaws or gaps that increases the user account's risk of being taken over?
  - **Examples**:
    - Bad crypto libraries: What if you use an insecure RNG for key generation?
    - Insecure local key storage: Are you storing the user’s key in cleartext on disk?
    - Bug bounty program: Are the incentives lined up so that security flaws are reported to you rather than exploited?
- **Operational security**: Issues that may rise from an incompetent/evil/compromised wallet developer
  - **Threat model**:
    - The wallet (currently) has no security flaws
    - The user does nothing wrong
    - But **the wallet team is compromised or evil**
  - **General threat vector**: Can a disgruntled employee (or new undercover-Lazarus hire) take over wallet users' funds or accounts?
  - **Examples**:
    - Software supply chain security: Are wallets' SBOM clear and auditable?
    - Build reproducibility: Is the build reproducible? Can people make sure that the wallet they are running is the build that was intended to be released?
    - Poor release process security: Can a malicious employee push a new release that contains code changes that no other employee has signed off on?
    - Poor smart account update process: Can a user's smart account contract be updated by the wallet developer themselves, or does the user have to take action?

## Security ladder

From the above taxonomy, we can already see that these categories can actually be mapped onto rungs of a ladder, because they define a sort of priority ordering:

- It makes no sense to implement **operational security** measures before the wallet itself is secure (**runtime security**): there's no point in strengthening the build/release process of a wallet that already has security flaws within itself to begin with.
- Similarly, it makes no sense to for a wallet to fund a **security audit** (a core component of ensuring **runtime security**) until they have implemented **user safety** features. All such features are inherently prone to security flaws: guardian-based account recovery mechanisms may use improper cryptographic algorithms for key splitting, transaction legibility features may be at risk from malicious dapps sending data that tricks them into displaying invalid data.

From the above constraints, we naturally get the following implementation timeline:

- **User safety** features should be implemented first, then submitted for **security auditing**.
- This audit will also cover remaining problems within the **runtime security** category, so those would be naturally the next priority for the wallet development team.
- Lastly, once all user safety features are implemented and all flaws found by the security audit are addressed, only then does it make sense to implement **operational security** features.

And given such a timeline, it makes sense to organize a **security benchmark ladder** around a similar ordering of priorities. This gives wallet teams a sense of progress along their efforts to make their wallets more secure.

Therefore, we define the following high-level stages:

- **Security Level 0**: Initial level; wallets start here.
- **Security Level 1**: "Protect the user".
  - Wallets here have implemented a significant number of **user safety** features, but may not have been audited yet.
- **Security Level 2**: "Secure the wallet".
  - Wallets here have passed a security audit and complied with a variety of **runtime security** features. They use common cryptographic libraries, follow best practices, etc.
- **Security Level 3**: "Hardened wallet development".
  - Wallets here have made efforts to protect their users against hostile actors within the wallet development process itself; this is **operational security**.

## Security Level 1: "Protect the user"

- **Basic authentication**: Does the wallet ensure that only the intended user is using it?
  - Criteria: Wallets must require some form of authentication and authorization, such as a password, biometrics, etc., along with manual lock and automated inactivity lock features.
  - Why level 1: Very basic level of safety.
- **Account recovery**: Can users recover their account if disaster strikes?
  - Criteria: Users must be able to recover their wallet if they lose their device or seed phrase.
  - Possible implementations: Key splitting uploaded to various cloud providers, remote key backups encrypted with user's wallet unlock password, etc.
  - Why level 1: User needs to set this up early in their journey, won't remember to do it later. Therefore, wallets must ubiquitously have such features, so that users always have some form of recovery possible no matter which wallet they start with.
- **Hardware wallet support**: Can users airgap their keys?
  - Criteria: The wallet must support at least one hardware wallet.
  - Why level 1: For key airgapping to be meaningful, users must do the work upfront. Thus, hardware wallet support needs to be similarly ubiquitous.
- **Scam alerting**: Does the wallet help the user avoid common scams?
  - Criteria:
    - Checking transactions against database of known-bad scam contracts
    - Checking dapp URLs against database of known-bad dapp URLs
    - Warning about unlimited ERC-20 approvals
    - Address whitelisting / warnings when sending to a new address
    - Contract whitelisting / warnings when interacting with a new contract
    - Warnings when sending to a recently-deployed contract
    - Warns the user about the sensitivity of seed phrase or other private key material
    - Prevents known-insecure forms of private key backup (e.g. block screenshots when displaying seed phrases or private keys, on mobile platforms that provide such blocking)
  - Why level 1: Keeps the user safe, very important early in their journey as well when they don't know how to spot scams.
- **Transaction legibility**: Can users understand what they are signing?
  - Criteria: For a set of representative "benchmark" transactions or messages to sign, the wallet must display:
    - Asset ownership changes (transaction simulation results)
    - High-level intent in human language (e.g. "deposit"/"take loan" with specific monetary amounts, "Sign in request for `example.com`" for SIWE)
    - Common fields: Gas cost, chain, nonce, etc.
  - Why level 1: Fulfill the basic need users have to to understand what they are signing.

## Security Level 2: "Secure the wallet"

- **Security audit**: Has the wallet ever undergone comprehensive security auditing?
  - Criteria: Must have undergone and published a comprehensive security audit, covering all wallet features including the user safety ones. Audit must reflect currently available key security model.
  - Why level 2: Standard security practice, and the audit is only meaningful once safety features are implemented.
- **Standard security practices**: Does the wallet follow standard security practices?
  - Criteria:
    - Reuse common open-source audited cryptographic libraries.
    - Secure RNG.
    - Secure key material storage (e.g. OS secure storage).
      - If the key is to be stored in "unexportable" storage (e.g. secure enclave without a way to export key material back out), the wallet must confirm that the user has made a backup prior to storing it exclusively there.
    - "Hot" private key material wiped from RAM as soon as possible (if ever held in RAM at all).
  - Why level 2: Issues identified by audit.
- **Source availability**: Is the wallet's source code available to the public?
  - Criteria: The wallet's source code must be public, as it pertains to key generation, key handling, key storage, and signing security model.
  - Why level 2: Basic need for users to be able to trust the security properties of the wallet; increased auditable surface. Unwillingness to open-source is a red flag for security.

In Level 2, we can also introduce more advanced **user safety** features that aren't as critical and where security audits are less likely to find problems:

- **Outstanding approvals management**: Does the wallet help the user determine and manage their outstanding token approvals, i.e. any outstanding permission that smart contracts and apps have to spend their balances without the user's active approval?
  - Criteria: Must show current outstanding permissions granted to applications, e.g. unspent ERC-20 approvals, and make it easy for users to revoke. For smart wallets with finer-grained spend permissions than ERC-20 approvals (e.g. rate-limits), the user must be able to see and manage those as well.
  - Why level 2: Only beneficial to a subset of users (those with large existing onchain history).
- **Account recovery drills**: Does the wallet ensure that the user will be able to successfully recover their account?
  - Criteria: Must verify that the user still has access to the necessary things to initiate recovery.
  - Examples: periodic quiz about one or two specific words from the seed phrase, periodic checks that the user has access to guardian accounts.
  - Why level 2: Only matters once the **Account recovery** feature (in level 1) exists in the first place.
- **Impact mitigation**: Does the wallet let the user protect themselves from accidentally-large unauthorized transactions?
  - Criteria: The wallet must provide a way to let the user set self-imposed limits, for which bypassing requires higher authentication requirements than day-to-day transactions. This can be rate-limits, high-value spend timelocks, or requiring multiparty authorization for certain subsets of transactions. Requires smart account.
- **Duress resistance**: Does the wallet let the user avoid wrench attacks? (**Mobile wallets only**)
  - Criteria: (**Mobile wallets only**): Must provide meaningful ways to avoid the worse outcomes of wrench attacks, e.g. a duress unlock code (which unlocks a decoy wallet that provides plausible deniability), plausible deniability that the wallet is even installed on the user's phone (e.g. decoy home screen without the wallet app listed), or a self-destruct unlock code.
  - Why level 2: Only needed by advanced users in specific situations.
- While not part of the 1TS security benchmark, **private token transfers** would be appropriate for wallets to implement here, as they increase the **physical safety** of the user (and therefore their security) by reducing the data trail they create as they use their wallet for payment purposes. This should be called out in the **duress resistance** evaluation, even if this does not change the status of the wallet on the **duress resistance** criteria, to make it clear that this privacy criterion is also meaningful for security.

Also in level 2, we can add "easy wins" from the **operational security** category, such as:

- **Deployment environment hardening**: Is the wallet suppressing its own permissions as much as possible in the context in which it runs?
  - Criteria:
    - For browser extension wallets: Chrome manifest permissions, locked-down `accessible_resources`, etc.
    - For mobile wallets: Minimal app permissions, self-imposed firewall rules, etc.
    - In general: Is there any further way in which wallets can lock themselves down that would not break a core user-centric functionality of the wallet?
    - Coinspect has a good list: https://github.com/coinspect/wallet-security-verification-standard
  - Why level 2: Easy win for operational security; good to get such practices culturally ingrained in the wallet development cycle.

## Security Level 3: "Hardened wallet development"

This is where it starts to make sense to protect users against the wallet development team itself.

- **Chain Verification**: Does the wallet trust the RPC provider for chain data? (It should not.)
  - Criteria: Must implement light client verification of chain data.
  - Why level 3: Most users will use the default RPC which is often run by the wallet developer itself, who is in a position to remove the light client as part of a wallet code update, so there is already some trust in the wallet provider by default. Light clients help a subset of users in a subset of situations relative to other user safety measures.
- **Release process safety**: How hard is it for a rogue wallet developer to introduce a backdoor into the wallet?
  - Criteria:
    - Source-available.
    - Builds must be signed and reproducible.
    - Security-sensitive changes intended to go into a release must undergo two-party review.
    - Wallets must implement transparent release mechanisms that make compromised artifacts detectable pre-release and rapidly reversible.
      - Example implementations that would satisfy this:
        - Releases are made source-available for at least some amount of time (e.g. 2 weeks) prior to wallets automatically upgrading to it, in order to leave time for bugs to be found
        - Security council may override to speed up releases for security fixes, but must do so through a public onchain voting process to make such operations transparent and accountable.
  - Why level 3: Only meaningful once the wallet itself has been audited to be secure.
- **Account Unruggability**: Can the wallet development team take over user accounts?
  - Criteria:
    - For smart accounts: User contract must be individually upgradable (not unilaterally by the wallet developer), and require an exit window for any contract changes unless the user explicitly approves an instant upgrade.
    - Any Account recovery feature must not allow the wallet developer to also take over the user account.
  - Why level 3: Only meaningful when considering lack of trust in the wallet development company as part of the threat model. Onerous to implement by any wallet development team, especially early on. Hardware wallet support provides some protection against this threat vector and is less onerous for the wallet to implement.
- **Bug bounty program**: Are incentives such that security flaws will be reported to the wallet developer, rather than exploited?
  - Criteria: Must have a funded bug bounty program.
  - Only applied to wallets older than some number of years with some minimum number of users / TVS.
  - Why level 3: Only meaningful after the wallet becomes a sufficiently-juicy target for hackers (white hat or otherwise); difficult to fund for low-usage wallets.
- **Regular security auditing**: Has the wallet been audited on all security-sensitive aspects that have been updated in the last year?
  - Criteria: Regular security audits on areas that have meaningfully changed.
  - Only applied to wallets older than some number of years with some minimum number of users / TVS.
  - Why level 3: Only meaningful after initial comprehensive audit in level 2; difficult to fund for low-usage wallets.
- **Duress resistance**: Does the wallet let the user avoid wrench attacks? (**non-mobile wallets only**)
  - Criteria: Same as the mobile wallet version in stage 2.
  - Why level 3: Only needed by advanced users in specific situations, which are less likely to occur for non-mobile wallets.

## Integrating this benchmark into Walletbeat

Walletbeat is a wallet rating site that aims to push the wallet ecosystem forward. **Security** is one of its core values, but not the only one (the others are **Privacy**, **Self-Sovereignty**, **Transparency**, and **Ecosystem Alignment**). For this reason, incorporating a security-focused benchmark is a tricky proposition, but not an unworkable one. This section explores how.

Because this benchmark is designed for security specifically and for 1TS to use, it does not include important **privacy** criteria which would also improve security for users: RPC-level privacy, address correlatability, address reuse risks, etc. These criteria would meaningfully improve user security by avoiding the creation of data trails and silos. Depending on the debate about the section below ("Integrating this benchmark into Walletbeat"), how wallets stack up on this benchmark will be shown to users differently on Walletbeat; however, under all options here, in order to avoid the impression that these privacy criteria are irrelevant to security, any **display** of this security ladder must also come with **at least** an explanation about the relevance of privacy criteria for user security. Additionally, under all options below, the Walletbeat wallet rating page will display all criteria across all sections.

### Background: Walletbeat's existing rating & stage system

Walletbeat has the following rating system:

- Walletbeat has fine-grained data about wallet behavior (Do they do address-based whitelisting? Do they do transaction simulation? Do they use a light client?). These are called **features**.
- Walletbeat then has evaluation logic (in code) that takes these features as input and outputs a rating on a set of **attributes**.
  - Attributes can be satisfied by multiple possible features; for example, the **Account Recovery** attribute
  - Attributes can also be used to **aggregate** and synthesize multiple related features. For example, the **Scam prevention** attribute looks for a wallet to implement any of the following: Address whitelisting, checking transactions against known-bad scam contracts, checking app domain names against a known-bad database, interacting with recently-deployed contracts, etc. While each of these things are wallet **features**, the **Scam prevention attribute** takes the set of these features together and outputs a `PASS`, `FAIL`, or `PARTIAL` rating. The logic could be "you must implement all of them", but it could also be "you must implement _k_ of them" or "you must implement these specific two features and also any `k-2` of the rest", or any combination thereof.
  - In addition, attributes can also display details about their evaluation on the wallet rating page. For example, an attribute that rates wallets based on "you must implement at least `k` of these `N` features to get a `PASS` rating" can still show custom HTML code on the wallet rating page explaining this, for example by displaying a table listing out the implemented and non-implemented features within the `N` features being examined.
- Finally, Walletbeat has a cross-sectional **stage system** which requires wallets to clear all criteria of a stage in order to reach it and be able to qualify for the next one. This is similar to L2BEAT's stage system.
  - This stage system allows expressing critical _dependencies_ between attributes, for which it would make little sense for a wallet to implement one without the other. For example:
    - It would make no sense for a wallet to implement secure key handling (by storing key material in secure OS storage) for a wallet that uses a smart contract where the underlying contract is ruggable. _(Yes, the key is secure, but if the key isn't needed to take over the account, does it matter?)_
    - It would make no sense for a wallet development team to implement a bug bounty program or enforce a fixed SBOM if they don't first pass a security audit, as that audit would be very likely to inform how they should structure a bug bounty program and whether their SBOM should be locked down at this point.

### Options to integrate this security-focused benchmark into Walletbeat

#### Option 1: Define a security benchmark that lives orthogonally from the stage system, display both side-by-side

Under this option:

- Wallets would be rated on features and attributes as before
- Wallet rating details would show which specific security features are/are not implemented
- Wallets would be rated on the cross-sectional stage system as before
- Wallets would also be rated on the security benchmark
- Both of these would be shown on the wallet rating page and the comparison table; table headers: **Wallet Name**, **Walletbeat Stage**, **1TS Security Level**.

**Pros**: Straightforward to implement. **Cons**: Two ratings are confusing for users and for wallet development teams.

#### Option 2: Define a security benchmark that lives orthogonally from the stage system; have two wallet comparison pages

Under this option:

- Wallets would be rated on features and attributes as before
- Wallet rating details would show which specific security features are/are not implemented
- Wallets would be rated on the cross-sectional stage system as before
- Wallets would also be rated on the security benchmark
- Only the stage system would be shown on the wallet comparison table; table headers: **Wallet Name**, **Walletbeat Stage**
- A separate "Trillion Dollar Security Dashboard" page would exist on the sidebar (similar to the EIP-7702 adoption tracker comparison page), and have headers **Wallet Name**, **1TS Security Level**, **Privacy notes**.

**Pros**: Straightforward to implement; only one rating shown on the main page which is less confusing for users. **Cons**: Two ratings are still confusing for wallet development teams to follow; need to add a dedicated "Privacy notes" column to ensure that security-relevant privacy criteria are also explained despite not being part of the security benchmark.

#### Option 3: Expand the stage system and integrate security levels as its own criteria

Under this option:

- Wallets would be rated on features and attributes as before
- Wallet rating details would show which specific security features are/are not implemented.
- Wallets would be rated on the security benchmark, which would be shown on the wallet rating page.
- The wallet stages would incorporate "must clear Security Level `k`" as part of their criteria.
- The wallet stage would be shown on the comparison table page; table headers: **Wallet Name**, **Walletbeat Stage**. No need to show "1TS Security Level" since it is already built into the stage rating system.

Because the stage system currently matches L2BEAT's "Stage 0" / "Stage 1" / "Stage 2", in order for the stage system to make sense under this option, we would need to add an extra stage and tweak the stages as follows:

- Stage 0 remains Stage 0 (unchanged).
- Create a new "Stage 0.5" that roughly corresponds to Security Level 1, and maybe some basic things like **Account Portability**.
- Stage 1 would incorporate the criteria of Security Level 2.
- Stage 2 would incorporate the criteria of Security Level 3.

**Pros**: Simple for users and wallet development teams to understand. **Cons**: Stage system gets more stages; future changes to the security benchmark may change the meaning of the stage system as a whole; implicitly raises the importance/priority of the Security value above others.

## Feedback requested

- Any better ideas for how to categorize and order security requirements for this benchmark?
- Are these criteria meaningful for accomplishing 1TS's high-level goal?
- Anything missing from the benchmark, or any further details needed for existing benchmark items?
- How to best integrate this benchmark into Walletbeat?

# Feedback

## Comment 1

_Author: @lotem-starkware · Date: 2025-12-18T07:15:00Z_

> This is a covering write-up, I have some small thoughts:
>
> 1.  "remote key backups encrypted with user's wallet unlock password" - the wallet team which has access to the encrypted data can brute-force it. A different approach would be to keep the encrypted key on the user's cloud (iCloud / Drive)
> 2.  Scam alerting - add address poisoning protection to the list
> 3.  Easy wins - Level 2 / 3 contain some easy to implement features which are best practice in general.  
>     In my opinion the entire section of "Deployment environment hardening" can be pushed to stage 1-2. Development of new features might require change to permissions. However, code a user can't trust should not have extensive permissions, all the more so.

### Reply by @polymutex

_Author: @polymutex · Date: 2025-12-19T00:07:56Z_

> Thanks for the feedback!
>
> > "remote key backups encrypted with user's wallet unlock password" - the wallet team which has access to the encrypted data can brute-force it. A different approach would be to keep the encrypted key on the user's cloud (iCloud / Drive)
>
> Agreed, but that has the same problem (Apple/Google can bruteforce it). I think the best implementation would be to have the key split into multiple shares to avoid this problem; the "single encrypted backup" solution seems more like a stepping stone from where wallets are today (no recovery option) to where we want them to be. Perhaps you're right that the "single encrypted backup" solution should not be considered as satisfying the benchmark at all.
>
> > Scam alerting - add address poisoning protection to the list
>
> Can you elaborate on what this means (is this is different from "warnings when sending to a new address")?
>
> > Easy wins - Level 2 / 3 contain some easy to implement features which are best practice in general. In my opinion the entire section of "Deployment environment hardening" can be pushed to stage 1-2. Development of new features might require change to permissions. However, code a user can't trust should not have extensive permissions, all the more so.
>
> Fair enough! Will move it. \[EDIT: done\]

### Reply by @lotem-starkware

_Author: @lotem-starkware · Date: 2025-12-21T07:33:50Z_

> re - remote key backups  
> You have raised a good point. I think it should not satisfy the benchmark.
>
> re - Scam alerting  
> it is a bit different in the sense basic address poisoning protection can include zero transfer / scam token filtering or marking

## Comment 2

_Author: @pcaversaccio · Date: 2025-12-18T10:21:35Z_

> hmmmm, so I think one _notable_ gap in the proposed benchmark is that **privacy** is not treated as a **first-class part** of security. In the 1TS threat model, this separation doesn't fully hold: loss of privacy often _directly_ increases the risk of loss of funds. Like, address-identity linkage, balance visibility, RPC-level surveillance (we all know this happens!), wallet telemetry etc. can all _materially_ raise the likelihood of phishing, social engineering, extortion, and physical ("wrench") attacks - especially at high capital concentrations (if you don't believe me, happy to provide some real-world examples). For this reason, I think some privacy properties should be considered security-critical. Specifically, certain privacy guarantees (e.g. minimizing address/IP linkage, avoiding default wallet-side surveillance, safe defaults around address reuse, and private transaction submission) could be integrated into the Security Levels as hard requirements, aligned with the same adversary ladder (user mistakes -> external attackers -> hostile wallet developers). IMHO, this would better align the benchmark with 1TS's core goal: enabling Ethereum to safely secure very large amounts of capital, where privacy failures become security failures.
>
> Another security-relevant aspect not mentioned (if I missed it, sorry) is **plausible deniability**, such as BIP-39 passphrases ("25th word"). These allow users to maintain _decoy_ accounts and limit losses under e.g. coercion. In high-value or high-adversary contexts, the lack of plausible deniability can turn forced key disclosure into total account compromise.

### Reply by @polymutex

_Author: @polymutex · Date: 2025-12-19T00:25:33Z_

> > one _notable_ gap in the proposed benchmark is that **privacy** is not treated as a **first-class part** of security
>
> Personally, I agree; I believe privacy is fundamental to security as well. It's for this reason that Walletbeat's own stage system (not the benchmark described in this document) considers **all** Ethereum values simultaneously: security, privacy, self-sovereignty, transparency, ecosystem. In other words, a wallet **cannot** make progress on Walletbeat's stage ladder without also making progress on privacy. First step being to support private token transfers, and the second step considers metadata privacy, including RPC-level surveillance, multi-address correlatability, dapp address isolation, etc.
>
> The challenge is to make the argument that these things are worth including in a 1TS-approved security-focused benchmark :) I've touched a bit on this tension on the "Integrating this benchmark into Walletbeat" section, but here's more on that:
>
> - On one hand, I've made similar arguments that "address privacy" (defined here as "can anyone learn the association between an Ethereum address and any other piece of information about its owner, other than the owner themselves?") is critical for security, especially physical security. A practical "this has already happened" example would be the Ledger customers database leak, which leaked the residential addresses of people who are disproportionately likely to have large crypto holdings in self-custody. And there's [this ever-growing, increasing-frequency list of wrench attacks](https://github.com/jlopp/physical-bitcoin-attacks) which scares me.
> - On the other hand, I think the 1TS folks have a legitimate worry about scope creep. Different parts of the EF are pushing on different fronts simultaneously. Specifically, PSE is already pushing hard on wallets to do better on privacy, and providing tooling to help wallets make progress there. The purpose of this document and benchmark is to provide concrete targets for _1TS specifically_ to focus their efforts on. If other parts of the EF are simultaneously focusing their efforts on wallet privacy, then the net result is the same: the EF is harmoniously pushing the wallet ecosystem on all fronts that matter.
>
> > Another security-relevant aspect not mentioned (if I missed it, sorry) is plausible deniability, such as BIP-39 passphrases ("25th word")
>
> I believe this is already covered above; search for "Duress resistance". Plausible deniability is one component of that; I think others would include spending rate-limits, and self-destruct unlock codes.

### Reply by @pcaversaccio

_Author: @pcaversaccio · Date: 2025-12-19T08:48:05Z_

> well, I do agree scope creep is a valid concern, but IMHO there's an important _signaling issue_ here. A 1TS security benchmark effectively defines _what properties_ are required to safely secure very large amounts of capital. If privacy is treated as entirely orthogonal (I understand it's being implied by certain properties), it sets a precedent that security can be achieved _without_ addressing deanonymization risks (would you agree on this claim?). Technically, this breaks down at scale: address-identity linkage, RPC-level surveillance, and correlatable wallet behavior materially increase (as we all know) the likelihood of physical coercion & targeted attacks (as you have shown yourself with the link to [Known Physical Bitcoin Attacks](https://github.com/jlopp/physical-bitcoin-attacks)). These are _not_ hypothetical failure modes, and they are not addressed by traditional key or code security alone. I'm not suggesting the benchmark absorb the full privacy roadmap to be clear, but that _explicitly_ recognizing some privacy properties as security-critical matters. Otherwise, the benchmark risks encoding a narrow definition of security that holds only in low-adversary, low-capital regimes and fails precisely where 1TS is meant to apply.
>
> > I believe this is already covered above; search for "Duress resistance". Plausible deniability is one component of that; I think others would include spending rate-limits, and self-destruct unlock codes.
>
> fair, I agree plausible deniability fits under duress resistance, but I think it's still worth naming _explicitly_. Without concrete examples, duress resistance may be interpreted mainly as rate-limits or timelocks, while plausible deniability addresses a distinct threat: coerced full wallet disclosure. Calling it out makes the benchmark clearer & more actionable IMHO.

### Reply by @polymutex

_Author: @polymutex · Date: 2025-12-20T00:11:58Z_

> > I do agree scope creep is a valid concern, but IMHO there's an important _signaling issue_ here
>
> Fair enough. I've asked the 1TS lead and he suggested that any page that displays this security benchmark should also explain the value of these privacy attributes you mention, to ensure they are not overlooked and to avoid this signaling issue.
>
> So I've updated the proposal above to reflect this. Specifically:
>
> - Added a mention of the importance of private token transfers in level 1's duress resistance criterion
> - Added a section in the "Integrating this benchmark into Walletbeat" to ensure all the options we consider for integration of this security benchmark such that:
>   - Either these privacy criteria must be explicitly part of the rating on the same level as security (per option 3)
>   - Either any security-benchmark-specific page that we add to Walletbeat (per options 1 and 2) must explain the relevance of these privacy criteria for security.
>
> > I agree plausible deniability fits under duress resistance, but I think it's still worth naming _explicitly_.
>
> Agreed. I've updated the Duress Resistance criterion accordingly.

## Comment 3

_Author: @maykelxyz · Date: 2025-12-20T07:34:34Z_

#### Suggestion on Integrating the 1TS Benchmark to Walletbeat

> I'm leaning more on Option 3, with some additional suggestions:
>
> > #### Option 3: Expand the stage system and integrate security levels as its own criteria
>
> I think Option 3 is better compared to Options 1 and 2 having multiple ratings. The idea that I have is that we implicitly implement 1TS Security Benchmark under the hood, we adjust some of our Stage requirements to match 1TS's benchmark, and mark specific attributes / features as a **1TS Security benchmark**. As for example, I personally agree with [@pcaversaccio](https://github.com/pcaversaccio) and [@polymutex](https://github.com/polymutex) , privacy is fundamental to security. What I think that could work is Walletbeat should mark security features along with privacy features (e.g. minimizing address/IP linkage, avoiding default wallet-side surveillance, safe defaults around address reuse, and private transaction submission) as a **1TS Security Benchmark**. Walletbeat can include the Privacy Feature now to certain Security Levels, still be in Privacy Attribute Group, but still is regarded as **1TS Security Benchmark**.
>
> Additionally, I would suggest adding `Secure Element` to Security Level 2.

### Reply by @polymutex

_Author: @polymutex · Date: 2026-01-07T05:35:02Z_

> Can you expand on what "Secure Element" means as a criterion?

### Reply by @maykelxyz

_Author: @maykelxyz · Date: 2026-01-08T12:48:59Z_

> This mainly applies to hardware wallets, not all hardware wallets use a secure element today, but those that do are far more resistant to key extraction from attacks, making it a significant Level-2 runtime hardening measure. Secure Element means using dedicated secure hardware to generate and store non-exportable private keys and perform signing inside the device.

## Comment 4

_Author: @b50mc · Date: 2026-01-12T04:00:00Z_

> Was recently asked to review some aspects of the 1TS initiative and stumbled upon this discussion. Glad I did — there's a lot of signal here, and the points raised deserve serious consideration.
>
> I want to expand on what [@pcaversaccio](https://github.com/pcaversaccio) raised regarding privacy as a security primitive. He's right, and I think the argument can be taken further.
>
> The benchmark currently focuses on what I'd call "post-compromise" security: audits, secure key storage, bug bounties, release process hardening. All critical. But for high-value targets, the attack doesn't start with an exploit — it starts with reconnaissance.
>
> Consider what I'd frame as the "pre-chain reconnaissance surface" — the metadata exhaust generated before a transaction ever touches the mempool:
>
> 1.  Wallet connects to RPC endpoint over clearnet
> 2.  RPC provider logs correlate IP + timestamp + queried addresses
> 3.  Adversary with log access (breach, insider, legal process) concludes: "IP 203.0.113.x queried balances for 0xA, 0xB, 0xC within 50ms — likely same owner"
> 4.  IP geolocation narrows to city or neighborhood
> 5.  Cross-reference with ENS, social profiles, GitHub signing keys
> 6.  Target acquired — and not a single exploit was needed
>
> This is not theoretical. It's a well-documented pattern in sophisticated attacks against crypto holders.
>
> Now, the chain is transparent by design — and it should remain so. But metadata generated before a transaction hits the mempool is not part of that social contract.
>
> What I'd call "statistical noise injection" could significantly raise the cost of pre-chain reconnaissance without compromising on-chain transparency:
>
> Decoy RPC queries: query N random addresses alongside real ones; RPC provider can't trivially isolate which addresses belong to the user.
>
> Temporal noise injection: background queries at randomized intervals make real user activity indistinguishable from noise.
>
> Request fragmentation: distribute queries across multiple RPC endpoints so no single provider assembles the full picture.
>
> Address compartmentalization with decoys: HD wallets already generate multiple addresses; exposing this as a privacy-by-default feature is low-hanging fruit.
>
> Plausible deniability profiles: multiple wallet personas by default, enabling meaningful duress resistance beyond timelocks and rate-limits.
>
> Tor/proxy integration for RPC calls: Brave wallet already does this; should be baseline, not exceptional.
>
> WebRTC disabled by default: prevents IP leak even when user believes they're behind VPN.
>
> None of these alter what ends up on-chain. They inject uncertainty into the off-chain correlation game.
>
> The benchmark treats privacy as orthogonal to security, but at the capital scales 1TS is meant to address, reconnaissance is phase one of any sophisticated attack. Raising the cost of that phase is not a privacy nice-to-have — it's a security requirement.
>
> Would suggest the working group consider a "Metadata Hygiene" criterion for Level 2 or 3, covering at minimum: RPC privacy (no IP + address correlation to single provider), telemetry defaults (zero or fully anonymized), and fingerprinting resistance (WebRTC, wallet presence detection).
>
> Appreciate the rigor in this discussion.

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-11T06:09:41Z_

> This is an LLM-generated answer and I'm not convinced it is in good faith given the history of the GitHub account behind it, but nonetheless the idea of statistical noise injection has legs. However, I don't think Walletbeat is in a good place to judge the quality of its implementation; this would be more of a property of the mixnet where noise is being injected. Walletbeat's existing Address Privacy looks for Tor integration (Nym would be OK too, just hasn't been added as an option in Walletbeat due to no wallet having integrated it, but that would change as soon as a wallet does). There is a role the wallet does have to play (rather than the mixnet), which is to indicate to the mixnet which requests are about which address, to ensure they use distinct per-address circuits. This is also already implemented in Address Privacy, though it's true it is indeed not listed in the above security benchmark.
>
> Address compartmentalization is already a Walletbeat attribute ("Per-app addresses"), as are Tor integration ("Address Privacy" per above) and plausible deniability ("Duress Resistance"), so I think we are covered here.

## Comment 5

_Author: @hesterbruikman · Date: 2026-02-05T18:30:14Z_

> Very thoughtful discussion! I'll share some thoughts on the Security Ladder to start. I'll follow up with a separate review on the Integration into WalletBeat, just to focus the thread.

### **Security Level 2: "Protect the user"**

> **Basic authentication** >> would propose a minor but IMO important edit for nuance to distinguish app unlock from tx signing
>
> - Criteria: Wallets must require some form of ~unlocking~ authentication and authorization, such as a password, biometrics, etc., along with manual lock and automated inactivity lock features.
>
> **Hardware Wallet support** >> I'd propose to prioritize portability over hardware wallet support for level 1. Purely from a security perspective hardware wallet support adds composability, but doesn't strengthen the wallet itself.
>
> **Scam alerting**
>
> - Warning about ~too-high~ unlimited ERC-20 approvals >> too high is arbitrary
> - Chain verification: This appears in Level 3, I’d add a stage here that precedes light client integration: Warnings when interacting with unknown remote RPCs that can lie about the state of the blockchain Wallets should verify against public registries like chainid.network
>
> ### **Security Level 2: "Secure the wallet"**
>
> Would move hardware wallet support here.
>
> **Security audit** >>Suggest to make it explicit that the audit should reflect current key security model. Doesn't have to be regular (already captured in level 3), but does need to be representative
>
> - Criteria: Must have undergone and published a comprehensive security audit covering all wallet features including the user safety ones. _Audit must reflect currently available key security model_.
>
> **Standard security practices** >> Counterargument to wipe from memory is that it limits backup opportunities. Propose to add a contingency. Best UX would be to gradually increase persistence of reminders, enforcing when accounts hold funds
>
> - Key material wiped from memory as soon as possible _— contingent to user acknowledgement_
>
> **Source availability** >> Propose to specify what is required to be open source at this level. Wallets use backend services for several reasons (performance, reliability, proprietary). Clear boundaries make it more achievable for Wallets to open source what matters for security.
>
> - Criteria: The wallet's source code\*, pertaining to key generation, storage and signing security model\*, must be public.
>
> ### User safety additions
>
> **Approval management** >> under the impression this was an optional I'd, I'd def love to see it included in level 2, particularly as it now includes 7702 authorizations
>
> **Duress resistance <> Impact Mitigation**
>
> - I would separate these concepts and require impact mitigation features for a stage 2. This could be spending rate-limits, high-value spend timelocks, MPC. _They should actually exist at level 1, but I don’t believe there are sufficient implementations at this time to set it as a requirement due to limited 7702 adoption_
> - While important I’m not convinced duress resistance should be required for level 2 for _all_ wallets. I consider it a highly desirable specialized threat feature. Could still be addressed by more specialized wallets. Although there is also an argument for belonging in the sphere of Device OS. Including it in level 2 would also distract wallets from covering risk factors with much higher universal prevalence and vulnerability. Again I do believe duress resistance is important, I see it as something that can and should still be addressed by more specialized wallets.
>
> ### **Security Level 3: "Hardened wallet development"**
>
> **Release process safety:** >> propose a minor add for clarity. What matters is how things make it into production, not onto any branches prior to this.
>
> - Security-sensitive changes _into release_ must undergo two-party review.
> - Releases must contain code that is open-source for at least some amount of time (e.g. 2 weeks) prior to wallets automatically upgrading to it to leave time for bugs to be found; possible security council may override to speed up releases for security fixes, but must do so through a public onchain voting process to make such operations transparent and accountable.
>   - My read on this is that the core requirement is an ‘_auditable hardening process’_ for features that can introduce or increase security risk. Suggesting a timeline can have unintended affects of shipping half-baked work to have be available and without it being a formal release, it will get used.
>   - Suggestion to use instead: Wallets MUST implement release mechanisms that make compromised artifacts detectable pre-release and rapidly reversible.
>
> **Account Unruggability**  
> Gut feeling this should be a level 1, but I might be missing the point on the rationale of having it in level 3

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-11T07:12:51Z_

> Thanks for your thorough review and feedback!
>
> > Basic authentication >> would propose a minor but IMO important edit for nuance to distinguish app unlock from tx signing
>
> Done.
>
> > Hardware Wallet support >> I'd propose to prioritize portability over hardware wallet support for level 1. Purely from a security perspective hardware wallet support adds composability, but doesn't strengthen the wallet itself.
>
> I think it does; it airgaps the user's keys, which means any security bugs in the software wallet are much less consequential. In that sense it's one of the most impactful things a software wallet can do to reduce its security burden along all vectors (user safety/runtime security/operational security), since it effectively delegates a lot of that out of the software wallet and onto the hardware wallet instead, which has a very strong incentive to get those aspects right. It's also the only way the user can actually protect themselves against a malicious wallet development team, at least until the wallet implements the harder stage-3-type requirements (see below).
>
> Now I understand that that's only the theory, and that in practice the hardware wallets out there require users to do a lot of blind signing and effectively still have to trust the software wallet's assessment of a transaction before blind signing it on their hardware wallet device... but at that point that is a hardware wallet problem, not really a problem that the software end of things would be penalized for in a benchmark.
>
> > Scam alerting: Warning about too-high unlimited ERC-20 approvals >> too high is arbitrary
>
> Done.
>
> > Chain verification: This appears in Level 3, I’d add a stage here that precedes light client integration: Warnings when interacting with unknown remote RPCs that can lie about the state of the blockchain Wallets should verify against public registries like chainid.network
>
> This one I'd push back against, as this would create a centralizing force towards such public registries as they would then get closer to becoming arbiters of onchain truth, by proxy of their newly-minted authority to tell wallets what they should tell their users what endpoints to trust. A warning may be appropriate for setting non-default RPC endpoints from the wallet's defaults I suppose, but doesn't seem like something this benchmark should encourage.
>
> > Security audit >>Suggest to make it explicit that the audit should reflect current key security model. Doesn't have to be regular (already captured in level 3), but does need to be representative
>
> Done.
>
> > Standard security practices >> Counterargument to wipe from memory is that it limits backup opportunities. Propose to add a contingency. Best UX would be to gradually increase persistence of reminders, enforcing when accounts hold funds
>
> Might be a semantics issue here; what I meant by "wiped from memory" is "hot cleartext private key material wiped from RAM", not "wiped from any form of readable storage". I agree the user should be able to back up their keys at a later time than onboarding, and the key material shouldn't be "sealed" (e.g. put into an enclave that no longer allows key export) until the wallet has confirmed a backup was made. Clarified.
>
> > Source availability >> Propose to specify what is required to be open source at this level. Wallets use backend services for several reasons (performance, reliability, proprietary). Clear boundaries make it more achievable for Wallets to open source what matters for security.
>
> Done but used different wording.
>
> > Approval management >> under the impression this was an optional I'd, I'd def love to see it included in level 2, particularly as it now includes 7702 authorizations
>
> It is there but was labeled under the unclear "Proactive monitoring" title. Renamed to "Outstanding approvals management" which is probably clearer and reworded criteria.
>
> > Duress resistance <> Impact Mitigation: I would separate these concepts and require impact mitigation features for a stage 2. This could be spending rate-limits, high-value spend timelocks, MPC. They should actually exist at level 1, but I don’t believe there are sufficient implementations at this time to set it as a requirement due to limited 7702 adoption
>
> Agree, good observations. I have split these attributes, and concur with your assessment that practically speaking they unfortunately can't be stage 1.
>
> > While important I’m not convinced duress resistance should be required for level 2 for all wallets. I consider it a highly desirable specialized threat feature.
>
> Moved to stage 3 for non-mobile wallets only. I think this is table stakes for mobile wallets, where it seems to me like it's not that specialized of a threat to protect against.
>
> > Security-sensitive changes into release must undergo two-party review.
>
> Done.
>
> > Releases must contain code that is open-source for at least some amount of time \[...\]  
> > My read on this is that the core requirement is an ‘auditable hardening process’ for features that can introduce or increase security risk. Suggesting a timeline can have unintended affects of shipping half-baked work to have be available and without it being a formal release, it will get used.  
> > Suggestion to use instead: Wallets MUST implement release mechanisms that make compromised artifacts detectable pre-release and rapidly reversible.
>
> You're right, the criterion here was too prescriptive on implementation. Reworded to use your wording as the intent of the benchmark, while keeping the previous wording as a possible way to satisfy that intent.
>
> > Account Unruggability  
> > Gut feeling this should be a level 1, but I might be missing the point on the rationale of having it in level 3
>
> I get your gut feeling; the reason I put in stage 3 is because it seems unrealizable to me without satisfying the "transparent and safe release process" attribute as well. Without it, a compromised wallet dev can always sneak in some code in the wallet's startup code which instantiates and auto-approves a new 7702 delegation transaction to a backdoored contract code under the wallet dev's control, and then ship this code in a wallet's auto-update stream. The only defense the user has against this type of attack is to use a hardware wallet (hence hardware wallet support being an earlier stage).

## Comment 6

_Author: @hesterbruikman · Date: 2026-02-09T17:49:35Z_

> Following up on the benchmark integration. First off, one thing to state explicitly: The security staging framework is not and should not be defined solely by 1TS. It should be reviewed and supported by a cross-section of experts. 1TS is here to facilitate alignment and help collect perspectives.
>
> For this reason I'm supportive of option 3. There should not be a separate score, Security attributes should be rolled into what exists today. Ideally there should be no delta, between WalletBeat and 1TS aligned attributes at each stage. If there is, as [@maykelxyz](https://github.com/maykelxyz) proposes, these specific attributes should be marked.
>
> There also seems to be consensus that some privacy properties (as [@pcaversaccio](https://github.com/pcaversaccio) described) should be considered security-critical. I fully agree. To what stage they belong is a separate question. EF is indeed driving on various fronts, including privacy, but that's operational and should not affect what can be considered a safe and secure wallet.

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-11T07:14:53Z_

> Thank you; agree with the principle that we should ideally align all this rather than fragmenting benchmarks.
>
> So far I haven't heard any objection to option 3, and I've only heard support for option 3, so option 3 it is.

## Comment 7

_Author: @naugtur · Date: 2026-02-12T20:59:48Z_

> Note that runtime supply chain security is possible: [https://lavamoat.github.io](https://lavamoat.github.io)

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-15T01:43:42Z_

> This is interesting, but I am struggling to define criteria around this that would make sense to enforce across all wallets and that would meaningfully move the needle here. I'm thinking of things like:
>
> - "The common repository clone + development process doesn't rely on any hook scripts, so that a new contributor can clone and contribute to the project safely" → but seems trivial for the development team to later modify that, since the repo is essentially its own authority (in other words, there's nothing preventing this property from being rugged down the line).
> - "The build process must run in a sandbox" → but a user can do this for themselves already (run the whole build process in a VM), and the same lack of enforceability argument also applies, not to mention that the user would still need to trust the produced binary in a non-sandboxed context at the end of the build process anyway, which means a compromised build process can just inject the payload into the binary it produces to defeat the sandboxedness of the build process.
> - "Runtime code in dependencies must run in a sandboxed environment to ensure they can only access interfaces of the wallet's code that they need to and no others" → That one makes more sense, but very difficult for Walletbeat to assert whether this is the case or not, as that means literally going into each wallet's code and essentially doing the work of a security auditor. We already have "security audits" as a separate criterion, and they have better expertise and authority (and time and compensation) to make such calls than Walletbeat does.

## Comment 8

_Author: @ilyavna · Date: 2026-02-14T03:27:56Z_

> Hi all, I’m part of the security team at Exodus. Wanted to share a few thoughts on the Level 1 criteria.
>
> Is the list meant to be exhaustive, or more of a general direction? If it’s exhaustive, I think a few commonly exploited UI/UX areas are missing:
>
> **Blocking screen capture on sensitive screens (especially recovery phrase display).**
>
> - This discourages the unsafe practice of saving recovery phrases digitally (by taking screenshots) and helps prevent attacks where perpetrators pressure users to display these screens over live calls (via screen sharing).
>
> **Warning and educational language in recovery phrase flows (both viewing and importing).**  
> Both flows are high-risk and commonly abused.
>
> - When displaying the recovery phrase, there should be explicit warning and educational messaging that clearly states it must never be shared or entered into any website or app. This helps prevent users from disclosing it to malicious parties or entering it into random sites or apps.
> - When importing a recovery phrase, there should be clear messaging that recovery phrases are never provided by third parties and must never be used if given to the user by someone else. This helps mitigate poisoned-seed scams.
>
> **Detection of wallets with blacklisted funds or altered permissions (e.g., Tron multisig).**
>
> - Related to poisoned-seed scenarios, this helps prevent recovery and investment scams where attackers give victims wallets with “locked” funds and ask for payment to unlock them.
>
> **Address poisoning protection.**  
> This is when attackers send dust from an address that visually resembles a recently used address (same prefix/suffix), hoping the victim later copies it from transaction history and sends funds to the attacker.
>
> - I saw this was already mentioned under scam alerting. I’d reinforce that this is one of the most common loss vectors today and one of the few that can be fully mitigated on the product side (e.g., by detecting and hiding dust transactions from lookalike addresses in the UI).
>
> Happy to discuss further or share more context if helpful.

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-15T01:54:53Z_

> > Is the list meant to be exhaustive, or more of a general direction?
>
> The set of high-level attributes it looks for ("chain verification", "scam alerting", "security audits") is meant to be exhaustive, but the specific criteria within that may not be exhaustive. For example, if a wallet comes up with a new heuristic that helps spots scams that isn't listed in the "scam alerting" criteria of this ladder, we wouldn't want to preclude that from being added.
>
> > Blocking screen capture on sensitive screens (especially recovery phrase display)
>
> Thanks, added.
>
> > Warning and educational language in recovery phrase flows
>
> Added.
>
> > Detection of wallets with blacklisted funds or altered permissions
>
> Can you say more on this one? How does the scam work, and how would wallets help prevent it?
>
> > Address poisoning protection  
> > I saw this was already mentioned under scam alerting. I’d reinforce that this is one of the most common loss vectors today and one of the few that can be fully mitigated on the product side (e.g., by detecting and hiding dust transactions from lookalike addresses in the UI).
>
> Sure. That said, I think there are other ways to mitigate this, such as identicons with a generated-at-wallet-install-time random salt to make addresses unique in a way attackers can't predict, or with transactions that have lookalike addresses highlighted in red rather than hidden. So wouldn't want to be too prescriptive here.

### Reply by @ilyavna

_Author: @ilyavna · Date: 2026-02-15T05:48:51Z_

> Thanks. Appreciate the openness to discussing this and incorporating feedback.
>
> > Can you say more on this one? How does the scam work, and how would wallets help prevent it?
>
> Attackers use wallets that hold real funds, but where the funds are not movable by the user. This usually happens in one of two ways:
>
> - The funds are frozen by the issuer (e.g., an address holding USDT is blacklisted by Tether),
> - The wallet’s spending permissions are altered (e.g., converted into a multisig, or control is assigned to a different address, as happens on Tron).
>
> The recovery phrases for these wallets are then shared with victims and are used in investment and recovery scams.
>
> - In investment scams, victims are told the recovery phrase contains proceeds from an investment (pig-butchering platforms).
> - In recovery scams, victims are told these are funds recovered from a previous scam.
>
> In both cases, the victim restores the wallet, sees the funds in the wallet, and is then told they need to pay a fee to "unlock" them. Seeing the funds in the wallet is enough to make the scam convincing, because it creates the impression that the money is already under the user’s control.
>
> This is a very common attack vector, and wallets can help prevent this by detecting and flagging these conditions in the UI.
>
> > Sure. That said, I think there are other ways to mitigate this, such as identicons with a generated-at-wallet-install-time random salt to make addresses unique in a way attackers can't predict, or with transactions that have lookalike addresses highlighted in red rather than hidden. So wouldn't want to be too prescriptive here.
>
> I understand the goal of not being too prescriptive, but approaches like identicons mostly just replace the cue users rely on today (the address string) with an alternative UI element they would need to learn and understand.
>
> More importantly, there’s _no_ legitimate reason to show these transactions in the wallet UI at all, so hiding them is more effective than annotating them, as it removes the failure mode entirely.

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-16T00:06:30Z_

> Thanks, I understand the locked-funds scam better now. Do you have suggestions on how to write a criterion around it in a way that doesn't kingmake Circle or Tether as arbiter of which wallet addresses are safe to import into wallets, and doesn't leak wallet addresses to an external service that the wallet user can't control?
>
> I'm thinking something like requiring wallets to come with a built-in set of known-bad addresses (similar to known-bad-contract databases) and check against that when importing new addresses. Maybe that should be a new category of entries in `eth-phishing-detect` and such databases.  
> An alternative may be to have wallets internally simulate burning the token balances of newly-imported wallet addresses against the user's configured RPC endpoint, and verifying that the transaction would succeed. But that would create false positives for soulbound tokens, and open a new abuse vector whereby an attacker can send legitimate user addresses a valueless soulbound token to make users panic that their wallet now says their funds are locked, and leverage that panic to conduct a similar scam.
>
> > More importantly, there’s _no_ legitimate reason to show these transactions in the wallet UI at all, so hiding them is more effective than annotating them, as it removes the failure mode entirely.
>
> I disagree; personally if my wallet did this, I would be quite confused (and a version of me might panic, which attackers may leverage against me) as to why different tools (Etherscan/Blockscout vs my wallet) would show me different sets of transactions, and as to why my wallet's balance would show a tiny but non-zero amount of USDT while the transaction list looked like I never received USDT in any transaction. But I can see how others would see that differently.
>
> Regardless, I think our common point of agreement here is that wallets should be able to _identify_ illegitimate lookalike-address transactions, and distinguish them UI-wise in some capacity so that users understand what is happening. Once a wallets have done the effort to implement the heuristic needed to identify such transactions, I'd be comfortable delegating the decision of how to turn that heuristic into whatever is in their users' best interest UI-wise, so long as it's not "treat these transactions identically to legitimate ones". Therefore, it seems to me like the benchmark only requiring _some type of_ differential UI treatment for such transactions to strike the right balance between prescription and ensuring wallets do help users with this type of scam.

### Reply by @ilyavna

_Author: @ilyavna · Date: 2026-02-16T02:02:21Z_

> > Thanks, I understand the locked-funds scam better now. Do you have suggestions on how to write a criterion around it in a way that doesn't kingmake Circle or Tether as arbiter of which wallet addresses are safe to import into wallets, and doesn't leak wallet addresses to an external service that the wallet user can't control?  
> > I'm thinking something like requiring wallets to come with a built-in set of known-bad addresses (similar to known-bad-contract databases) and check against that when importing new addresses. Maybe that should be a new category of entries in eth-phishing-detect and such databases.  
> > An alternative may be to have wallets internally simulate burning the token balances of newly-imported wallet addresses against the user's configured RPC endpoint, and verifying that the transaction would succeed. But that would create false positives for soulbound tokens, and open a new abuse vector whereby an attacker can send legitimate user addresses a valueless soulbound token to make users panic that their wallet now says their funds are locked, and leverage that panic to conduct a similar scam.
>
> I don’t think this needs reputation lists or any centralized "arbiter".
>
> The high-level approach can stay simple and state-based: during restore, check whether the derived address is subject to hard on-chain constraints that make the funds non-spendable by the importer. This can be done via standard RPC calls.
>
> Concretely, for the cases where this scam most often occurs:
>
> - EVM (USDT / USDC): read the token contract state via eth_call (e.g. isBlacklisted(address) / isFrozen(address), depending on the token).
> - Tron: read the account’s permission state via Tron RPC / API (owner / active permissions, multisig), plus token-specific checks.
>
> If either condition is met, the wallet can warn the user (e.g., via a modal).
>
> This also seems more streamlined than simulation. Simulation would need to be done per asset (which is more resource-intensive on its own), and as soon as one simulated transfer fails you run into a decision problem: is it failing because the asset is inherently non-transferable (e.g. soulbound), or because it’s externally restricted? Let me know if I’m misunderstanding the idea.

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-20T07:01:00Z_

> I understand it can be done by `eth_call` and that the lookup can be done with any regular RPC provider. Here are the assumptions I also assume to be true:
>
> - These blacklist would be verified at wallet address import time (not at token transfer time)
> - → This means the wallet has to choose a subset of tokens to verify the transferability of because wallets can contain hundreds of tokens in practice and we can't afford to keep the user waiting that long at import time to verify the transferability of all of them
> - → In practice, the two chosen tokens would be USDT and USDC
> - Tether and Circle unilaterally control their respective onchain blacklists
>
> ... If all of the above is true, then I worry this essentially gives Tether and Circle a "hook" into _every_ wallet following this security benchmark, which makes certain addresses harder to import than others across the entire Ethereum ecosystem. That seems like disproportionate power for these two entities to have.  
> But maybe that's OK and worth the harm-reduction from helping users against scams, if the only consequence of this blacklist check is a _warning_ that the user is able to dismiss. Is that what you have in mind by a "modal"?

## Comment 9

_Author: @darrylyeo · Date: 2026-02-15T17:45:54Z_

> As part of Level 2's "standard security practices" I think it would be worth including support for keystores as a method of seed phrase export / import / encryption at rest.
>
> Relevant tweet:
>
> [https://x.com/zxstim/status/2021799090473120195](https://x.com/zxstim/status/2021799090473120195)

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-20T06:40:40Z_

> Added.

## Comment 10

_Author: @darrylyeo · Date: 2026-02-19T20:01:25Z_

> A new meta I'm hearing about that we may want to track: support for "post-quantum" cryptography schemes to guard against "harvest now, decrypt later" attacks.

### Reply by @polymutex

_Author: @polymutex · Date: 2026-02-20T06:25:16Z_

> What wallet features would this correspond to, that we would expect wallets to be able to implement in the present?
