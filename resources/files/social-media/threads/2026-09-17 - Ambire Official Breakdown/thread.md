How does Ambire stack up against Walletbeat's attributes?

What's good, what could be better, and where are the gaps?

A Walletbeat thread 🧵

---

In this thread, we'll be analyzing @ambire and seeing how it lives up to CROPS values.

We'll be evaluating Ambire across five dimensions: security, self-sovereignty, transparency, ecosystem alignment and privacy.

---

🔒 1/5 Security

What's good about Ambire's security?

🗝️ Hardware wallet support

Software wallets supporting hardware wallets means they offer the best of both worlds: a user-friendly interface with enhanced security. Ambire directly supports Ledger, Trezor, GridPlus, Keystone, and Keycard.

---

What could be better about Ambire's security?

📜 Security audits & bug bounties
🚨 Scam prevention
🔏 Transaction legibility

Let's break it down 👇

---

📜 Security audits & bug bounties

Ambire has undergone security audits and has an established bug bounty program.

Their latest audit was published on February 20, 2025, over a year ago.

Since then, Ambire has shipped clear signing (ERC-7730), Safe account support, and unlimited approval warnings. A new audit covering these would help.

---

🚨 Scam prevention

Ambire warns users when interacting with unknown addresses and known scams.

However:

⚠️ Scam checks can expose the user's and recipient's IP addresses to an external provider, creating potential correlation risks.

⚠️ Unlimited approval warnings don't cover all spenders.

More comprehensive protection and privacy-preserving scam checks could improve this further.

---

🔏 Transaction legibility

Ambire is one of the first wallets to ship clear signing (ERC-7730). It decodes approvals, Aave supplies, batched calls, and even calls nested inside Safe transactions.

What's missing is the verification side (ERC-8213):

✗ No calldata digest
✗ No EIP-712 digest, domain hash or message hash

Digests let users verify what they're signing against an independent source, like a hardware wallet screen.

---

What are the gaps in Ambire's security?

⚓ Chain verification
🔐 Security best practices
🛟 Account recovery

Let's take a closer look 👇

---

⚓ Chain verification

Ambire does not independently verify the integrity of Ethereum L1 when retrieving chain state or simulating transactions.

This means users rely on external providers for blockchain state, introducing a trust assumption that could potentially result in users signing transactions with unintended effects.

---

🔐 Security best practices

Ambire uses standardized key-storage mechanisms and OS CSPRNG.

However, its browser extension hardening could be improved.

Ambire currently allows any installed extension to connect through `externally_connectable = ["*"]`.

This means a malicious extension could potentially send wallet requests directly to Ambire.

---

🛟 Account recovery

Ambire does not currently support guardian-based recovery.

It also does not provide recovery checks such as periodic private-key or seed-phrase verification.

These mechanisms can help users verify that their recovery credentials are still accessible before they actually need them.

---

🏰 2/5 Self-sovereignty

What's good about Ambire's self-sovereignty?

Ambire gives users strong control over their accounts.

🏠 L1 provider independence
🧳 Account portability
🪚 Account unruggability

These reduce dependence on Ambire and help prevent account lock-in.

---

What could be better about Ambire's self-sovereignty?

📡 Transaction inclusion
🔑 Permissions management

Here's the breakdown 👇

---

📡 Transaction inclusion

Ambire requires users to trust intermediaries when withdrawing funds from L2s.

Walletbeat recommends supporting force-withdrawal transactions that can be created and broadcast directly on Ethereum L1.

This would reduce reliance on intermediaries when exiting an L2.

---

🔑 Permissions management

Ambire's built-in swaps only request the exact amount needed, and batching lets dapps bundle a tight approval with the action that uses it.

But older approvals, or ones granted to other dapps, stay live until revoked. Ambire users can't inspect or revoke existing ERC-20, ERC-721 or ERC-1155 approvals from the wallet.

---

🕵️ 3/5 Transparency

