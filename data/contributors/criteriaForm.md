# Criteria Evaluation Form Template

- **attributeCategory**: e.g security or ecosystem "src/schema/attributes"
- **ID**: example_criteria
- **Display Name**: Example Criteria
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} implements [feature] using [implementation details].

## Details

{{WALLET_NAME}} implements [feature] using [specific details about implementation]. This [explains why this implementation is good/bad/partial] and provides [benefits/drawbacks] for users.
The implementation uses ${libraryUrl} which is [describe qualities of the library/technology - e.g., "well-audited", "gas-efficient", etc.].

## How To Improve

{{WALLET_NAME}} could improve its implementation by [specific recommendations]:

- Consider upgrading to [better alternative] for [specific benefit]
- Implement [additional feature] to enhance [specific aspect]
- Fix [specific issue] to address [specific concern]

## Rating Criteria

### Pass (Best)

The wallet implements [feature] using [optimal implementation], which provides [specific benefits like security, efficiency, etc.]. This implementation is [describe positive qualities - e.g., "well-audited", "most gas-efficient", etc.].

### Partial

The wallet implements [feature] using [acceptable but suboptimal implementation]. While this provides basic functionality, it [describe limitations or concerns].

### Fail

{{WALLET_NAME}} does not implement [feature] or uses an implementation that [describe critical issues]. This creates [specific risks or problems] for users.

---

# Hardware Wallet Specific Criteria

## Bug Bounty Program

- **attributeCategory**: security
- **ID**: Bug Bounty Program
- **Display Name**: Bug Bounty Program
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} implements [feature] using [implementation details].
- **WalletType**: Hardware wallet

## Details

{{WALLET_NAME}} implements [feature] using [specific details about implementation]. This [explains why this implementation is good/bad/partial] and provides [benefits/drawbacks] for users.

The implementation uses ${libraryUrl} which is [describe qualities of the library/technology - e.g., "well-audited", "gas-efficient", etc.].

## How To Improve

{{WALLET_NAME}} could improve its implementation by:

- Offering customer an upgrade path to another device for security purposes.
- Fix the vulnerabilities to address and/or implement a bug bounty program

## Bug bounty program

### Pass (Best)

The wallet implements a bounty program using its own security department or a third party provider, which provides incentives for security researchers. This implementation is [describe positive qualities - e.g., "well-audited", "most gas-efficient", etc.].

### Partial

The wallet implements a disclosure policy but doesn't disclose a reward or bounty program. While this provides basic functionality, it doesn't incentivize security researchers to attack.

### Fail

{{WALLET_NAME}} does not implement a bug bounty and doesn't provide security updates. Or use a wallet that has an unpatchable critical vulnerability. This creates a high risk for users.

# Wallet Criteria Entries

## Security Audits

- **attributeCategory**: security
- **ID**: securityAudits
- **Display Name**: Security Audits
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} has undergone a recent security audit with all faults addressed.

## Details

{{WALLET_NAME}} has had its source code reviewed by independent security auditors. Security audits are an important part of ensuring the wallet's code is secure, as they involve professionals looking for vulnerabilities and potential security issues.

The most recent audit was conducted on [date] by [auditor name]. All identified issues of medium severity or higher have been addressed by the development team.

## How To Improve

{{WALLET_NAME}} should maintain its commitment to security by:

- Scheduling regular security audits (at least annually)
- Promptly addressing any security flaws identified in audits
- Making audit reports publicly available to users
- Expanding the scope of audits to include all variants of the wallet

## Rating Criteria

### Pass (Best)

The wallet was audited within the last year, and all flaws of severity "medium" or higher are addressed.

### Partial

The wallet was either:

- Audited over a year ago and has not been audited since
- Audited within the last year, but there remains at least one unaddressed security flaw of severity "medium" or higher

### Fail

The wallet either:

- Was never audited by a third-party security auditor
- Was audited over a year ago, has not been audited since, and there remains at least one unaddressed security flaw of severity "medium" or higher

## Chain Verification

- **attributeCategory**: security
- **ID**: chainVerification
- **Display Name**: Chain Verification
- **Rating**: PASS/FAIL
- **Short Explanation**: {{WALLET_NAME}} [verifies/does not verify] the integrity of the Ethereum L1 chain.

## Details

