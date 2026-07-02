---
title: 1TS Wallet Security Benchmark
description: 'Security benchmark for wallets developed as part of the Ethereum Foundation 1TS initiative.'
---

# 1TS Wallet Security Benchmark

As part of the Ethereum Foundation's 1TS initiative, Walletbeat was tasked to come up with a security benchmark for wallets.
This was the topic of a [long discussion](./wallet-security-benchmark-discussion.md) which has culminated in the following benchmark, which will be integrated in Walletbeat.

In addition, it was decided that these criteria would be folded into Walletbeat's own methodology, rather than creating a separate ladder.

For details on what each criterion looks for and for rationale, please see [the discussion document](./wallet-security-benchmark-discussion.md). This document only lists the high-level bullet points of the benchmark, and where they fit into Walletbeat's own methodology.

### Stage 0

- **Basic authentication**: Does the wallet ensure that only the intended user is using it?
  - Folded into Walletbeat attribute: **Duress resistance**.
  - Tracking: https://github.com/walletbeat/walletbeat/issues/389
- **Account recovery**: Can users recover their account if disaster strikes?
  - Already implemented in Walletbeat under the same attribute name.
  - Stage 0 does not require the "Account recovery drills" feature.
- **Hardware wallet support**: Can users airgap their keys?
  - Already implemented in Walletbeat under the same attribute name.
  - Stage 0 only requires support for a single type of hardware wallet.
- **Scam alerting**: Does the wallet help the user avoid common scams?
  - Folded into Walletbeat attribute: **Scam prevention**
  - Mostly already implemented, but not all. Tracking for the remainder: https://github.com/walletbeat/walletbeat/issues/590
  - Stage 0 only requires a subset of security measures.
- **Transaction legibility**: Can users understand what they are signing?
  - Already implemented in Walletbeat under the same attribute name.
  - Stage 0 only requires a subset of transaction legibility.

### Stage 0.5

- **Security audit**: Has the wallet ever undergone comprehensive security auditing?
  - Already implemented in Walletbeat under the same attribute name.
  - Stage 0.5 does not require _regular_ security audits, just requires having done at least one.
- **Standard security practices**: Does the wallet follow standard security practices? (OSS cryptographic libraries, secure RNG, secure key storage)
  - New Walletbeat attribute to be implemented.
  - Tracking: https://github.com/walletbeat/walletbeat/issues/218
- **Source availability**: Is the wallet's source code available to the public?
  - Already implemented in Walletbeat under the same attribute name.
- **Outstanding approvals management**: Does the wallet help the user determine and manage their outstanding token approvals, i.e. any outstanding permission that smart contracts and apps have to spend their balances without the user's active approval?
  - New Walletbeat attribute to be implemented, renaming to "Permissions management" to generalize it to permissions beyond ERC-20 token approvals (though it will start with just that).
  - Tracking: https://github.com/walletbeat/walletbeat/issues/579
- **Account recovery drills**: Does the wallet ensure that the user will be able to successfully recover their account?
  - Folding this into **Account recovery** attribute.
  - Tracking: https://github.com/walletbeat/walletbeat/issues/591
- **Duress resistance**: Does the wallet let the user avoid wrench attacks? (**Mobile wallets only**)
  - New attribute to be implemented in Walletbeat.
  - Tracking: https://github.com/walletbeat/walletbeat/issues/389
- **Impact mitigation**: Does the wallet let the user protect themselves from accidentally-large unauthorized transactions?
  - Folding this into the "Duress resistance" attributes (see previous item).
- **Deployment environment hardening**: Is the wallet suppressing its own permissions as much as possible in the context in which it runs?
  - Folding this into the "Security best practices" attribute.
  - Tracking: https://github.com/walletbeat/walletbeat/issues/218

### Stage 1

- **Account Unruggability**: Can the wallet development team take over user accounts?
  - Already implemented in Walletbeat under the same attribute name.
- **Bug bounty program**: Are incentives such that security flaws will be reported to the wallet developer, rather than exploited?
  - Already implemented in Walletbeat under the same attribute name.
- **Regular security auditing**: Has the wallet been audited on all security-sensitive aspects that have been updated in the last year?
  - Already implemented in Walletbeat under the same attribute name.
  - Stage 1 requires an audit in the last year.
- **Duress resistance**: Does the wallet let the user avoid wrench attacks? (**non-mobile wallets only**)
  - New attribute to be implemented in Walletbeat.
  - Tracking: https://github.com/walletbeat/walletbeat/issues/389

### Stage 2

- **Chain Verification**: Does the wallet trust the RPC provider for chain data? (It should not.)
  - Already implemented in Walletbeat under the same attribute name.
- **Release process safety**: How hard is it for a rogue wallet developer to introduce a backdoor into the wallet?
  - New attribute to be implemented in Walletbeat, renamed to "Release process transparency".
  - Tracking: https://github.com/walletbeat/walletbeat/issues/580