What's good about Ambire's transparency?

Ambire is:

❤️ Open source under GPL-3.0
💰 Transparent about its funding
💸 Transparent about transaction fees

It also publicly discloses how transaction data is handled before inclusion onchain.

---

What could be better about Ambire's transparency?

📦 Release process
🌊 Orderflow transparency

Let's dig in 👇

---

📦 Release process

Ambire has a public changelog and uses dependency locking.

However, it doesn't currently use:

- Artifact signing
- Reproducible or hermetic builds

Adding these would make it easier for users and independent parties to verify that released software corresponds to the published source.

---

🌊 Orderflow transparency

Ambire doesn't auction orderflow by default, but pre-inclusion transaction data is sent to Ambire's infrastructure, Pimlico and Biconomy through endpoints that aren't documented or independently verifiable as non-extractive.

Documenting these endpoints and having them independently verified, or keeping this data local by default, would improve transparency.

---

🌳 4/5 Ecosystem alignment

What's good about Ambire's ecosystem alignment?

💼 Account abstraction via ERC-4337 & EIP-7702
🌐 Browser integration standards
🧺 Atomic transaction batching
🧩 Hardware wallet interoperability

Ambire is well aligned with several emerging Ethereum wallet standards.

---

What could be better about Ambire's ecosystem alignment?

🌉 Chain abstraction
📇 Address resolution

Here's what we found 👇

---

🌉 Chain abstraction

Ambire shows total portfolio value across chains, but doesn't aggregate balances for individual tokens.

For example, users can't see their total USDC balance across multiple chains in one place.

Aggregating token balances across chains would make multi-chain management simpler.

---

📇 Address resolution

Ambire supports human-readable ENS addresses such as `username.eth`.

However, it doesn't support chain-specific address formats such as:

`user@l2chain.eth`
`user.eth:l2chain`

Adding support for chain-specific addresses could make cross-chain payments easier and reduce ambiguity about where funds are being sent.

---

😎 5/5 Privacy

Privacy is where Ambire has the most room for improvement.

Most of its privacy attributes are rated Partial or Fail.

Two areas are partially there:

🔗 Wallet address privacy
🧼 Privacy hygiene

---

🔗 Wallet address privacy

Ambire relies on external providers for RPC, token discovery, and account information.

Some requests can expose the user's wallet address and IP address to these providers, creating potential correlation between a user and their onchain activity.

---

🧼 Privacy hygiene

Ambire doesn't consistently minimize the information shared with external providers.

Privacy-preserving proxies could reduce these risks.

---

And three areas where the gaps are bigger:

- 🖇️ Multi-address privacy
- 📨 Private token transfers
- 🏝️ App isolation

One by one 👇

---

🖇️ Multi-address privacy

Multiple wallet addresses can be exposed to the same provider, allowing them to be correlated.

---

📨 Private token transfers

Ambire doesn't support private token transfers. To pass, private transfers need to be the default, not just an option.

---

🏝️ App isolation

Ambire doesn't provide app-specific accounts during the connection flow, making cross-app activity correlation possible.

---

So, where does Ambire stand?

Across Walletbeat's five dimensions, Ambire has a mix of strengths and areas for improvement.

Privacy is clearly the attribute group with the most gaps, with most criteria rated Partial or Fail.

But there's another side to the picture.

---

Self-sovereignty is where Ambire stands out.

Ambire gives users strong control over their accounts, particularly through L1 provider independence.

Users can choose and use their own RPC provider before any requests are made.

This is an important step toward reducing trust in the wallet provider itself.

---

Overall

Ambire has strong foundations in self-sovereignty and ecosystem alignment, and keeps shipping, with several areas where security and transparency can still improve.

Privacy is the biggest area for improvement.

Let's keep pushing CROPS in wallets 🌸

---

See Ambire's full breakdown on Walletbeat:

https://beta.walletbeat.eth.limo/ambire
