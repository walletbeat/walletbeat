# Dappcon Walletbeat workshop: Setting the Bar on Ethereum Wallets

- Date: June 17th, 2026
- Time: 16:45 CEST
- Stage: Workshop Room
- Duration: 30 minutes
- Abstract: A hands-on workshop that breaks down what actually makes an Ethereum wallet “good”, and how standards shape interoperability across the ecosystem. Participants will use the Walletbeat testing playground to evaluate real wallets across key categories including transaction simulations, signatures, scam alerts, and EIP support: highlighting how these features directly impact user experience.We will also do a deep dive into recent EIPs like EIP-7730 (structured data signing) and EIP-8213 (calldata digest), and how they aim to improve wallet user experience, safety, and standardization.

## Outline

### Introduction

- Introduction to Ethereum wallets
  - Audience engagement:
    - "Who here has never used an Ethereum wallet before?"
    - "Who here has signed a transaction without fully understanding what it does?"

---

### Why Wallets Matter

#### The Bybit Hack

- February 2025: $1.5 billion stolen from Bybit
- Not a protocol exploit: attackers compromised the signing interface
- Bybit's signers approved a transaction they thought was routine; it wasn't
- The wallet showed them something different from what they actually signed

---

### The Transaction Legibility Problem

#### The Core Problem

Users often do not actually know what they are signing.

Examples:

- Blind signing
- Horrible raw calldata experiences
- Poor hardware wallet transaction verification UX

#### Real-World Context

- Social engineering and signing-based attacks
- Everyday users signing transactions they cannot interpret

---

### Emerging Standards Improving Wallet UX

#### ERC-8213: Calldata Digest & EIP-712 Digest

- Calldata verification
- Better intent visibility
- Reducing blind signing risks

#### ERC-7730: Structured Data Signing

- Human-readable signing flows
- Better transaction understanding
- Clearer intent representation
- Improved interoperability between dapps and wallets

#### Key Message

Wallet UX and wallet security are increasingly becoming standards problems.

Better standards improve:

- interoperability
- transaction clarity
- user trust
- wallet safety
- open competition

---

### Introducing Walletbeat

- A rating system for Ethereum wallets
- Evaluates wallets across five dimensions:
  - Security
  - Privacy
  - Transparency
  - Self-sovereignty
  - Ecosystem alignment

---

### Wallet Testing Supporting ERC-8213 & ERC-7730 (7 mins)

#### Live Demo: Walletbeat Testing Playground

Walk participants through:

- Different Walletbeat testing tabs

##### Focus Area: Transaction Legibility

Demonstrate:

- Signing a transaction using a wallet supporting ERC-8213 and ERC-7730
- Comparing readable vs unreadable signing experiences
- A real transaction flow using:
  - Uniswap
  - CoW Swap

### Final Takeaway

- Standards like ERC-7730 and ERC-8213 aim to improve user safety and interoperability

### Closing Message

It's time to push wallets toward better standards, better interoperability, and safer user experiences.
