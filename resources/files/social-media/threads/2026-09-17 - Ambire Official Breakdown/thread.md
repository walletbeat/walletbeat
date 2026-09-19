How does Ambire stack up against Walletbeat’s attributes?

What’s good, what could be better, and where are the gaps?

A Walletbeat thread 🧵

---

In this thread, we'll be analyzing @Ambire and see how they adopt CROPS values.

We'll be evaluating Ambire wallet across five dimensions: security, privacy, transparency, self sovereignty & ecosystem interoperability.

---
1/5 Security

What’s good about Ambire’s security?

- Hardware Wallet support.

Software wallets supporting hardware wallets means they offer the best of both worlds: a user-friendly interface with enhanced security. Ambire directly supports Ledger, Trezor, Gridplus, Keystone, and Keycard.

---

What could be better about Ambire’s security?

- Security Audits & Bug bounties
- Scam prevention
- Transaction legibility

Let's break it down

---
Security audits & bug bounties

Ambire has an active bug bounty program and has undergone security audits.

However, their latest audit was published on February 20, 2025, over a year ago.

Walletbeat recommends regular security audits as part of maintaining confidence in the security of a wallet as its codebase evolves.

There’s also room to improve the bug bounty process. Ambire currently doesn’t document a clear upgrade path for users when a critical security issue is discovered.

---

Scam prevention

Ambire warns users when interacting with unknown addresses and known scams.

However:

⚠️ Scam checks can expose the user’s and recipient’s IP addresses to an external provider, creating potential correlation risks.

⚠️ Unlimited approval warnings don’t cover all spenders.

More comprehensive protection and privacy-preserving scam checks could improve this further.


---

Transaction legibility

Ambire supports basic calldata display and EIP-712 signing, but there are still gaps:

⚠️ Some complex transactions don’t clearly explain their outcomes
⚠️ Nondeterministic outcomes aren’t detected
✗ Nonce isn’t displayed
✗ EIP-712/domain/message hashes aren’t shown
✗ No ERC-8213 digest display

There’s room to make transactions more transparent and verifiable.

---

What are the gaps in Ambire’s security?

• Chain verification
• Security best practices
• Account recovery

Let’s break them down 🧵


---

Chain verification

Ambire does not independently verify the integrity of Ethereum L1 when retrieving chain state or simulating transactions.

This means users rely on external providers for blockchain state, introducing a trust assumption that could potentially result in users signing transactions with unintended effects.


---

**Security best practices**

Ambire uses standardized key-storage mechanisms and OS CSPRNG.

However, its browser extension hardening could be improved.

Ambire currently allows any installed extension to connect through `externally_connectable = ["*"]`.

This means a malicious extension could potentially send wallet requests directly to Ambire.

---

Account recovery

Ambire does not currently support guardian-based recovery.

It also does not provide recovery checks such as periodic private-key or seed-phrase verification.

These mechanisms can help users verify that their recovery credentials are still accessible before they actually need them.

---
2/5 Self-sovereignty

What’s good about Ambire’s self-sovereignty?

Ambire gives users strong control over their accounts.

- L1 Provider Independence
- Account portability
- Account unruggability

These reduce dependence on Ambire and help prevent account lock-in.

---


What could be better about Ambire’s self-sovereignty?

- Transaction inclusion
- Permissions management

Let's break it down

---

Transaction inclusion

Ambire requires users to trust intermediaries when withdrawing funds from L2s.

Walletbeat recommends supporting force-withdrawal transactions that can be created and broadcast directly on Ethereum L1.

This would reduce reliance on intermediaries when exiting an L2.

---

Permissions management

Ambire currently doesn’t provide token approval management.

Users cannot inspect or revoke their existing ERC-20, ERC-721 or ERC-1155 approvals from the wallet.

Adding approval management would give users more control over permissions they’ve granted.


---
3/5 Transparency

What’s good about Ambire’s transparency?

Ambire is:

- Open source under GPL-3.0
- Transparent about its funding
- Transparent about transaction fees

It also publicly discloses how transaction data is handled before inclusion onchain.

---

What could be better about Ambire’s transparency?

- Release process
- Orderflow transparency

Let's break it down

----

Release process

Ambire has a public changelog and uses dependency locking.

However, it doesn't currently use:

- Artifact signing
- Reproducible or hermetic builds

Adding these would make it easier for users and independent parties to verify that released software corresponds to the published source.

---

Orderflow transparency

Ambire doesn’t auction orderflow by default, but pre-inclusion transaction data is sent to Ambire, Pimlico and Biconomy through endpoints that aren’t documented and independently verifiable as non-extractive.

Documenting and independently verifying these endpoints—or keeping this data local by default—would improve transparency.

----

4/5 Ecosystem alignment

What’s good about Ambire’s ecosystem interoperability?

- Account Abstraction via ERC-4337 & EIP-7702
- Browser integration standards
- Atomic transaction batching
- Hardware wallet interoperability

Ambire is well aligned with several emerging Ethereum wallet standards.

---

What could be better about Ambire’s Ecosystem alignment?

- Chain abstraction
- Address resolution

Let's break it down

---

Chain abstraction

Ambire shows total portfolio value across chains, but doesn’t aggregate balances for individual tokens.

For example, users can’t see their total USDC balance across multiple chains in one place.

Aggregating token balances across chains would make multi-chain management simpler.

---

Address resolution

Ambire supports human-readable ENS addresses such as `username.eth`.

However, it doesn’t support chain-specific address formats such as:

`user@l2chain.eth`
`user.eth:l2chain`

Adding support for chain-specific addresses could make cross-chain payments easier and reduce ambiguity about where funds are being sent.

---
4/5 Privacy

Privacy is the attribute group that out of five, Ambire lacks the most. Most of the attributes that Ambire has resolves to Partial or failure rating.

Let's see where Ambire can do the most improvement on

---
What could be better about Ambire’s privacy?

Privacy is the attribute group where Ambire has the most room for improvement.

Two areas are currently partial, while several others have significant gaps.

---

What could be better?

- Wallet address privacy
- Privacy hygiene

Let's break it down
---

Wallet address privacy

Ambire relies on external providers for RPC, token discovery, and account information.

Some requests can expose the user’s wallet address and IP address to these providers, creating potential correlation between a user and their onchain activity.

---

Privacy hygiene

Ambire doesn’t consistently minimize the information shared with external providers.

Privacy-preserving proxies could reduce these risks.

---

Where are the gaps in Ambire’s privacy?

- Multi-address privacy
- Private token transfers
- App isolation

Let's break it down

---

Multi-address privacy

Multiple wallet addresses can be exposed to the same provider, allowing them to be correlated.

---


Private token transfers

Ambire doesn’t support private token transfers.

---

App isolation


Ambire doesn’t provide app-specific accounts during the connection flow, making cross-app activity correlation possible.