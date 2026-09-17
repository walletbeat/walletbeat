What does a CROPS wallet look like?

## Wallet Stages

Stages describe the milestones Ethereum wallets should work towards. Each stage builds on the previous, forming a roadmap for wallet teams to follow.

Walletbeat took inspiration from L2BEAT's Rollup Maturity Framework, where we introduce the same Stage Evaluation Framework but for Ethereum Wallets.

### Stage 0: Verifiable
- Source Availability: 
First, the wallet's source code must be publicly available so that it can be reviewed by the public.

### Stage 0.5: Foundational
Wallets should also implement the foundations of a proper Ethereum wallet. They should provide basic security, privacy, and also let users take control of their full account.

- Hardware Wallet Support: 
Supporting hardware wallets lets users keep their private keys offline, adding a critical layer of security.

- Transaction Legibility: 
Users must be able to see key transaction details (amount, recipient, chain, fees) before signing to understand the transaction they are about to do.

- Basic Authentication:
The wallet must require a PIN, password, or biometric to unlock.

- Basic Account Recovery Assurance:
Unless the wallet implements guardian-based account recovery, it must periodically prompt users to verify they can still access their seed phrase or private key.

### Stage 1: Ethereum Standard
The wallet provides a basic level of security.
- Security Audits: 
The wallet must pass an independent security audit within the last year. This provides another layer of scrutiny that can uncover vulnerabilities or integration mistakes internal reviews may miss.

- Hardware Wallet Interoperability:
The wallet must directly support hardware wallets from at least three major manufacturers. This ensures users are not locked into a single hardware vendor and can freely choose the device that best fits their security needs.

- Scam Alerting

- Standard Security Practices

- Account Recovery

The wallet offers a minimal level of privacy to its users.
- Private Transfers:
Token transfers and balances must be private by default.

- Wallet Address Privacy:
Wallet addresses must not be linkable to sensitive personal information.

- Multi-Address Privacy:
Multiple wallet addresses must not be correlatable with one another.

The wallet does not lock the user in and lets the user remain in full control of their account.
- Account Unruggability:
True self-sovereignty requires that neither the wallet developer nor any external service can unilaterally take over the user's account.

- Account Portability:
To avoid wallet lock-in, users must be able to export their account information and import it in another wallet.

- Support Own Node:
Blockchains' censorship resistance properties relies on disintermediation. The wallet must allow the user to use their own node when interacting with the L1 chain.

- Outstanding Approvals (ERC-20):

The wallet's development process and internal workings are transparent to the user.

The wallet is aligned with basic Ethereum ecosystem best practices for usability.


### Bug bounty program

We also push that wallets should maintain an active bug bounty program. Audits are periodic and don't guarantee vulnerability-free software, while bug bounties continuously incentivize security researchers and white-hat hackers to responsibly find and disclose vulnerabilities before they can be exploited by bad actors.

![Security audits and Bug bounty](./security.png)

### Free and Open Source Software (FOSS)

While COLDCARD's firmware source code is publicly available, it is source-available rather than FOSS. Its license includes the Commons Clause, which restricts the right to sell the software. FOSS isn't just about being able to read the code. It gives the broader ecosystem the freedom to use, study, modify, redistribute, and build upon it.

For wallet security, this helps create a culture where independent researchers can inspect implementations, build security tooling around them, publish improvements, and contribute their findings back to the ecosystem.

![FOSS](./foss.png)

## Conclusion

Wallets are one of the most critical layers of the crypto ecosystem. They hold the keys to our assets and are where we authorize transactions. While insecure RNG was the direct technical failure in this case, wallet teams should meet a high bar for security and adopt practice to ensure that users funds are safe.

Incidents like this are difficult for the ecosystem, especially for those affected. But we're optimistic that learning from these failures and raising the bar for wallet security will make crypto wallets better over time.