{{WALLET_NAME}} [uses/does not use] light client verification to ensure the integrity of blockchain data when interacting with the Ethereum network. Chain verification is crucial for maintaining the "trust but verify" principle of blockchains, ensuring that users don't have to rely solely on third-party RPC providers for blockchain state information.

[If PASS: The wallet integrates light client functionality to verify block headers and chain state.]
[If FAIL: The wallet relies on third-party RPC providers without additional verification mechanisms.]

## How To Improve

{{WALLET_NAME}} could enhance its chain verification by:

- Integrating light client functionality to verify the integrity of Ethereum chain data
- Supporting multiple light client implementations (such as Helios)
- Extending verification to Layer 2 networks as the technology matures
- Providing visual indicators to users when chain verification is active

## Rating Criteria

### Pass

The wallet verifies the integrity of the Ethereum L1 chain using a light client implementation.

### Fail

The wallet does not verify the integrity of the Ethereum L1 chain, relying on the honesty of third-party RPC providers instead.

## Bug Bounty Program

- **attributeCategory**: security
- **ID**: bugBountyProgram
- **Display Name**: Bug Bounty Program
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [implements/partially implements/does not implement] a bug bounty program and security update process.

## Details

{{WALLET_NAME}} [has/has a limited/does not have] a bug bounty program to incentivize security researchers to responsibly discover and disclose vulnerabilities. This is critical for hardware wallets which manage sensitive cryptographic keys and access to users' funds.

[If PASS: The wallet offers competitive rewards based on severity, has a transparent disclosure process, and provides upgrade paths when security issues are identified.]
[If PARTIAL: The wallet has a basic vulnerability disclosure policy but with limitations in scope, rewards, or responsiveness.]
[If FAIL: The wallet lacks a formal process for reporting vulnerabilities and provides no incentives for responsible disclosure.]

[If applicable: The wallet provides a clear upgrade path for users when security issues are identified.]
[If applicable: The wallet lacks a clear upgrade path for users when security issues are identified.]

## How To Improve

{{WALLET_NAME}} could enhance its security practices by:

- Implementing a comprehensive bug bounty program with clear guidelines
- Offering appropriate rewards based on vulnerability severity
- Establishing a responsive disclosure process
- Providing transparent communication about fixes
- Creating clear upgrade paths for hardware devices when critical issues are discovered

## Rating Criteria

### Pass (Best)

The hardware wallet implements a comprehensive bug bounty program with clear incentives, responsive processes, and provides upgrade paths for users when security issues are discovered.

### Partial

The hardware wallet either:

- Implements a basic bug bounty program with limited scope or rewards
- Has a vulnerability disclosure policy but without formal rewards
- Lacks a clear upgrade path for users when security issues are discovered

### Fail

The hardware wallet has no bug bounty program or vulnerability disclosure policy, and lacks a clear process for providing security updates.

## Passkey Implementation

- **attributeCategory**: security
- **ID**: passkeyImplementation
- **Display Name**: Passkey Implementation
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [uses/partially uses/does not use] a secure and efficient passkey verification library.

## Details

{{WALLET_NAME}} [implements/partially implements/does not implement] passkeys using [library name], which provides [excellent/good/limited] security and gas efficiency for P256/R1 curve operations on-chain.

Passkeys provide a secure and phishing-resistant way to authenticate users without relying on seed phrases. The choice of verification library directly impacts both the security and cost-effectiveness of the implementation.

[If PASS: The wallet uses a highly optimized and well-audited library like Smooth Crypto Lib, Daimo P256 verifier, OpenZeppelin P256 verifier or WebAuthn.sol.]
[If PARTIAL: The wallet uses a functional but less optimal library like Fresh Crypto Lib ]
[If FAIL: The wallet does not implement passkeys or uses an unrecognized verification library.]

## How To Improve

{{WALLET_NAME}} could enhance its passkey implementation by:

- Adopting a more gas-efficient and well-audited verification library
- Upgrading to the latest version of their current library
- Conducting additional security audits on their implementation
- Providing clearer documentation about their passkey security model

## Rating Criteria

### Pass (Best)

The wallet implements passkeys using one of the most gas-efficient and well-audited libraries:

- Smooth Crypto Lib (most gas-efficient, triple-audited)
- Daimo P256 verifier (well-audited, reasonably efficient)
- OpenZeppelin P256 verifier (reputable team, well-audited)

### Partial

