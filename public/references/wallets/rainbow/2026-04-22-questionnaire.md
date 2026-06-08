---
title: Walletbeat Software Wallet Questionnaire
date: 2026-06-08
---

# Walletbeat Software Wallet Questionnaire

Thank you for taking the time to fill this out. Your answers help us rate your wallet accurately on [walletbeat.eth](https://walletbeat.eth.limo/).

**Note:** If your answer differs between Browser Extension, Mobile, and Desktop versions of your wallet, please note which platform the answer applies to wherever relevant.

## General

* **Wallet name: Rainbow**
* **Website:** [https://rainbow.me/](https://rainbow.me/)
* **Supported platforms:** (check all that apply)
    
    * ☐ Browser Extension
        
        * Yes
    * ☐ Mobile
        
        * Yes
    * ☐ Desktop
        
        * No
* **Is your wallet designed for general use, or peer-to-peer payments, or some other specific use-case?**
    
    * General use
* **Which account types does your wallet support?** (check all that apply)
    
    * ☐ EOA (externally owned account — standard seed phrase wallet)
        
        * Yes
    * ☐ MPC (multi-party computation — key is split across multiple parties)
    * ☐ EIP-7702 (delegating an EOA to act as a smart contract)
        
        * Yes
    * ☐ ERC-4337 smart account
    * ☐ Safe multisig
    * ☐ Other (please describe):
* **What is the default account type when a new user creates a wallet?**

* * *

**Security**

### Account Recovery

* **If a user loses their device or seed phrase, can they recover their account?** (yes / no)
    
    * Yes
* **What recovery method(s) do you support?**
    
    * ☐ Guardian-based / social recovery
    * ☐ Cloud backup (iCloud, Google Drive, etc.)
        
        * Yes
    * ☐ Multi-factor / passkey backup
    * ☐ Not supported
    * ☐ Other:
* **[If guardian-based] Please describe your guardian scheme and link to its documentation.**

### Chain Verification

* **Do you use a light client to independently verify Ethereum L1 state (without trusting a centralized RPC)?** (yes / no)
* **If yes, which implementation?** (e.g. Helios)

### Passkeys

* **Do you support passkeys (FIDO2/WebAuthn) as an authentication or signing method?** (yes / no)
    
    * Currently, no. Our engineering team is currently working to add passkey support.
* **If yes, which library do you use for on-chain P-256 verification? N/A**
    
    * ☐ Smooth Crypto Lib
    * ☐ Daimo P256 Verifier
    * ☐ OpenZeppelin P256 Verifier
    * ☐ WebAuthn.sol
    * ☐ Other:

### Security Audits

* **Have you had independent security audits?** (yes / no)
* **If yes, please provide links to all public audit reports:**

### Bug Bounty

* **Do you have a bug bounty program?** (yes / no)
    
    * Yes
* **If yes, please provide a link:**

### Scam Protection

**Malicious website warnings:**

* Do you warn users before connecting to potentially malicious websites or dapps? (yes / no)
    
    * Yes
        
        * If so, which database or external service is used?
            
            * Blockaid
        * Does this check send the visited URL to an external service? (yes / no)
            
            * No
        * Does it send the user’s wallet address to an external service? (yes / no)
        * Can the external service learn the user’s IP address? (yes / no)

**First-time contract warnings:**

* Do you warn users before interacting with a contract they haven’t used before? (yes / no)
    
    * Is a database of known-bad contracts or external service involved? If so, which one?
    * Does this check send the contract address to an external service? (yes / no)
    * Can the external service learn the user’s wallet address or IP address? (yes / no)

**First-time recipient warnings:**

* Do you warn users when sending funds to an address they’ve never sent to before? (yes / no)
    
    * Does this check send the recipient address to an external service? (yes / no)

### Hardware Wallet Support

* **Can users connect a hardware wallet to sign transactions?** (yes / no)
    
    * Yes
* **Which hardware wallets are supported?** Please list ALL supported.

## Privacy

### Privacy Policy

* **URL to your privacy policy:** [https://rainbow.me/privacy](https://rainbow.me/privacy)

### Multiple Addresses

* **Does your wallet support multiple Ethereum addresses?** (yes / no)
    
    * Yes

### Private / Anonymous Transfers

* **Do you support private or anonymous token transfers?** (yes / no)
    
    * No
* **Which privacy technology?** (check all that apply)
    
    * ☐ Stealth addresses (ERC-5564)
    * ☐ Privacy Pools
    * ☐ Railgun
    * ☐ Tornado Cash Nova
    * ☐ Other:

## Self-Sovereignty

### Account Portability

* **\[If EOA\] Key derivation:**
    
    * Do you use BIP32 hierarchical deterministic key derivation? (yes / no)
    * Do you use BIP39 seed phrases? (yes / no)
    * Do you use BIP44 derivation paths? (yes / no)
    * Can users configure a custom derivation path? (yes / no)
* **\[If EOA\] Export:**
    
    * Can users export their seed phrase? (yes / no)
    * Can users export individual private keys? (yes / no)
* **[If MPC or ERC-4337] Can users generate and broadcast transactions using open-source tools, without relying on your wallet application?** (yes / no — if yes, please describe)
* **[If ERC-4337] Smart account implementation:**
    
    * Which smart contract or implementation do you use?
    * Has it been audited? If yes, link to the report:

### Key Security

* **Where are private keys (or key shares) generated and stored?**
    
    * ☐ Generated and stored on the user’s device only
    * ☐ Generated on your servers
    * ☐ Generated jointly (MPC/threshold) between user device and your servers
    * ☐ Other:
* **Can your servers reconstruct or access the user’s private key at any point?** (yes / no / only with user consent — please explain)
* **\[If MPC\] Can users sign transactions without your servers being available?** (yes / no)

### Transaction Submission

* **Can users broadcast Ethereum L1 transactions without routing through your infrastructure?**
    
    * ☐ Yes, via direct P2P gossip (acting as a node on the network)
    * ☐ Yes, via a user-configured self-hosted RPC node (connecting to a node and relaying the transaction)
    * ☐ No, all transactions go through your servers
* **For Arbitrum: do you support force-inclusion (bypassing the Arbitrum sequencer to submit via L1)?** (yes / no / not supported)
* **For OP Stack chains (Optimism, Base, etc.): do you support force-inclusion?** (yes / no / not supported)

### RPC & Chain Configuration

* **Can users configure a custom Ethereum L1 RPC endpoint?** (yes / no)
    
    * **If yes, is this possible before the wallet makes any network requests on first launch?** (yes / no)
        
        * Mobile: No
        * Browser Extension: Yes

* **Can users configure custom RPC endpoints for L2 networks?** (yes / no)
    
    * Mobile: No
    * Browser Extension: Yes
* **Can users add entirely custom or non-default chains?** (yes / no)
    
    * Mobile: No
    * Browser Extension: Yes
* **If a user points the wallet at a self-hosted node, can they do all of the following without requests going to your servers?**
    
    * Create new accounts (yes / no)
        
        * Yes
    * Check balances (yes / no)
        
        * Yes
    * Send transactions (yes / no)
        
        * Yes

## Transparency

### Fee Display

* **Before a user confirms a transaction, do you show the complete fee breakdown — including any convenience fees or routing markups charged by your wallet?** (yes / no)
    
    * Yes. There is a review sheet for swaps that shows fees. This is optional with most users in defaulting to turning this off.
* **Are there any fees your wallet takes that are not explicitly displayed to the user before they confirm?** (yes / no — if yes, please describe)
    
    * Yes. Perps and prediction markets.

### Open Source

* **Is the wallet’s source code publicly available?** (yes / no)
    
    * Yes
* **If yes, under what license?**
    
    * GPL 3.0
* **If yes, please share the repository URL and any other relevant links:**
    
    * [https://github.com/rainbow-me/rainbow](https://github.com/rainbow-me/rainbow)
    * [https://github.com/rainbow-me/browser-extension](https://github.com/rainbow-me/browser-extension)

### Funding & Monetization

* **Is information about how your wallet is funded or monetized publicly available?** (yes / no)
    
    * Yes
* **If yes, please share a link:**
    
    * [https://defillama.com/protocol/fees/rainbow](https://defillama.com/protocol/fees/rainbow)
    * [https://investors.rainbow.me/](https://investors.rainbow.me/)

## Anything Else you want to specifically mention?

Is there anything about your wallet’s security, privacy, or self-sovereignty features that you’d like us to know, or that the questions above didn’t cover?