---
Status: Sent
Date: 2025-03-21
From: polymutex
To: Ethereum Foundation
Context: Responding to request for additional information about Walletbeat's Pectra Proactive Grant application.
---

Hello,

Thanks for the consideration and for the questions!

You are correct that Walletbeat's support data about EIP-7702 is currently limited to a boolean "does the wallet support EIP-7702 in any fashion?" value. I concur that this is too limited in its current form and deserves to be more granular. The grant proposal's scope actually includes the work of expanding the schema used to classify wallets for EIP-7702 beyond this boolean (see "Extension of wallet feature data" bullet point under "Grant Scope").

> - Why did you opt for simple boolean? Do you plan to add more information in the future when it comes to 7702 support?

The reasons why this is limited to a boolean at the moment is as follows:

- EIP-7702 is quite new and its **adoption at the wallet level is currently almost none** (with notable exceptions like Ambire Wallet). Therefore, any finer-grained classification of features would still not differentiate the vast majority of wallets. They would all be in the same bucket of "none of the EIP-7702 features are supported". So at the present moment, a single boolean is enough to convey a sense of differentiation between wallets, and of progression for wallets that do implement EIP-7702 support.

- EIP-7702 has the potential to enable **features that the Ethereum community has not yet thought of**. There are some that we do know: token approval batching, more account recovery options, better permissions delegation and management, easier-to-use transaction signing options like passkeys, and so on. But there are probably more that we don't. By deferring the precise specification of the feature set, wallet developers have some time to experiment with the features they decide to build with EIP-7702's new capabilities. Walletbeat's criteria can come later once each relevant feature has already been implemented by at least one wallet. Additionally, this approach gives more legitimacy to Walletbeat's criteria for EIP-7702 features, because by selecting features that _some_ wallets have already implemented, the existence of these wallets serves as **proof of feasibility** to implement these features for other wallets.

- **Further standardization work remains to be done** for wallets to become interoperable with each other in an EIP-7702-enabled world. Such EIPs include EIP-5792 (Wallet Call API), EIP-7867 (Flow Control Wallet Call Capability), ERC-7579 (Minimal Modular Smart Accounts), ERC-7821 (Minimal Batch Executor Interface), and probably others. As part of upholding wallets to Ethereum values, one of Walletbeat's goals is to ensure standardization and interoperability across wallets to avoid lock-in; see Walletbeat's existing "Account portability" and "Browser integration EIPs" attributes as examples. However, Walletbeat itself does not aim to get involved in the standardization process or to "pick winners" among these standards. Its role would be to let that process play out, and to objectively report which standards get implemented by which wallets after the fact. Therefore, until the specific set of common EIP-7702 interoperability standards is more de-facto established and implemented by at least a few wallets, Walletbeat's EIP-7702 data won't include such standards.

- Walletbeat still has a **long tail of non-EIP-7702 attributes and tasks** that are outside of this grant's scope but that nonetheless need to be done before Walletbeat is ready for public launch. This includes attributes for privacy-preserving transfers, immutable frontend support, account recovery features, etc. It also includes non-wallet-rating-related work such as a website design overhaul (which we are receiving design help for from the EF, by the way, very grateful for this!), support for rendering the website on mobile screens, and so on. We simply have not yet gotten around to the EIP-7702-specific work.

> - What is the minimum requirement wallets will have to satisfy in order to receive positive mark in this metric?

As per above, in the **long term**, the minimum requirement will likely be a combination of EIP-7702-enabled features and of EIP/ERC standards for wallet interoperability. The specific set of requirements is not yet determined, and is part of this grant's scope.

In the **short term**, at a high level, the requirement would be about verifying existing user-desirable properties of wallets, without being prescriptive about any EIP-7702-enabled features. Specifically, the logic to rate a wallet would be as follows:

- If the wallet is a "smart contract only" non-EOA wallet (e.g. Daimo or Safe), the wallet is _exempt_ from EIP-7702. This means it does not receive a rating on this attribute at all, and is not penalized in the rating for not having this feature.
- If the wallet does not support EIP-7702 in any shape or form, it gets a failing rating.
- If the wallet does support EIP-7702, Walletbeat then looks at the default contract that the wallet delegates authority to, and applies criteria similar to those applied to "smart contract only" ERC-4337-style wallets to that contract. Specifically, all of the following must be true to get a passing rating:
  - If the smart contract allows k-of-N factors to approve transactions, does the user own at least _k_ of those factors in self-custody by default? _(This ensures the account remains actually self-custodial.)_
  - If the smart contract allows k-of-N factors to approve transactions, can the user create and broadcast a transaction that rotates one of these factors to a new key, using only open-source software that can run locally (i.e. not relying on any third-party API) to generate the transaction? _(This ensures the account remains secure in the event of key leakage.)_
  - Is it possible to create and broadcast an Ethereum transaction that withdraws any type of asset from the account to transfer it out to another address, using only open-source software that can run locally (i.e. not relying on any third-party API) to generate the transaction? _(This ensures a wallet development team that turns evil cannot lock users out of their wallets' funds.)_

Hope this answers your questions! Happy to answer anything else.

Best,

- @polymutex