The wallet implements passkeys using less optimal but functional libraries:

- Fresh Crypto Lib
- WebAuthn.sol (which falls back to Fresh Crypto Lib)
- Other less common verification libraries

### Fail

The wallet does not implement passkeys or uses an unrecognized verification library.

Note: Hardware wallets and EOA-only wallets are exempt from this rating since they don't use passkeys.

## Scam Prevention

- **attributeCategory**: security
- **ID**: scamPrevention
- **Display Name**: Scam Prevention
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [implements/partially implements/does not implement] features to warn users about potential scams.

## Details

{{WALLET_NAME}} [provides/partially provides/does not provide] warnings about potential scam activities when using the wallet. Given that blockchain transactions are very difficult to reverse, these warnings help users avoid falling victim to scams.

The wallet implements the following types of warnings:
[If applicable: - Warnings when sending funds to an address the user has never previously transacted with]
[If applicable: - Warnings when interacting with contracts known to be scams]
[If applicable: - Warnings when interacting with contracts the user has never previously used]
[If applicable: - Warnings when interacting with recently deployed contracts]
[If applicable: - Warnings when connecting to applications known to be scams]

[If applicable: These warnings are implemented in a privacy-preserving manner, not revealing sensitive information to third parties.]
[If applicable: Some of these features reveal user data to third parties, creating potential privacy concerns.]

## How To Improve

{{WALLET_NAME}} could enhance its scam prevention by:

- Adding warnings for first-time transactions to unknown addresses
- Implementing contract security checks before transaction approval
- Warning users about suspicious URLs and phishing websites
- Ensuring all scam prevention features are implemented in a privacy-preserving manner
- Maintaining local databases of known addresses to avoid privacy leaks

## Rating Criteria

### Pass (Best)

The wallet implements comprehensive scam prevention features covering multiple risk scenarios (payment warnings, contract warnings, and URL warnings) in a privacy-preserving manner.

### Partial

The wallet implements some scam prevention features but either:

- Does not cover all risk scenarios
- Implements them in ways that compromise user privacy by sharing too much data with third parties

### Fail

The wallet has minimal or no scam prevention features to warn users about potentially dangerous transactions or interactions.

## Hardware Wallet Support

- **attributeCategory**: security
- **ID**: hardwareWalletSupport
- **Display Name**: Hardware Wallet Support
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} supports a wide range of hardware wallets.

## Details

{{WALLET_NAME}} offers integration with hardware wallets, providing users with enhanced security by keeping their private keys offline. This integration allows users to enjoy the features of the software wallet while maintaining the security benefits of hardware wallets.

The wallet supports the following hardware wallet brands: [list supported hardware wallets]. This comprehensive support gives users flexibility to choose the hardware solution that best fits their needs and preferences.

## How To Improve

{{WALLET_NAME}} could enhance its hardware wallet support by:

- Adding support for additional hardware wallet brands
- Improving the integration experience with existing supported hardware wallets
- Providing clearer documentation for hardware wallet setup and use
- Supporting advanced features like batch transactions with hardware wallets

## Rating Criteria

### Pass (Best)

The wallet supports all four major hardware wallet brands: Ledger, Trezor, Keystone, and GridPlus, with full functionality.

### Partial

The wallet supports at least one hardware wallet brand, but not all major brands or has limited functionality.

### Fail

The wallet does not support any hardware wallets.

## Address Correlation

- **attributeCategory**: privacy
- **ID**: addressCorrelation
- **Display Name**: Address Correlation
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [prevents/allows] third parties from correlating your wallet address with personal information.

## Details

{{WALLET_NAME}} [prevents/allows] your wallet address from being correlated with personal information such as your email address, phone number, or IP address. This is a critical privacy consideration, as such correlations can potentially be used to identify you and track your on-chain activity.

The wallet [does/does not] require explicit user consent before allowing any such correlations, and [does/does not] make it clear when such correlations might occur.

## How To Improve

{{WALLET_NAME}} could enhance its address correlation privacy by:

- Implementing proxy techniques to prevent IP address correlation
- Requiring explicit user consent before allowing personal information to be linked to wallet addresses
- Restructuring any on-chain registries to prevent address correlation
- Providing clearer documentation about potential privacy implications

## Rating Criteria

### Pass (Best)

The wallet prevents correlation between wallet addresses and personal information, or requires explicit user consent and makes privacy implications clear.

