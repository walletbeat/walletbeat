How does Ambire stack up against Walletbeat’s attributes?

What’s good, what could be better, and where are the gaps?

A Walletbeat thread 🧵

---

In this thread, we'll be analyzing @Ambire and see how they adopt CROPS values.

We'll be evaluating Ambire wallet across five dimensions: security, privacy, transparency, self sovereignty & ecosystem interoperability.

---

What’s good about Ambire’s security?

Hardware Wallet support.

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