### Partial

The wallet allows some correlation between wallet addresses and less sensitive information (like username or IP address) but has some mitigation measures.

### Fail

The wallet allows correlation between wallet addresses and sensitive personal information (like email, phone number, or legal name) without adequate user consent or privacy protections.

## Open Source

- **attributeCategory**: transparency
- **ID**: openSource
- **Display Name**: Open Source
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} uses a [license type] license for its source code.

## Details

{{WALLET_NAME}} uses a [license type] license for its source code. This means the code is [free and open source/proprietary/planning to become open source in the future].

Open source software allows anyone to inspect, modify, and enhance the code, increasing transparency and allowing the community to verify the security and functionality of the wallet.

## How To Improve

{{WALLET_NAME}} could enhance its open source status by:

- [For proprietary wallets] Re-licensing under a Free and Open Source Software license
- [For unlicensed wallets] Adding a proper license file to its source code
- [For FOSS wallets] Improving documentation to make the codebase more accessible to contributors
- Establishing a clear contribution process for community members

## Rating Criteria

### Pass (Best)

The wallet's source code is licensed under a Free and Open Source Software (FOSS) license such as MIT, Apache, or GPL.

### Partial

The wallet's code license commits to transition to open-source in the future.

### Fail

The wallet uses a proprietary source code license or has no valid license for its source code.

## Source Visibility

- **attributeCategory**: transparency
- **ID**: sourceVisibility
- **Display Name**: Source Visibility
- **Rating**: PASS/FAIL
- **Short Explanation**: {{WALLET_NAME}}'s source code [is/is not] visible to the public.

## Details

{{WALLET_NAME}}'s source code [is/is not] publicly visible. When a wallet's source code is visible, it can be inspected for security vulnerabilities and potential malicious code, which improves the wallet's security and trustworthiness.

Public visibility of source code is distinct from the license - a wallet can have publicly visible source code without being open source.

## How To Improve

{{WALLET_NAME}} should make its source code publicly viewable, which would allow independent security researchers to inspect the code for vulnerabilities.

## Rating Criteria

### Pass

The wallet's source code is visible to the public.

### Fail

The source code for the wallet is not available to the public.

## Account Portability

- **attributeCategory**: self-sovereignty
- **ID**: accountPortability
- **Display Name**: Account Portability
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [allows/restricts] you to export your account and use it with other wallets.

## Details

{{WALLET_NAME}} [uses standard key derivation/uses non-standard key derivation/does not allow key export] for your accounts. This [enables/partially enables/prevents] you from using your accounts with other wallet applications.

Account portability is important for maintaining self-sovereignty over your crypto assets, ensuring you're not locked into one specific wallet provider.

## How To Improve

{{WALLET_NAME}} could enhance its account portability by:

- Following standard key derivation methods for all account types
- Implementing export functionality for private keys and seed phrases
- Supporting industry-standard backup formats
- Providing clear documentation on how to import/export accounts

## Rating Criteria

### Pass (Best)

The wallet follows standard key derivation methods (like BIP-39/BIP-44) or otherwise ensures accounts are fully portable to other wallet applications.

### Partial

The wallet uses non-standard key derivation but provides ways to export keys to other wallets, or only allows portability for some account types.

### Fail

The wallet locks users in by not allowing them to export their account's private keys or by not providing sufficient controlling shares in MPC setups.

## Transaction Inclusion

- **attributeCategory**: self-sovereignty
- **ID**: transactionInclusion
- **Display Name**: Transaction Inclusion
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [allows/restricts] you to submit transactions directly to the blockchain.

## Details

{{WALLET_NAME}} [supports/partially supports/does not support] direct transaction submission to the blockchain without relying on intermediaries that could potentially censor transactions.

For Layer 1 transactions, the wallet [uses direct broadcast methods/allows connecting to your own node/relies on intermediaries]. For Layer 2 transactions, the wallet [does/does not] support force-withdrawal mechanisms that allow users to exit even if the L2 operators become uncooperative.

## How To Improve

{{WALLET_NAME}} could enhance its transaction inclusion by:

- Adding support for broadcasting L1 transactions directly over Ethereum's gossip layer
- Allowing users to connect to their own self-hosted Ethereum nodes
- Implementing force-withdrawal mechanisms for all supported L2 networks
- Providing clear documentation on transaction submission options

## Rating Criteria

### Pass (Best)

The wallet supports direct transaction submission for L1 and provides force-withdrawal mechanisms for all supported L2 networks.

### Partial

The wallet either relies on intermediaries for L1 transactions or lacks force-withdrawal support for some L2 networks.

### Fail

The wallet relies solely on intermediaries for transaction submission and does not support alternative submission methods.

## Self-Hosted Node

- **attributeCategory**: self-sovereignty
- **ID**: selfHostedNode
- **Display Name**: Self-hosted Node
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [allows/restricts] you to use your own self-hosted Ethereum node.

## Details

{{WALLET_NAME}} [supports/partially supports/does not support] the use of self-hosted Ethereum nodes. Self-hosted nodes provide important benefits including enhanced privacy, data integrity, censorship resistance, and protection from third-party downtime.

[If applicable: The wallet lets you configure the RPC endpoint used for Ethereum mainnet.]
[If applicable: The wallet lets you add a custom chain with your own self-hosted node as RPC endpoint.]
[If applicable: The wallet contacts a third-party RPC endpoint before letting you configure a self-hosted node.]

## How To Improve

{{WALLET_NAME}} could enhance its self-hosted node support by:

- Allowing users to configure the RPC endpoint for Ethereum mainnet
- Ensuring configuration is possible before any requests are made to third-party RPC endpoints
- Providing clear documentation on how to connect to self-hosted nodes
- Adding support for additional node types beyond Ethereum mainnet

## Rating Criteria

### Pass (Best)

The wallet lets you configure the RPC endpoint used for Ethereum mainnet before any requests are made to third-party providers.

### Partial

The wallet either:

- Allows custom RPC endpoint configuration but only after making sensitive requests to third-party providers
- Doesn't allow direct RPC endpoint configuration but lets you add a custom chain with your own node

### Fail

The wallet uses a third-party Ethereum node provider and does not let you change this setting.

## Node Verification

- **attributeCategory**: self-sovereignty
- **ID**: nodeVerification
- **Display Name**: Node Verification
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: {{WALLET_NAME}} [verifies/partially verifies/does not verify] authenticity of RPC nodes.

## Details

{{WALLET_NAME}} [uses/partially uses/does not use] mechanisms to verify the authenticity and integrity of RPC node responses. Node verification is crucial for ensuring that the blockchain data you interact with is accurate and hasn't been tampered with.

[If applicable: The wallet verifies block headers with external sources.]
[If applicable: The wallet uses light client verification.]
[If applicable: The wallet connects to multiple RPC endpoints to cross-verify results.]

## How To Improve

{{WALLET_NAME}} could enhance its node verification by:

- Implementing light client verification for block headers
- Adding support for connecting to multiple RPC endpoints simultaneously
- Providing cryptographic verification of node responses
- Alerting users when discrepancies are detected between nodes

## Rating Criteria

### Pass (Best)

The wallet implements comprehensive node verification through light client protocols or cryptographic verification of block headers.

### Partial

The wallet implements limited verification mechanisms, such as connecting to multiple RPC endpoints or basic header validation.

### Fail

The wallet trusts RPC endpoint responses without any verification mechanisms.

## Example Entry: MetaMask (Passkey Implementation)

This is an example of how a completed entry would look for MetaMask's Passkey Implementation:

- **attributeCategory**: security
- **ID**: passkeyImplementation
- **Display Name**: Passkey Implementation
- **Rating**: PASS
- **Short Explanation**: MetaMask uses a secure and highly efficient passkey verification library called Smooth Crypto Lib.

## Details

MetaMask implements passkeys using Smooth Crypto Lib, which provides excellent security and gas efficiency for P256/R1 curve operations on-chain.

Passkeys provide a secure and phishing-resistant way to authenticate users without relying on seed phrases. The choice of verification library directly impacts both the security and cost-effectiveness of the implementation.

MetaMask uses a highly optimized and well-audited library (Smooth Crypto Lib) which is considered the most gas-efficient option available. This implementation has been audited multiple times and is part of their delegation framework.

## References

- [MetaMask Delegation Framework](https://github.com/MetaMask/delegation-framework/tree/main/lib)
- [Implementation commit showing Smooth Crypto Lib usage](https://github.com/MetaMask/delegation-framework/commit/8641eccdedf486832e66e589b8a9bcfd44d00104)

---

## Example Entry: Rabby (Scam Prevention)

This is an example of how a completed entry would look for Rabby's Scam Prevention:

- **attributeCategory**: security
- **ID**: scamPrevention
- **Display Name**: Scam Prevention
- **Rating**: PARTIAL
- **Short Explanation**: Rabby implements features to warn users about potential scams but with some privacy trade-offs.

## Details

Rabby provides warnings about potential scam activities when using the wallet. Given that blockchain transactions are very difficult to reverse, these warnings help users avoid falling victim to scams.

The wallet implements the following types of warnings:

- Warnings when visiting websites known to be scams
- Warnings when interacting with contracts known to be scams
- Warnings when interacting with recently deployed contracts
- User whitelist for trusted addresses

Some of these features reveal user data to third parties, creating potential privacy concerns. Rabby sends data such as contract addresses, user addresses, and in some cases domain information to their backend services for scam detection, which creates privacy trade-offs.

## References

- [Rabby Security Engine for scam URL detection](https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/connect.ts#L5-L73)
- [Rabby API code for scam prevention](https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code)
- [Contract transaction warning implementation](https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/tokenApprove.ts#L73-L92)

---

## Example Entry: Keystone (Hardware Wallet Clear Signing)

This is an example of how a completed entry would look for Keystone's Hardware Wallet Clear Signing:

- **attributeCategory**: security
- **ID**: hardwareWalletClearSigning
- **Display Name**: Hardware Wallet Clear Signing
- **Rating**: PASS
- **Short Explanation**: Keystone provides full clear signing with detailed transaction information displayed on the device screen.

## Details

Keystone implements comprehensive clear signing support, displaying detailed transaction information on the hardware device's screen. This allows users to verify exactly what they're signing before approving transactions.

The hardware device shows critical transaction information such as:

- Recipient address
- Transaction amount and token
- Contract information for interaction
- Gas fees
- Complete data for complex transactions

This level of detail ensures users can make informed decisions about transaction approval and helps prevent blind signing vulnerabilities.

## References

- [Video demonstration of Keystone's clear signing implementation on Safe](https://youtu.be/7lP_0h-PPvY?si=S4wNFukrmg4rwyFA&t=1141)
- [Keystone official documentation on clear signing](https://keyst.one/)

---

## Example Entry: Ledger (Bug Bounty Program)

This is an example of how a completed entry would look for a hardware wallet's Bug Bounty Program:

- **attributeCategory**: security
- **ID**: bugBountyProgram
- **Display Name**: Bug Bounty Program
- **Rating**: PASS
- **Short Explanation**: Ledger maintains a comprehensive bug bounty program with clear incentives and upgrade paths.

## Details

Ledger implements a comprehensive bug bounty program that incentivizes security researchers to responsibly discover and disclose vulnerabilities. This is critical for hardware wallets which manage sensitive cryptographic keys and access to users' funds.

The wallet offers competitive rewards based on severity, has a transparent disclosure process, and provides upgrade paths when security issues are identified. Researchers can receive up to $10,000 for critical vulnerabilities.

Ledger also maintains a clear upgrade path for users when security issues are discovered, including firmware updates and in some cases, hardware replacements.

## References

- [Ledger Bug Bounty Program](https://donjon.ledger.com/bounty/)
- [Ledger Security Bulletin History](https://www.ledger.com/security-bulletins)

---

## Example Entry: Rainbow (Open Source)

This is an example of how a completed entry would look for a wallet's Open Source status:

- **attributeCategory**: transparency
- **ID**: openSource
- **Display Name**: Open Source
- **Rating**: PASS
- **Short Explanation**: Rainbow uses the GPL-3.0 license for its source code.

## Details

Rainbow uses a GPL-3.0 license for its source code. This means the code is free and open source, allowing anyone to inspect, modify, and enhance it.

Open source software allows anyone to inspect, modify, and enhance the code, increasing transparency and allowing the community to verify the security and functionality of the wallet.

Rainbow's open source approach enables independent security researchers to review the code for vulnerabilities and provides transparency about how user funds are managed.

## References

- [Rainbow Wallet GitHub Repository](https://github.com/rainbow-me/rainbow)
- [Rainbow License File](https://github.com/rainbow-me/rainbow/blob/develop/LICENSE)

---
