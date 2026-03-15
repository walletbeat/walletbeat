# Walletbeat Feature Types Reference

_Auto-generated from TypeScript source. Run `pnpm fix` to regenerate._

> This document describes all feature types used to evaluate Ethereum wallets in Walletbeat.
> Types are defined in `src/schema/features.ts` and its sub-modules.
>
> **Core concepts:**
>
> - `Support<T>` — Discriminated union: `{ support: 'NOT_SUPPORTED' }` OR `{ support: 'SUPPORTED', ...T }`
> - `VariantFeature<T>` — Variant-specific value (browser/mobile/desktop); resolved to a single value at evaluation time
> - `WithRef<T>` — Adds optional `ref: Reference[]` (citations) to type T
> - `MustRef<T>` — Adds mandatory `ref: Reference[]` to type T
> - `Nullable<T>` — All fields of T become nullable (i.e. `T[K] | null` for all K); the whole object may also be `null`

## Table of Contents

- [`src/schema/features.ts`](#srcschemafeaturests)
- [`src/schema/features/account-support.ts`](#srcschemafeaturesaccount-supportts)
- [`src/schema/features/ecosystem/chain-abstraction.ts`](#srcschemafeaturesecosystemchain-abstractionts)
- [`src/schema/features/ecosystem/delegation-handling.ts`](#srcschemafeaturesecosystemdelegation-handlingts)
- [`src/schema/features/ecosystem/hw-app-connection-support.ts`](#srcschemafeaturesecosystemhw-app-connection-supportts)
- [`src/schema/features/ecosystem/integration.ts`](#srcschemafeaturesecosystemintegrationts)
- [`src/schema/features/guardian-scenario/guardian-data-loss.ts`](#srcschemafeaturesguardian-scenarioguardian-data-lossts)
- [`src/schema/features/guardian-scenario/guardian-entity-turns-evil.ts`](#srcschemafeaturesguardian-scenarioguardian-entity-turns-evilts)
- [`src/schema/features/guardian-scenario/guardian-scenario-common.ts`](#srcschemafeaturesguardian-scenarioguardian-scenario-commonts)
- [`src/schema/features/privacy/address-resolution.ts`](#srcschemafeaturesprivacyaddress-resolutionts)
- [`src/schema/features/privacy/app-isolation.ts`](#srcschemafeaturesprivacyapp-isolationts)
- [`src/schema/features/privacy/data-collection.ts`](#srcschemafeaturesprivacydata-collectionts)
- [`src/schema/features/privacy/hardware-privacy.ts`](#srcschemafeaturesprivacyhardware-privacyts)
- [`src/schema/features/privacy/transaction-privacy.ts`](#srcschemafeaturesprivacytransaction-privacyts)
- [`src/schema/features/profile.ts`](#srcschemafeaturesprofilets)
- [`src/schema/features/security/account-recovery.ts`](#srcschemafeaturessecurityaccount-recoveryts)
- [`src/schema/features/security/bug-bounty-program.ts`](#srcschemafeaturessecuritybug-bounty-programts)
- [`src/schema/features/security/firmware.ts`](#srcschemafeaturessecurityfirmwarets)
- [`src/schema/features/security/hardware-wallet-support.ts`](#srcschemafeaturessecurityhardware-wallet-supportts)
- [`src/schema/features/security/keys-handling.ts`](#srcschemafeaturessecuritykeys-handlingts)
- [`src/schema/features/security/light-client.ts`](#srcschemafeaturessecuritylight-clientts)
- [`src/schema/features/security/passkey-verification.ts`](#srcschemafeaturessecuritypasskey-verificationts)
- [`src/schema/features/security/scam-alerts.ts`](#srcschemafeaturessecurityscam-alertsts)
- [`src/schema/features/security/secure-element.ts`](#srcschemafeaturessecuritysecure-elementts)
- [`src/schema/features/security/security-audits.ts`](#srcschemafeaturessecuritysecurity-auditsts)
- [`src/schema/features/security/supply-chain-diy.ts`](#srcschemafeaturessecuritysupply-chain-diyts)
- [`src/schema/features/security/supply-chain-factory.ts`](#srcschemafeaturessecuritysupply-chain-factoryts)
- [`src/schema/features/security/transaction-legibility.ts`](#srcschemafeaturessecuritytransaction-legibilityts)
- [`src/schema/features/security/user-safety.ts`](#srcschemafeaturessecurityuser-safetyts)
- [`src/schema/features/self-sovereignty/chain-configurability.ts`](#srcschemafeaturesself-sovereigntychain-configurabilityts)
- [`src/schema/features/self-sovereignty/interoperability.ts`](#srcschemafeaturesself-sovereigntyinteroperabilityts)
- [`src/schema/features/self-sovereignty/transaction-submission.ts`](#srcschemafeaturesself-sovereigntytransaction-submissionts)
- [`src/schema/features/support.ts`](#srcschemafeaturessupportts)
- [`src/schema/features/transparency/fee-display.ts`](#srcschemafeaturestransparencyfee-displayts)
- [`src/schema/features/transparency/license.ts`](#srcschemafeaturestransparencylicensets)
- [`src/schema/features/transparency/maintenance.ts`](#srcschemafeaturestransparencymaintenancets)
- [`src/schema/features/transparency/monetization.ts`](#srcschemafeaturestransparencymonetizationts)
- [`src/schema/features/transparency/reputation.ts`](#srcschemafeaturestransparencyreputationts)

---

## `src/schema/features.ts`

### Interface: `WalletBaseFeatures`

A set of features about any type of wallet.

None of the fields in this type should be marked as possibly `undefined`. If you want to add a new field, you need to add it to all existing wallets, even if unrated (i.e. `null`).

- `profile` (`WalletProfile`): The profile of the wallet, determining the use-cases and audience that it is meant for. This has impact on which attributes are relevant to it, and which attributes it is exempt from. This is _not_ per-variant, because users would not expect that a single wallet would fulfill different use-cases depending on which variant of the wallet they install.
- `security` (object): Security features.
  - `publicSecurityAudits` (`SecurityAudit[] | null`): Public security audits the wallet has gone through. If never audited, this should be an empty array, as 'null' represents the fact that we haven't checked whether there have been any audit.
  - `bugBountyProgram` (`VariantFeature<Support<BugBountyProgramImplementation>>`): Bug bounty program implementation
  - `transactionLegibility` (`VariantFeature< HardwareTransactionLegibilityImplementation | SoftwareTransactionLegibilityImplementation >`): Transaction legibility features.
  - `lightClient` (object): Light clients.
    - `ethereumL1` (`VariantFeature<Support<WithRef<EthereumL1LightClientSupport>>>`): Light client used for Ethereum L1.
  - `accountRecovery` (`VariantFeature<AccountRecovery>`): How can users of the wallet recover their account?
  - `keysHandling` (`VariantFeature<WithRef<KeysHandlingSupport>>`): How are secret keys handled?
- `privacy` (object): Privacy features.
  - `dataCollection` (`VariantFeature<DataCollection>`): Data collection information. See /docs/mitmproxy-guide for how to collect this.
  - `privacyPolicy` (`VariantFeature<string>`): Privacy policy URL of the wallet.
  - `transactionPrivacy` (`VariantFeature<TransactionPrivacy>`): Transaction privacy features.
- `selfSovereignty` (`object`): Self-sovereignty features.
- `transparency` (object): Transparency features.
  - `operationFees` (`VariantFeature<Nullable<BasicOperationFees>>`): Information on how fees are displayed for basic operations.
- `accountSupport` (`VariantFeature<AccountSupport>`): Which types of accounts the wallet supports.
- `multiAddress` (`VariantFeature<Support>`): Does the wallet support more than one Ethereum address?
- `licensing` (`WalletLicensing`): License of the wallet. Variant specificity handled internally to `WalletLicense` type.
- `monetization` (`VariantFeature<Monetization>`): The monetization model of the wallet.

---

### Type: `WalletSoftwareFeatures`

A set of features for any software wallet.

None of the fields in this type should be marked as possibly `undefined`. If you want to add a new field, you need to add it to all existing wallets, even if unrated (i.e. `null`).

```typescript
type WalletSoftwareFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & {
		/** Support for alerting the user about potential scams. */
		scamAlerts: VariantFeature<Nullable<ScamAlerts>>

		/** Hardware wallet support */
		hardwareWalletSupport: VariantFeature<HardwareWalletSupport>

		/** Passkey verification implementation */
		passkeyVerification: VariantFeature<Support<PasskeyVerificationImplementation>>
		transactionLegibility: WalletBaseFeatures['security']['transactionLegibility'] &
			VariantFeature<SoftwareTransactionLegibilityImplementation>
	}

	/** Privacy features. */
	privacy: WalletBaseFeatures['privacy'] & {
		/** Does the wallet isolate data between apps? */
		appIsolation: VariantFeature<Nullable<AppIsolation>>
	}

	/** Self-sovereignty features. */
	selfSovereignty: WalletBaseFeatures['selfSovereignty'] & {
		/** Describes the set of options for submitting transactions. */
		transactionSubmission: VariantFeature<Nullable<TransactionSubmission>>
	}

	/** Ecosystem features. */
	ecosystem: {
		/** EIP-7702 delegation handling. */
		delegation: VariantFeature<DelegationHandling>
	}

	/** Level of configurability for chains. */
	chainConfigurability: VariantFeature<Support<WithRef<Nullable<ChainConfigurability>>>>

	/** Integration inside browsers, mobile phones, etc. */
	integration: WalletIntegration

	/** How the wallet resolves Ethereum addresses. */
	addressResolution: VariantFeature<Nullable<WithRef<AddressResolution>>>

	/** How well does the wallet abstract over chains? */
	chainAbstraction: VariantFeature<Nullable<ChainAbstraction>>
}
```

---

### Type: `WalletHardwareFeatures`

A set of features for any hardware wallet.

None of the fields in this type should be marked as possibly `undefined`. If you want to add a new field, you need to add it to all existing wallets, even if unrated (i.e. `null`).

```typescript
type WalletHardwareFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & {
		firmware: VariantFeature<FirmwareSupport>
		supplyChainDIY: VariantFeature<SupplyChainDIYSupport>
		supplyChainFactory: VariantFeature<SupplyChainFactorySupport>
		userSafety: VariantFeature<UserSafetySupport>
		/** Secure element support */
		secureElement: VariantFeature<Support<SecureElementSupport>>
		transactionLegibility: WalletBaseFeatures['security']['transactionLegibility'] &
			VariantFeature<HardwareTransactionLegibilityImplementation>
	}
	privacy: WalletBaseFeatures['privacy'] & {
		hardwarePrivacy: VariantFeature<HardwarePrivacySupport>
	}
	selfSovereignty: WalletBaseFeatures['selfSovereignty'] & {
		interoperability: VariantFeature<InteroperabilitySupport>
	}
	transparency: WalletBaseFeatures['transparency'] & {
		reputation: VariantFeature<ReputationSupport>
		maintenance: VariantFeature<MaintenanceSupport>
	}
	appConnectionSupport: VariantFeature<AppConnectionSupport>
}
```

---

### Type: `WalletEmbeddedFeatures`

A set of features for any embedded wallet.

None of the fields in this type should be marked as possibly `undefined`. If you want to add a new field, you need to add it to all existing wallets, even if unrated (i.e. `null`).

```typescript
type WalletEmbeddedFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & {
		passkeyVerification: VariantFeature<Support<PasskeyVerificationImplementation>>
	}
}
```

---

### Interface: `ResolvedFeatures`

A set of features about a specific wallet variant. All features are resolved to a single variant here.

- `variant` (`Variant`): The wallet variant which was used to resolve the feature tree.
- `type` (`WalletType`): The type of the wallet. This is a shorthand for `variantToWalletType(variant)`, meant to be used for easy filtering in attribute evaluation code.
- `profile` (`WalletProfile`): The profile of the wallet.
- `security` (object)
  - `scamAlerts` (`ResolvedFeature<ScamAlerts>`)
  - `publicSecurityAudits` (`SecurityAudit[] | null`)
  - `lightClient` (object)
    - `ethereumL1` (`ResolvedFeature<Support<WithRef<EthereumL1LightClientSupport>>>`)
  - `hardwareWalletSupport` (`ResolvedFeature<HardwareWalletSupport>`)
  - `transactionLegibility` (`ResolvedFeature< HardwareTransactionLegibilityImplementation | SoftwareTransactionLegibilityImplementation >`)
  - `passkeyVerification` (`ResolvedFeature<Support<PasskeyVerificationImplementation>>`)
  - `bugBountyProgram` (`ResolvedFeature<Support<BugBountyProgramImplementation>>`)
  - `firmware` (`ResolvedFeature<FirmwareSupport>`)
  - `keysHandling` (`ResolvedFeature<WithRef<KeysHandlingSupport>>`)
  - `supplyChainDIY` (`ResolvedFeature<SupplyChainDIYSupport>`)
  - `supplyChainFactory` (`ResolvedFeature<SupplyChainFactorySupport>`)
  - `userSafety` (`ResolvedFeature<UserSafetySupport>`)
  - `accountRecovery` (`ResolvedFeature<AccountRecovery>`)
- `privacy` (object)
  - `dataCollection` (`ResolvedFeature<DataCollection>`)
  - `privacyPolicy` (`ResolvedFeature<string>`)
  - `hardwarePrivacy` (`ResolvedFeature<HardwarePrivacySupport>`)
  - `transactionPrivacy` (`ResolvedFeature<TransactionPrivacy>`)
  - `appIsolation` (`ResolvedFeature<AppIsolation>`)
- `selfSovereignty` (object)
  - `transactionSubmission` (`ResolvedFeature<TransactionSubmission>`)
  - `interoperability` (`ResolvedFeature<InteroperabilitySupport>`)
- `transparency` (object)
  - `operationFees` (`ResolvedFeature<BasicOperationFees>`)
  - `reputation` (`ResolvedFeature<ReputationSupport>`)
  - `maintenance` (`ResolvedFeature<MaintenanceSupport>`)
- `chainAbstraction` (`ResolvedFeature<ChainAbstraction>`)
- `chainConfigurability` (`ResolvedFeature<Support<WithRef<ChainConfigurability>>>`)
- `accountSupport` (`ResolvedFeature<AccountSupport>`)
- `multiAddress` (`ResolvedFeature<Support>`)
- `integration` (`ResolvedWalletIntegration`)
- `addressResolution` (`ResolvedFeature<WithRef<AddressResolution>>`)
- `licensing` (`ResolvedWalletLicensing`)
- `monetization` (`ResolvedFeature<Monetization>`)
- `appConnectionSupport` (`ResolvedFeature<AppConnectionSupport>`)

---

## `src/schema/features/account-support.ts`

### Type: `AccountTypeSupport<T extends object>`

```typescript
type AccountTypeSupport<T extends object> = Support<WithRef<T>>
```

---

### Enum: `AccountType`

Set of possible account types.

- `eoa` = `'eoa'`: EOA account type, behind a private key. To test: create a new wallet and check whether it shows a seed phrase during onboarding. Verify the address starts with `0x` and has no associated contract code (e.g. check on Etherscan — "Contract" tab should be absent).
- `mpc` = `'mpc'`: MPC wallets, behind a key with split shards. To test: check the wallet's documentation for "MPC", "threshold signatures", or "key sharding". MPC wallets typically do not show a seed phrase and the address has no on-chain contract code.
- `eip7702` = `'eip7702'`: EOA account that is used as a smart contract account with EIP-7702. To test: check the wallet's documentation for EIP-7702 support. The address is an EOA but will have contract code attached when the delegation is active (visible on Etherscan under "Contract").
- `rawErc4337` = `'rawErc4337'`: Raw ERC-4337 account, i.e. an account for which the address matches the smart contract code. To test: look up the wallet address on Etherscan — the "Contract" tab should be present and show deployed bytecode. The wallet typically does not show a seed phrase; authentication uses a separate signer key.
- `safe` = `'safe'`: Safe multisig smart contract account. To test: check whether the wallet lets you connect to or create a Safe. The address should resolve to a Safe contract on Etherscan (look for "GnosisSafe" or "Safe" in the contract name).

---

### Enum: `TransactionGenerationCapability`

The ability (or lack thereof) to generate a transaction of a specific type.

- `RELYING_ON_EXTERNAL_API` = `'RELYING_ON_EXTERNAL_API'`: The process to generate such a transaction relies on an external API.
- `USING_PROPRIETARY_STANDALONE_APP` = `'USING_PROPRIETARY_STANDALONE_APP'`: The process to generate such a transaction requires the use of a standalone proprietary application.
- `USING_OPEN_SOURCE_STANDALONE_APP` = `'USING_OPEN_SOURCE_STANDALONE_APP'`: The process to generate such a transaction requires the use of an open-source standalone application.
- `IMPOSSIBLE` = `'IMPOSSIBLE'`: It is not possible to generate such a transaction.

---

### Type: `PossibleTransactionGenerationCapability`

The ability to generate a transaction of a specific type.

```typescript
type PossibleTransactionGenerationCapability = Exclude<
	TransactionGenerationCapability,
	TransactionGenerationCapability.IMPOSSIBLE
>
```

---

### Type: `AccountSupport`

Account support features.

To test: create a new wallet and observe which account type is created by default (EOA, MPC, smart account, Safe). Then check wallet settings and documentation to confirm which additional account types are supported.

```typescript
type AccountSupport = Exclude<
	{
		/**
		 * Support for raw EOA accounts.
		 * Leave as NOT_SUPPORTED if the wallet only supports EIP-7702-type EOAs.
		 */
		eoa: AccountTypeSupport<AccountTypeEoa>

		/** Support for MPC-based (sharded key) accounts. */
		mpc: AccountTypeSupport<AccountTypeMpc>

		/**
		 * Support for EIP-7702 EOA accounts.
		 * This usually also implies `rawEoa` support.
		 */
		eip7702: AccountTypeSupport<AccountType7702>

		/**
		 * Support for smart accounts (pure ERC-4337 accounts for which the
		 * address matches the contract code).
		 */
		rawErc4337: AccountTypeSupport<AccountType4337>
		/** Support for Safe multisig accounts. */
		safe: AccountTypeSupport<AccountTypeSafe>
	},
	// At least one account type must be supported.
	Record<AccountType, NotSupported>
> & { defaultAccountType: AccountType }
```

---

### Interface: `AccountTypeEoa`

Support information for EOA accounts.

To test:

- `keyDerivation`: During onboarding or in Settings, check whether the
  wallet shows a 12/24-word BIP39 seed phrase. Import the seed phrase into
  another BIP44-compatible wallet (e.g. MetaMask) and verify the same
  address is derived.
- `canExportPrivateKey`: Go to Settings → Security (or equivalent) and
  look for an "Export private key" or "Show private key" option.
- `canExportSeedPhrase`: Go to Settings → Security and look for a
  "Reveal seed phrase" or "Back up recovery phrase" option.

- `keyDerivation` (`| { type: 'NONSTANDARD' } | { type: 'BIP32' seedPhrase: 'NONSTANDARD' | 'BIP39' derivationPath: 'NONSTANDARD' | 'BIP44' canExportSeedPhrase: boolean }`): Type of standards used to deterministically derive private keys.
- `canExportPrivateKey` (`boolean`): Can the wallet export EOA private keys directly?

---

### Type: `AccountTypeMpc`

Support information for accounts with multiple authentication factors where the factors cannot be mutated.

```typescript
type AccountTypeMpc = AccountTypeMultifactor & {
	/**
	 * How is the underlying key generation performed before shares are distributed?
	 *
	 * To test: check the wallet's technical documentation or audit reports.
	 * ON_USER_DEVICE means key material never leaves the user's device during
	 * generation; BY_EXTERNAL_PROVIDER_* means the provider participates in or
	 * fully controls the initial keygen ceremony.
	 */
	initialKeyGeneration:
		| 'ON_USER_DEVICE'
		| 'BY_EXTERNAL_PROVIDER_IN_SECURE_ENCLAVE'
		| 'BY_EXTERNAL_PROVIDER_IN_THE_CLEAR'
}
```

---

### Type: `AccountTypeMutableMultifactor`

Support information for accounts with multiple authentication factors where the factors can be mutated.

```typescript
type AccountTypeMutableMultifactor = AccountTypeMultifactor & {
	/**
	 * Is it possible to create and broadcast an Ethereum transaction that
	 * rotates one of the factors used to control the account without relying
	 * on an external service?
	 *
	 * This implies that the code to create such a transaction is open-source
	 * and does not rely on any network request to a proprietary API or service.
	 */
	keyRotationTransactionGeneration: TransactionGenerationCapability
}
```

---

### Interface: `SmartAccountType`

A wallet backed by a smart contract.

- `contract` (`'UNKNOWN' | SmartWalletContract`)

---

### Type: `AccountType4337`

Support information for ERC-4337 accounts.

```typescript
type AccountType4337 = AccountTypeMutableMultifactor & SmartAccountType
```

---

### Type: `AccountType7702`

Support information for EIP-7702 accounts.

```typescript
type AccountType7702 = SmartAccountType
```

---

### Interface: `AccountTypeSafe`

Support information for Safe multisig accounts.

To test:

- `canDeployNew`: Go through the wallet's UI and check whether it offers
  a flow to deploy a new Safe contract.
- `supportsAddingOrRemovingSigners`: In an existing Safe, attempt to add
  or remove an owner using only the wallet's native UI (no extra modules).
  Check whether the wallet generates the `addOwnerWithThreshold` /
  `removeOwner` transaction directly.
- `supportsKeyRotationWithoutModules`: In an existing Safe, attempt to
  replace an owner key using only the wallet's native UI (no extra
  modules). Check whether the wallet generates the `swapOwner` transaction
  directly.
- `supportedConfigs.owners`: Try connecting the wallet to Safes with 1,
  2, and many owners and note the limits.

- `canDeployNew` (`boolean`): Can the wallet deploy new Safe contracts?
- `supportsAddingOrRemovingSigners` (`boolean`): Does the wallet support adding or removing signers without additional modules?
- `supportsKeyRotationWithoutModules` (`boolean`): Does the wallet support key rotation without additional modules?
- `owners` (`'SINGLE_SIGNER' | 'MULTI_SIGNER' | 'ANY_NUMBER_OF_SIGNERS'`): Range of signers (owners) the wallet can work with.
  - SINGLE_SIGNER: only single-owner Safes are supported.
  - ANY_NUMBER_OF_SIGNERS: no practical upper limit on owners.

---

## `src/schema/features/ecosystem/chain-abstraction.ts`

### Interface: `CrossChainBalanceDisplay`

How does the wallet display token balances?

- `perChainBalanceViewAcrossMultipleChains` (`Support`): Does the wallet support showing the user's balance on multiple chains at once in a single view, with each chain's balance reflected individually? (e.g. Ethereum: 1.0 ETH, Arbitrum: 0.8 ETH, Base: 0.2 ETH — or Ethereum: 100 USDC, Arbitrum: 200 USDC, shown as separate line items.)
- `crossChainSumView` (`Support`): Does the wallet support showing the user's balance summed up across multiple chains at once? (e.g. 2.0 ETH total across Ethereum, Arbitrum, and Base — or 300 USDC total across Ethereum and Arbitrum.)

---

### Type: `ChainAbstraction`

Chain abstraction features.

- `crossChainBalances` (`WithRef<{ globalAccountValue: Support perChainAccountValue: Support ether: CrossChainBalanceDisplay usdc: CrossChainBalanceDisplay }>`): What types of balances can the wallet display?
- `bridging` (object): Chain bridging features.
  - `builtInBridging` (`Support< WithRef<{ risksExplained: 'NOT_IN_UI' | 'VISIBLE_BY_DEFAULT' | 'HIDDEN_BY_DEFAULT' feesLargerThan1bps: FeeDisplay }> >`): Does the wallet have a built-in bridging feature? (e.g. The wallet allows the user to bridge ETH from Ethereum to Arbitrum directly within the wallet UI, without needing an external app.)
  - `suggestedBridging` (`Support<WithRef<{}>>`): When the user is attempting to spend tokens on a chain where their balance is insufficient, but where they have sufficient balance on another chain, does the wallet automatically propose the user to bridge? (e.g. The user tries to send USDC on Arbitrum but only has USDC on Ethereum, the wallet prompts them to bridge first.)

---

## `src/schema/features/ecosystem/delegation-handling.ts`

### Type: `DelegationHandling`

How the wallet handles EIP-7702 delegations.

```typescript
type DelegationHandling =
	| 'EIP_7702_NOT_SUPPORTED'
	| (DelegationOffer &
			(
				| // Either the delegation is required at EOA creation and import time...
				{ duringEOACreation: 'REQUIRED'; duringEOAImport: 'REQUIRED' }
				// Or it is supported at transaction time.
				| { duringFirst7702Operation: Supported<DelegationOffer['duringFirst7702Operation']> }
			) & {
				/** How is the fee for the initial EIP-7702 delegation paid? */
				fee: {
					/**
					 * Does the wallet sponsor the delegation fee?
					 * (i.e. The wallet pays for the gas cost of the EIP-7702 delegation transaction
					 * on behalf of the user, so they do not need ETH to get started.)
					 */
					walletSponsored: Support

					/**
					 * Does the wallet support paying for the gas fee across chains?
					 * (i.e. The user pays the delegation gas fee using USDC on Arbitrum,
					 * even though the delegation occurs on Ethereum mainnet.)
					 */
					crossChainGas: Support
				}
			})
```

---

## `src/schema/features/ecosystem/hw-app-connection-support.ts`

### Enum: `AppConnectionMethod`

Methods by which a hardware wallet can connect to apps

If supported by a software wallet, just fill in the list below

- `VENDOR_CLOSED_SOURCE_APP` = `'VENDOR_CLOSED_SOURCE_APP'`: The wallet connects to apps through its own proprietary closed-source application. (e.g. A hardware wallet that ships its own desktop app for connecting to apps, where the app's source code is not publicly available.)
- `VENDOR_OPEN_SOURCE_APP` = `'VENDOR_OPEN_SOURCE_APP'`: The wallet connects to apps through its own open-source application. (e.g. A hardware wallet that ships its own desktop app for connecting to apps, where the app's source code is publicly available and auditable.)

---

### Enum: `SoftwareWalletType`

Types of software wallets that hardware wallets can connect through

- `METAMASK` = `'METAMASK'`
- `RABBY` = `'RABBY'`
- `FRAME` = `'FRAME'`
- `AMBIRE` = `'AMBIRE'`
- `OTHER` = `'OTHER'`

---

### Interface: `AppConnectionMethodDetails`

Specific details about a app connection method when supported

- `supportedConnections` (`NonEmptySet<AppConnectionMethod | SoftwareWalletType>`): Which connection methods are supported (must have at least one). (e.g. A hardware wallet that supports both its own open-source app and MetaMask would list `VENDOR_OPEN_SOURCE_APP` and `METAMASK` here.)
- `requiresManufacturerConsent` (`| { type: 'ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE' } | MustRef<{ type: 'FEATURES_GATED_BY_MANUFACTURER' }> | null`): Is manufacturer consent required to integrate any hardware wallet feature into a software wallet? If so, must provide reference.
  - `ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE`: any software wallet can integrate the hardware
    wallet without needing approval from the manufacturer.
  - `FEATURES_GATED_BY_MANUFACTURER`: the manufacturer must approve before a software wallet can
    access certain features.

---

### Type: `AppConnectionSupport`

A record of hardware wallet app connection support

```typescript
type AppConnectionSupport = Support<WithRef<AppConnectionMethodDetails>>
```

---

## `src/schema/features/ecosystem/integration.ts`

### Type: `BrowserIntegrationEip`

EIPs related to web browser integration standards.

```typescript
type BrowserIntegrationEip = '1193' | '2700' | '6963'
```

---

### Interface: `WalletIntegration`

Level of integration of a wallet within browsers, mobile phones, etc.

- `browser` (`'NOT_A_BROWSER_WALLET' | WithRef<Record<BrowserIntegrationEip, Support | null>>`): Browser-level integrations. Should be set to 'NOT_A_BROWSER_WALLET' if the wallet has no browser version.

  Use the Walletbeat test page to verify support: https://beta.walletbeat.eth.limo/test/ It tests EIP-1193, EIP-2700, and EIP-6963 directly in the browser.

- `walletCall` (`VariantFeature<Support<WithRef<WalletCallIntegration>>>`): EIP-5792: Wallet Call API support. The wallet must support all of the following calls:
  - wallet_sendCalls
  - wallet_getCallsStatus
  - wallet_showCallsStatus
  - wallet_getCapabilities

  Use the Walletbeat test page to verify support: https://beta.walletbeat.eth.limo/test/

---

### Interface: `ResolvedWalletIntegration`

Variant-specific resolution of `WalletIntegration`.

- `browser` (`WalletIntegration['browser']`)
- `walletCall` (`ResolvedFeature<Support<WithRef<WalletCallIntegration>>>`)

---

### Interface: `WalletCallIntegration`

EIP-5792 Wallet Call API support.

- `atomicMultiTransactions` (`Support`): `atomic` capability as reported by wallet_getCapabilities. This allows apps to execute multiple transactions atomically. https://eips.ethereum.org/EIPS/eip-5792#atomic-capability For the purpose of this attribute, we only look at support on L1. A reported value of 'ready' or 'supported' qualifies as supported.

---

## `src/schema/features/guardian-scenario/guardian-data-loss.ts`

### Interface: `GuardianScenarioDataLoss`

- `type` (`GuardianScenarioType.DATA_LOSS`)
- `guardiansWithDataLoss` (`NonEmptyArray<Guardian>`)
- `description` (`Sentence`)

---

## `src/schema/features/guardian-scenario/guardian-entity-turns-evil.ts`

### Interface: `GuardianScenarioEntityTurnsEvil`

- `type` (`GuardianScenarioType.ENTITY_TURNS_EVIL`)
- `turnsEvil` (`NonEmptyArray<Entity>`)
- `description` (`Sentence`)

---

## `src/schema/features/guardian-scenario/guardian-scenario-common.ts`

### Enum: `GuardianScenarioType`

- `DATA_LOSS` = `'DATA_LOSS'`
- `ENTITY_TURNS_EVIL` = `'ENTITY_TURNS_EVIL'`

---

### Type: `GuardianScenario<S extends GuardianScenarioType>`

```typescript
type GuardianScenario<S extends GuardianScenarioType> = (
	| GuardianScenarioDataLoss
	| GuardianScenarioEntityTurnsEvil
) & {
	type: S
}
```

---

### Type: `AccountRecoveryOutcomeCanBeRecovered`

- `type` (`'CAN_RECOVER'`)

---

### Type: `AccountRecoveryOutcomeCannotBeRecovered`

- `type` (`'CANNOT_RECOVER'`)
- `description` (`Sentence<WalletNameStrings>`)

---

### Type: `AccountRecoveryOutcome`

```typescript
type AccountRecoveryOutcome =
	| AccountRecoveryOutcomeCanBeRecovered
	| AccountRecoveryOutcomeCannotBeRecovered
```

---

### Type: `AccountTakeOverOutcomeCannotBeTakenOver`

- `type` (`'CANNOT_BE_TAKEN_OVER'`)

---

### Type: `AccountTakeOverOutcomeCanBeTakenOver`

- `type` (`'CAN_BE_TAKEN_OVER'`)
- `description` (`Sentence<WalletNameStrings>`)

---

### Type: `AccountTakeOverOutcome`

```typescript
type AccountTakeOverOutcome =
	| AccountTakeOverOutcomeCannotBeTakenOver
	| AccountTakeOverOutcomeCanBeTakenOver
```

---

### Type: `GuardianScenarioOutcome<S extends GuardianScenarioType>`

```typescript
type GuardianScenarioOutcome<S extends GuardianScenarioType> = {
	scenario: GuardianScenario<S>
	outcomeId: string
	recovery: AccountRecoveryOutcome
	takeover: AccountTakeOverOutcome
} & (
	| {
			// Either account can be recovered and not taken over...
			recovery: AccountRecoveryOutcomeCanBeRecovered
			takeover: AccountTakeOverOutcomeCannotBeTakenOver
	  }
	// Or not, but then there must be a sentence explaining how to improve the situation.
	| ((
			| { recovery: AccountRecoveryOutcomeCannotBeRecovered }
			| { takeover: AccountTakeOverOutcomeCanBeTakenOver }
	  ) & {
			howToImprove: Sentence<WalletNameStrings>
	  })
)
```

---

## `src/schema/features/privacy/address-resolution.ts`

### Interface: `AddressResolution<ARS = Support<AddressResolutionData> | null>`

Which methods of address resolution a wallet supports.

- `nonChainSpecificEnsResolution` (`ARS`): Support for basic ENS lookups (ENS domain to non-chain-specific raw hex address). To test: type `donations.walletbeat.eth` in the send address field. If it resolves, it is supported.
- `chainSpecificAddressing` (object): Chain-specific address lookups.
  - `erc7828` (`ARS`): Address lookup through ERC-7828. To test: type `donations.walletbeat.eth@optimism.eth` in the send address field and check if it resolves.
  - `erc7831` (`ARS`): Address lookup through ERC-7831. To test: type `donations.walletbeat.eth:optimism:1` in the send address field and check if it resolves.

---

### Type: `AddressResolutionData`

How a wallet resolves addresses.

```typescript
type AddressResolutionData =
	| {
			/**
			 * The wallet reuses its own chain client provider to look up the
			 * necessary data, inheriting its privacy and verifiability properties.
			 * To test: open the browser devtools Network tab, trigger an ENS resolution,
			 * and verify that no requests are made to external ENS APIs, only to the
			 * wallet's configured RPC endpoint.
			 */
			medium: 'CHAIN_CLIENT'
	  }
	| {
			/**
			 * The wallet uses an external offchain provider to look up the necessary
			 * data.
			 * To test: open the browser devtools Network tab, trigger an ENS resolution,
			 * and check if requests are made to an external API (e.g. `api.ens.domains`).
			 * Determining the values below requires inspecting the wallet's source code
			 * or official documentation.
			 */
			medium: 'OFFCHAIN'

			/**
			 * Whether the external offchain provider's data is verified,
			 * for example through a light client.
			 * This is generally not visible in the UI — check the wallet's source code
			 * or privacy/security documentation to determine the correct value.
			 *   - `VERIFIABLE`: the wallet cross-checks the offchain result against
			 *     on-chain data or uses a light client to verify it.
			 *   - `NOT_VERIFIABLE`: the wallet trusts the offchain provider's response as-is.
			 */
			offchainDataVerifiability: 'VERIFIABLE' | 'NOT_VERIFIABLE'

			/**
			 * Whether the wallet directly connects to the external offchain
			 * provider (thereby revealing information about who is doing the
			 * lookup), or using anonymizing proxies to do so.
			 * To test: monitor outbound network requests during ENS resolution. If requests
			 * go directly to an external ENS API from the user's IP, use `DIRECT_CONNECTION`.
			 * `UNIQUE_PROXY_CIRCUIT` requires source code or documentation confirming the
			 * wallet routes lookups through anonymizing proxies.
			 */
			offchainProviderConnection: 'DIRECT_CONNECTION' | 'UNIQUE_PROXY_CIRCUIT'
	  }
```

---

## `src/schema/features/privacy/app-isolation.ts`

### Enum: `ExposedAccountsBehavior`

What set of accounts the wallet presents as the default selection in the connection approval UI.

Note: these values describe the wallet's default _selection_ shown to the user before they approve the connection, not necessarily what `eth_accounts` returns. The actual `eth_accounts` result follows whatever the user chose in that dialog.

To identify: use the Walletbeat test page (https://beta.walletbeat.eth.limo/test/) which calls `eth_accounts` after connecting and shows how many accounts are returned.

- `ALL_ACCOUNTS` = `'ALL_ACCOUNTS'`: The wallet exposes all user accounts to every connected app. (e.g. `eth_accounts` returns three addresses even though only one is active.) To identify: connect the wallet to an app while having multiple accounts set up, then call `eth_accounts` — all accounts are returned, not just the active one.
- `ACTIVE_ACCOUNT_ONLY` = `'ACTIVE_ACCOUNT_ONLY'`: The wallet exposes only the currently active/selected account. (e.g. `eth_accounts` returns a single address — whichever account is selected in the wallet at that moment.) To identify: switch accounts in the wallet and call `eth_accounts` from an app — only one address is returned and it matches the currently active account.
- `NO_DEFAULT` = `'NO_DEFAULT'`: There is no default set of exposed accounts; the user must explicitly choose which account(s) to share during the connection flow. (e.g. The wallet shows an account picker every time a new app requests access, with no account pre-selected.) To identify: on a freshly loaded app that has never been connected before, call `eth_accounts` before initiating a connect — it returns an empty array. During the connect flow the wallet prompts the user to choose which account to expose.
- `APP_SPECIFIC_ACCOUNT` = `'APP_SPECIFIC_ACCOUNT'`: The wallet exposes a different address per app/origin, derived specifically for that app, so apps cannot correlate activity across sites. (e.g. app.uniswap.org sees address 0xAAA, app.aave.com sees address 0xBBB, even though they both belong to the same user.) To identify: connect the wallet to two different apps and compare the addresses returned by `eth_accounts` — they should differ even for the same underlying account.

---

### Interface: `ExposedAccountSet`

Set of exposed accounts.

- `defaultBehavior` (`ExposedAccountsBehavior`): What set of accounts is exposed by default, without any extra configuration? See `ExposedAccountsBehavior` for how to identify the correct value.

---

### Type: `AppIsolation`

How the wallet isolates apps from getting data that other apps may also gather.

```typescript
type AppIsolation =
	| typeof appConnectionNotSupported
	| (BaseAppIsolation &
			// Either `eth_accounts` or `wallet_connect` must be supported.
			(| { ethAccounts: Supported<WithRef<ExposedAccountSet>> }
				| { erc7846WalletConnect: Supported<WithRef<ExposedAccountSet>> }
			))
```

---

## `src/schema/features/privacy/data-collection.ts`

### Enum: `CollectionPolicy`

An enum representing when data collection occurs.

Values are comparable as integers; the closest to zero, the more privacy.

- `NEVER` = `0`: The data is never collected.
- `OPT_IN` = `1`: The wallet does not collect this data by default. The user may decide to enable to this, but this requires explicit user intent to do this.
- `PROMPTED` = `2`: The wallet does not collect this data by default. However, the wallet will at some point (e.g. during wallet setup) actively ask the user whether or not they want to enable this data collection, without explicit user intent to look for this setting.
- `BY_DEFAULT` = `3`: The data is collected by default, but the user may turn this off by configuring the wallet appropriately. Doing so requires explicit user intent and knowledge that there is an option to do this in the first place. In order to qualify for this level, it must be possible for the user to access this setting and turn off the collection _before_ the first time it happens. For example, a wallet that refreshes crypto prices by default (using an external service) and does so before ever giving the user a chance to access the wallet settings to turn off this feature does not qualify for this level.
- `ALWAYS` = `4`: The data is always collected no matter what the user does.

---

### Enum: `MultiAddressPolicy`

How a wallet approaches fetching data for multiple addresses.

- `ACTIVE_ADDRESS_ONLY` = `'ACTIVE_ADDRESS_ONLY'`: If the wallet only handles one active account at a time, and never fetches data about other accounts unless the user actively decides to switch account. In this scenario, the wallet may support multiple addresses, but from a network correlation perspective, these multiple addresses are not correlatable on a timing basis.

  NOTE 1: Wallets that support multiple accounts often have an "account switcher" view which may refresh all addresses' balance at the same time. If so, this counts as SIMULTANEOUS, since the N requests happen simultaneously when the user opens this switcher.

  NOTE 2: Wallets using stealth addresses need to handle multiple addresses even for a single logical user account. For such wallets, the concept of "active address" does not make sense, since accounts are abstracted from addresses, and it is critical for such wallets to not allow correlation of the multiple addresses that belong to the same account or user.

- `SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES` = `'SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES'`: If the wallet supports multiple addresses and fetches data for all of them in the same request (bearing all the addresses within).
- `SEPARATE_REQUEST_PER_ADDRESS` = `'SEPARATE_REQUEST_PER_ADDRESS'`: If the wallet supports multiple addresses and fetches data for all of them in separate requests (one per address).

---

### Type: `MultiAddressHandling`

How the wallet handles refreshing data for multiple addresses. This can either be by sending a single request containing all addresses at once, or multiple requests (one per address). Wallets typically need data about multiple addresses at once in the context of refreshing balances, or handling a set of stealth addresses. In either case, there is a risk of allowing external services to correlate these addresses together if the requests are not done carefully.

If sending multiple requests, the wallet has additional control over how to proxy connections or whether to stagger requests in order to reduce correlatability of the addresses.

If the wallet has configuration settings related to this, the setting it should be judged by is the one that applies by default once a second address is added.

```typescript
type MultiAddressHandling =
	| {
			/** How the wallet handles refreshing data for multiple addresses. */
			type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY
	  }
	| {
			/** How the wallet handles refreshing data for multiple addresses. */
			type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES
	  }
	| {
			/** How the wallet handles refreshing data for multiple addresses. */
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS

			/**
			 * Diversity of endpoints on the receiving end of the requests.
			 * Is it always the same set of endpoints for all addresses, or is there
			 * a pool of multiple endpoints such that each address is only mapped to
			 * one of them?
			 */
			destination: 'SAME_FOR_ALL' | 'ISOLATED'

			/**
			 * How individual requests are proxied: separate circuits (such that they
			 * are perceived as coming from different IPs on the destination endpoint),
			 * same circuit (same IP perceived on the destination endpoint), or not
			 * proxied at all?
			 */
			proxy: 'NONE' | 'SAME_CIRCUIT' | 'SEPARATE_CIRCUITS'

			/**
			 * Whether individual requests are staggered across time to reduce the
			 * ease of correlating them by the destination endpoint.
			 *
			 * - SIMULTANEOUS: If the wallet makes N simultaneous requests for N
			 *   addresses at the same time.
			 * - STAGGERED: If the wallet staggers N requests for N addresses
			 *   over a period of time (e.g. by waiting a minute between each
			 *   request).
			 */
			timing: 'SIMULTANEOUS' | 'STAGGERED'
	  }
```

---

### Type: `Endpoint`

The environment in which the server endpoint is running. A server can either be running as a regular server (`RegularEndpoint`), or in a secure enclave which potentially gives it more privacy properties.

```typescript
type Endpoint =
	| typeof RegularEndpoint
	| {
			/**
			 * The server is running in a secure enclave.
			 */
			type: 'SECURE_ENCLAVE'

			/**
			 * Whether the software running within the enclave is verifiable
			 * by the client.
			 */
			verifiability: WithRef<{
				/**
				 * Whether the source code of the server software is available.
				 */
				sourceAvailable: boolean

				/**
				 * Whether the source code of the server software can be reproducibly
				 * built.
				 */
				reproducibleBuilds: boolean

				/**
				 * How the client verifies that the endpoint is running in a secure enclave.
				 */
				clientVerification:
					| {
							/** The client does not do any verification. */
							type: 'NOT_VERIFIED'
					  }
					| {
							/**
							 * The client claims to verify but has not made the source code that
							 * does this available.
							 */
							type: 'VERIFIED_BUT_NO_SOURCE_AVAILABLE'
					  }
					| MustRef<{
							/**
							 * The client verifies this. Must also come with a code reference.
							 */
							type: 'VERIFIED'
					  }>
			}>

			/**
			 * Whether the endpoint running in a secure enclave logs anything
			 * outside of the enclave, thereby removing the privacy advantage
			 * of enclaves.
			 */
			externalLogging:
				| {
						/**
						 * It is not known whether the software running within the enclave
						 * logs any data externally.
						 */
						type: 'UNKNOWN'
				  }
				| {
						/**
						 * This server software is known to log data externally to the
						 * enclave.
						 */
						type: 'YES'
				  }
				| {
						/**
						 * This server software does not log data externally to the
						 * enclave.
						 */
						type: 'NO'
				  }

			/**
			 * Info about the use of end-to-end encryption to the endpoint.
			 * In most cases, this means where does the TLS handshake happens?
			 * If this does not happen within the enclave (such as if terminated
			 * at the load balancer level), then the connection is susceptible to
			 * be man-in-the-middle'd.
			 */
			endToEndEncryption:
				| {
						/** No end-to-end encryption (really? in this day and age?) */
						type: 'NONE'
				  }
				| {
						/**
						 * End-to-end encryption terminated outside of the enclave,
						 * for example at the load balancer level.
						 */
						type: 'TERMINATED_OUT_OF_ENCLAVE'
				  }
				| {
						/** End-to-end encryption terminated inside the enclave. */
						type: 'TERMINATED_INSIDE_ENCLAVE'
				  }
	  }
```

---

### Enum: `PersonalInfo`

Personal information types.

- `IP_ADDRESS` = `'ipAddress'`: The user's IP address.
- `TRACKING_IDENTIFIER` = `'trackingIdentifier'`: A cross-request tracking identifier, such as a cookie.
- `PSEUDONYM` = `'pseudonym'`: The user's selected pseudonym.
- `LEGAL_NAME` = `'legalName'`: The user's legal name.
- `EMAIL` = `'email'`: The user's email.
- `PHONE` = `'phone'`: The user's phone number.
- `BROWSING_HISTORY_URLS` = `'browsingHistoryUrls'`: URLs the user visits.
- `CONTACTS` = `'contacts'`: The user's contacts (e.g. when searching for friends to invite).
- `PHYSICAL_ADDRESS` = `'physicalAddress'`: The user's physical address.
- `FACE` = `'face'`: The user's face (e.g. KYC selfie).
- `CEX_ACCOUNT` = `'cexAccount'`: The user's CEX account(s).
- `GOVERNMENT_ID` = `'governmentId'`: The user's government-issued ID.
- `X_DOT_COM_ACCOUNT` = `'xDotComAccount'`: The user's X.com account.
- `FARCASTER_ACCOUNT` = `'farcasterAccount'`: The user's Farcaster account.

---

### Enum: `WalletInfo`

Wallet-related information types.

- `USER_ACTIONS` = `'userActions'`: The user's wallet actions (clicks etc).
- `ACCOUNT_ADDRESS` = `'accountAddress'`: The user's account address.
- `BALANCE` = `'balance'`: The user's wallet balance. This can easily be turned back into an address, because most addresses' balance amount is unique.
- `ASSETS` = `'assets'`: The set of assets that are in the wallet. On wallets with many NFTs, this can be used to uniquely identify the wallet.
- `MEMPOOL_TRANSACTIONS` = `'mempoolTransactions'`: The user's wallet transactions before they are included onchain. For example, MEV protection services usually fall under this category.
- `WALLET_CONNECTED_DOMAINS` = `'walletConnectedDomains'`: Domain names the wallet is connected to.

---

### Type: `UserInfo`

```typescript
type UserInfo = PersonalInfo | WalletInfo
```

---

### Enum: `UserInfoType`

The type of information that a UserInfo is about.

- `WALLET_RELATED` = `'walletRelated'`: Data related to the user's wallet.
- `PERSONAL_DATA` = `'personalData'`: Data related to the user themselves.

---

### Enum: `UserFlow`

The UX flow within a wallet.

- `UNCLASSIFIED` = `'unclassified'`: Any flow that is unclassified or unclear.
- `ONBOARDING` = `'onboarding'`: Onboard onto the wallet, either as a new user or importing an existing account.
- `SEND` = `'send'`: Sending tokens to another address.
- `NATIVE_SWAP` = `'nativeSwap'`: Swapping tokens through a wallet's built-in swap feature.
- `TRANSACTION` = `'transaction'`: Review a transaction and signing it.
- `APP_CONNECTION` = `'appConnection'`: Connecting to an application.

---

### Enum: `DataCollectionPurpose`

Why is data being collected?

- `UPDATE_CHECKING` = `'UPDATE_CHECKING'`: Checking for updates to the wallet.
- `CHAIN_DATA_LOOKUP` = `'CHAIN_DATA_LOOKUP'`: Looking up chain data (read only).
- `TRANSACTION_BROADCAST` = `'TRANSACTION_BROADCAST'`: Broadcasting transactions for inclusion.
- `TRANSACTION_SIMULATION` = `'TRANSACTION_SIMULATION'`: Simulating transaction outcome.
- `SWAP_QUOTE` = `'SWAP_QUOTE'`: Getting a quote for a swap operation.
- `SCAM_DETECTION` = `'SCAM_DETECTION'`: Checking for scams.
- `ACCOUNT_SIGNUP` = `'ACCOUNT_SIGNUP'`: Signing up for a wallet-related account.
- `EXTERNAL_ACCOUNT_LINKING` = `'EXTERNAL_ACCOUNT_LINKING'`: Linking to an external (non-wallet-related) account, e.g. CEX account.
- `ASSET_METADATA` = `'ASSET_METADATA'`: Looking up asset metadata (price, icon, ticker, NFT data).
- `IDENTITY_VERIFICATION` = `'IDENTITY_VERIFICATION'`: Verifying the wallet user's identity.
- `STATIC_ASSETS` = `'STATIC_ASSETS'`: Downloading static assets (images, CSS).
- `ANALYTICS` = `'ANALYTICS'`: Wallet user analytics.

---

### Type: `Collection<T extends UserInfo>`

What data is collection by an entity; must have at least one piece of user information.

```typescript
type Collection<T extends UserInfo> = NonEmptyRecord<T, CollectionPolicy> & {
	/**
	 * How multiple addresses are handled, if at all.
	 */
	multiAddress?: MultiAddressHandling
}
```

---

### Type: `PersonalInfoCollection`

A partially-known set of personal info collected, with reference information.

```typescript
type PersonalInfoCollection = Collection<PersonalInfo>
```

---

### Type: `EndpointCollection`

A partially-known set of collected info, with reference information.

```typescript
type EndpointCollection = WithEndpoint<Collection<UserInfo>>
```

---

### Type: `QualifiedDataCollection`

What data is collected by an entity; fully qualified.

```typescript
type QualifiedDataCollection = Record<UserInfo, CollectionPolicy> & {
	/**
	 * How multiple addresses are handled, if at all.
	 */
	multiAddress?: MultiAddressHandling
}
```

---

### Interface: `DataCollectionByEntity`

Describes the data that an entity may be sent.

- `byEntity` (`Entity`): The entity to which the data may be sent.
- `dataCollection` (`EndpointCollection`): The type of data that an entity may be sent.
- `purposes` (`NonEmptyArray<DataCollectionPurpose>`): Why is the data collected?

---

### Interface: `DataCollectionForFlow`

- `collected` (`WithRef<DataCollectionByEntity>[]`): The data collected by entities.

---

### Type: `DataCollectionForFlowWithOnchainData`

```typescript
type DataCollectionForFlowWithOnchainData = DataCollectionForFlow & {
	/** Personal data published onchain in public view. */
	publishedOnchain:
		| 'NO_DATA_PUBLISHED_ONCHAIN'
		| WithRef<
				PersonalInfoCollection & {
					/** Why is the onchain data published? */
					purposes: NonEmptyArray<DataCollectionPurpose>
				}
		  >
}
```

---

### Interface: `DataCollection`

A collection of data that a wallet collects. See /docs/mitmproxy-guide for how to collect this.

- `[UserFlow.ONBOARDING]` (`DataCollectionForFlowWithOnchainData | null`): What data is collected during signup?
- `[UserFlow.SEND]` (`DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'`): What data is collected when sending tokens?
- `[UserFlow.NATIVE_SWAP]` (`DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'`): What data is collected when swapping tokens using the wallet's native swap feature?
- `[UserFlow.TRANSACTION]` (`DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'`): What data is collected during the transaction review/signing flow?
- `[UserFlow.APP_CONNECTION]` (`DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'`): What data is collected when connecting to an app?
- `[UserFlow.UNCLASSIFIED]` (`DataCollectionForFlow`, optional): What other data is collected but not covered in the other flows, if any?

---

## `src/schema/features/privacy/hardware-privacy.ts`

### Enum: `HardwarePrivacyType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `HardwarePrivacySupport`

- `type` (`HardwarePrivacyType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `phoningHome` (`HardwarePrivacyType`)
- `inspectableRemoteCalls` (`HardwarePrivacyType`)
- `wirelessPrivacy` (`HardwarePrivacyType`)

---

### Type: `HardwarePrivacyImplementation`

```typescript
type HardwarePrivacyImplementation = WithRef<HardwarePrivacySupport>
```

---

## `src/schema/features/privacy/transaction-privacy.ts`

### Enum: `PrivateTransferTechnology`

- `STEALTH_ADDRESSES` = `'stealthAddresses'`
- `TORNADO_CASH_NOVA` = `'tornadoCashNova'`
- `PRIVACY_POOLS` = `'privacyPools'`
- `RAILGUN` = `'railgun'`

---

### Type: `FungibleTokenTransferMode`

```typescript
type FungibleTokenTransferMode =
	| 'EXPLICIT_CHOICE'

	/**
	 * Tokens are sent in a public token transaction,
	 * revealing both sender and recipient.
	 */
	| 'PUBLIC'

	/**
	 * Tokens are sent using a specific private transfer technology.
	 */
	| PrivateTransferTechnology
```

---

### Type: `TransactionPrivacy`

Support for various types of transactional privacy.

```typescript
type TransactionPrivacy = {
	/**
	 * When sending Ether or ERC-20, which transfer mode is the default?
	 * If the wallet uses a different mode for transfers of Ether vs ERC-20
	 * tokens, this field should be set to the least private of the two.
	 */
	defaultFungibleTokenTransferMode: FungibleTokenTransferMode

	/** Support for stealth addresses. */
	[PrivateTransferTechnology.STEALTH_ADDRESSES]: Support<StealthAddressSupport>

	/** Support for Tornado Cash Nova. */
	[PrivateTransferTechnology.TORNADO_CASH_NOVA]: Support<TornadoCashNovaSupport>

	/** Support for Privacy Pools. */
	[PrivateTransferTechnology.PRIVACY_POOLS]: Support<PrivacyPoolsSupport>

	/** Support for Railgun. */
	[PrivateTransferTechnology.RAILGUN]: Support<RailgunSupport>
} & IfDefaultTransferMode<
	PrivateTransferTechnology.STEALTH_ADDRESSES,
	{
		[PrivateTransferTechnology.STEALTH_ADDRESSES]: Supported<StealthAddressSupport>
	}
> &
	IfDefaultTransferMode<
		PrivateTransferTechnology.TORNADO_CASH_NOVA,
		{
			[PrivateTransferTechnology.TORNADO_CASH_NOVA]: Supported<TornadoCashNovaSupport>
		}
	> &
	IfDefaultTransferMode<
		PrivateTransferTechnology.PRIVACY_POOLS,
		{
			[PrivateTransferTechnology.PRIVACY_POOLS]: Supported<PrivacyPoolsSupport>
		}
	> &
	IfDefaultTransferMode<
		PrivateTransferTechnology.RAILGUN,
		{
			[PrivateTransferTechnology.RAILGUN]: Supported<RailgunSupport>
		}
	>
```

---

### Type: `StealthAddressSupport`

Support for ERC-5564 stealth addresses.

```typescript
type StealthAddressSupport = WithRef<{
	/**
	 * When sending funds to a stealth meta-address, how is the resolution of
	 * that stealth meta-address to a specific stealth address done?
	 * (ERC-5564: `generateStealthAddress`)
	 */
	recipientAddressResolution: WithRef<
		| {
				/**
				 * Resolution is done exclusively with the default chain provider,
				 * inheriting its privacy properties (or lack thereof).
				 */
				type: 'DEFAULT_CHAIN_PROVIDER'
		  }
		| {
				/**
				 * Resolution is done exclusively with a specific external provider.
				 */
				type: 'EXTERNAL_RESOLVER'

				/** The external resolver that does the resolution. */
				externalResolver: Entity

				/** What does this external resolver learn? */
				learns: {
					senderIpAddress: boolean
					senderMetaAddress: boolean
					recipientMetaAddress: boolean
					recipientGeneratedStealthAddress: boolean
				}
		  }
	>

	/**
	 * When a user wants to look at the funds they own across their stealth
	 * addresses, how is this lookup done?
	 */
	balanceLookup: WithRef<
		| {
				/**
				 * Resolution is done exclusively with the default chain provider,
				 * inheriting its privacy properties (or lack thereof).
				 */
				type: 'DEFAULT_CHAIN_PROVIDER'

				/**
				 * How requests for multiple stealth addresses are handled.
				 * Cannot be "ACTIVE_ADDRESS_ONLY" because stealth addresses mean
				 * there are inherently multiple effective active addresses.
				 */
				multiAddressHandling: Exclude<
					MultiAddressHandling,
					{ type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY }
				>
		  }
		| {
				type: 'EXTERNAL_SERVICE'

				/** The external service that does the balance lookup. */
				externalService: Entity

				/** What does this external service learn? */
				learns: {
					/** The user's stealth meta-address. */
					userMetaAddress: boolean

					/** The user's generated stealth addresses. */
					generatedStealthAddresses: boolean
				}
		  }
	>

	/**
	 * When needing to spend funds from stealth addresses, how does the owner
	 * derive the private key for each stealth address?
	 * (ERC-5564: `computeStealthKey`)
	 */
	privateKeyDerivation: WithRef<
		| {
				/** The wallet calls `computeStealthKey` with the chain RPC provider. */
				type: 'DEFAULT_CHAIN_PROVIDER'
		  }
		| {
				/** An external service provides private key data to the wallet. */
				type: 'EXTERNAL_SERVICE'

				/** The external service that provides this. */
				externalService: Entity
		  }
		| {
				/** Private key derivation is done locally. */
				type: 'LOCALLY'
		  }
	>

	/**
	 * Can the user label their stealth addresses into distinct buckets, such
	 * that two addresses from different buckets may never appear in the same
	 * transaction?
	 */
	userLabeling: Support<
		WithRef<{
			/**
			 * When funds are received to a new unlabeled address, and the user
			 * attempts to spend from it, what happens?
			 */
			unlabeledBehavior: StealthAddressUnlabeledBehavior
		}>
	>

	/** When sending transactions, how are fees displayed? */
	fees: FeeDisplay
}>
```

---

### Enum: `StealthAddressUnlabeledBehavior`

When funds are received to a new unlabeled address, and the user attempts to spend from it, what happens?

- `TREAT_ALL_UNLABELED_AS_SINGLE_BUCKET` = `'TREAT_ALL_UNLABELED_AS_SINGLE_BUCKET'`: All unlabeled addresses are treated as a single bucket to spend from.
- `TREAT_EACH_UNLABELED_AS_OWN_BUCKET` = `'TREAT_EACH_UNLABELED_AS_OWN_BUCKET'`: Each unlabeled address is treated as its own bucket.
- `MUST_LABEL_BEFORE_SPENDING` = `'MUST_LABEL_BEFORE_SPENDING'`: Users cannot spend from unlabeled addresses; must label them first.

---

### Type: `TornadoCashNovaSupport`

Support data for Tornado Cash Nova.

```typescript
type TornadoCashNovaSupport = WithRef<
	{
		/**
		 * Does the wallet support in-pool transfers (no withdrawal needed)?
		 */
		novaInternalTransfers: Support

		/**
		 * Does the wallet warn when doing multiple Tornado Cash Nova operations
		 * in quick succession, potentially leading to time-based correlation?
		 */
		warnAboutSuccessiveOperations: Support

		/**
		 * When scanning for a user's UTXOs, are they filtered entirely on the
		 * user's device, or are they filtered by an external service?
		 */
		utxoFiltering: 'ON_USER_DEVICE' | 'EXTERNAL'

		/**
		 * Is the fee taken by the relayer displayed in the UI?
		 */
		relayerFee: FeeDisplay
	} & (
		| {
				/**
				 * The wallet integrates with Tornado Cash Nova directly.
				 * Requests that require a relayer go through the relayer directly.
				 */
				integrationType: 'DIRECT'

				/**
				 * Can the relayer endpoint be customized?
				 */
				customizableRelayer: Support

				/**
				 * Can the relayer learn the user's IP address?
				 */
				relayerLearnsUserIpAddress: boolean
		  }
		| {
				/**
				 * The wallet integrates with Tornado Cash Nova by going through some
				 * central service that is the one actually interacting with Tornado Cash.
				 */
				integrationType: 'THROUGH_ENTITY'

				/**
				 * The entity doing the interaction with Tornado Cash Nova.
				 */
				entity: Entity

				/**
				 * Does the entity learn the user's UTXOs?
				 */
				entityLearnsUserUtxos: boolean

				/**
				 * Does the entity learn the user's IP address?
				 */
				entityLearnsUserIpAddress: boolean
		  }
	)
>
```

---

### Type: `PrivacyPoolsSupport`

Support data for Privacy Pools.

```typescript
type PrivacyPoolsSupport = WithRef<{
	/** What subset of the protocol does the wallet support? */
	capabilities: PrivacyPoolsCapabilities

	/**
	 * How is deposit data handled?
	 */
	depositData: PrivacyPoolsDepositData
}>
```

---

### Type: `RailgunSupport`

Support data for Railgun.

```typescript
type RailgunSupport = WithRef<{
	/**
	 * Does the wallet support private transfers between Railgun wallets?
	 */
	privateTransfers: Support

	/**
	 * Does the wallet support cross-contract calls (private DeFi interactions)?
	 */
	crossContractCalls: Support

	/**
	 * Does the wallet warn when doing multiple Railgun operations
	 * in quick succession, potentially leading to time-based correlation?
	 */
	warnAboutSuccessiveOperations: Support

	/**
	 * Does the wallet warn users about correlation risks when shielding tokens?
	 * Shielding transactions are public on-chain and can be analyzed to link
	 * a user's 0x address to their 0zk address through amount, timing, and token
	 * type correlation. Similar to how Privacy Pools tracks deposit correlation risks.
	 */
	warnAboutShieldingCorrelation: Support

	/**
	 * Does the wallet warn users when unshielding to addresses associated with
	 * their wallet? Unshielding to addresses that belong to the same wallet creates
	 * a correlation link between the user's 0zk and 0x addresses, compromising privacy.
	 */
	warnAboutUnshieldingDestinationCorrelation: Support

	/**
	 * Does the wallet warn users about the privacy risks of sharing viewing keys?
	 * Viewing keys are encoded in 0zk addresses and are irrevocable. Anyone with
	 * access to a viewing key can see all private interactions sent by that address
	 * permanently, even if the key is later shared or leaked.
	 */
	warnAboutViewingKeySharing: Support

	/**
	 * When scanning for received funds, is the Railgun UTXO merkle tree synced
	 * and decrypted entirely on the user's device, or is it synced
	 * by an external service? This matters for privacy: if syncing is done
	 * server-side, the external provider can learn about received funds even
	 * though the chain data itself doesn't reveal this information.
	 */
	merkleTreeSync: 'ON_USER_DEVICE' | 'EXTERNAL'

	/**
	 * Does the wallet support broadcaster-based transaction submission?
	 * Broadcasters are required for transactions FROM shielded addresses
	 * (private transfers, unshielding), but NOT for shielding (depositing into Railgun).
	 */
	broadcasterBasedTransactionSubmission: Support<BroadcasterBasedTransactionSubmissionData>

	/**
	 * Does the wallet support self-relayed transaction submission?
	 * Self-relay exposes IP address and should be avoided for privacy.
	 */
	selfRelayedTransactionSubmission: Support
}> &
	RailgunTransactionSubmissionMethods
```

---

## `src/schema/features/profile.ts`

### Enum: `WalletProfile`

A profile for a wallet. This should roughly describe the intended use-cases and audience for a wallet. It is used to determine which features matter for a wallet, and which attributes it may be exempt from because they do not matter for users of this type of wallet.

A profile is **not** something like "web browser wallet" or "mobile wallet"; those are "variants". A single wallet may have multiple variants, i.e. it can have a desktop version, a mobile version, a browser version, and so on.

A profile is about the intended audience of the wallet, not about the platform it runs on.

- `GENERIC` = `'GENERIC'`: A generic wallet is not of any specific type.
- `PAYMENTS` = `'PAYMENTS'`: A payments-focused wallet. Focused on sending and receiving money. Not arbitrary transactions.

---

### Enum: `HardwareWalletManufactureType`

The type of hardware wallet manufacturing.

- `FACTORY_MADE` = `'FACTORY_MADE'`: A factory-made hardware wallet is manufactured by a company Examples include Ledger, Trezor, GridPlus, and Keystone.
- `DIY` = `'DIY'`: A DIY hardware wallet is assembled by the user themselves Examples include self-assembled devices using open source hardware designs.

---

### Interface: `HardwareWalletModel`

Interface for a hardware wallet model/device

- `id` (`string`): Unique identifier for this model
- `name` (`string`): Display name of the hardware wallet model
- `url` (`string`): URL to the product page
- `isFlagship` (`boolean`): Whether this model is the flagship product The flagship will be displayed by default when viewing wallet details

---

## `src/schema/features/security/account-recovery.ts`

### Enum: `GuardianType`

The type of a single guardian.

Most guardian types cannot be verified through hands-on testing alone — the wallet's official security/recovery documentation and source code are the primary sources.

- `SELF_CUSTODY` = `'SELF_CUSTODY'`: A self-custodied private key held by the user (outside this wallet). (i.e. The wallet lets the user designate another wallet or a separately-stored seed phrase as a recovery guardian.) To identify: look for a recovery option that asks the user to sign with an existing private key they already control, rather than creating a new one.
- `WALLET_PASSWORD` = `'WALLET_PASSWORD'`: The wallet's own login/encryption password, distinct from the seed phrase. (i.e. The wallet encrypts a recovery payload using the wallet password, so knowing the password is required to decrypt and recover.) To identify: the recovery documentation states that the wallet password is a required input for decrypting the recovery backup.
- `WALLET_PROVIDER` = `'WALLET_PROVIDER'`: A service operated by the wallet developer that holds a key share or recovery material on behalf of the user. To identify: the wallet's architecture documentation describes a server-side component that holds cryptographic material needed for recovery.
- `USER_EXTERNAL_ACCOUNT` = `'USER_EXTERNAL_ACCOUNT'`: An external account owned by the user but unrelated to this wallet. (e.g. A Google account, Apple ID, email address, or a separate Ethereum address that the user designates as a recovery guardian.) To identify: visible in the recovery setup UI — the wallet asks the user to link or sign in with an external account to enable recovery.
- `PASSKEY` = `'PASSKEY'`: A passkey (device-bound or synced) used as a guardian. (e.g. The user's Face ID / Touch ID passkey stored in their device's secure enclave or a platform passkey manager.) To identify: the recovery setup UI offers a passkey/biometric registration step. Check if the passkey is device-bound or synced across devices.
- `ZKID` = `'ZKID'`: A zero-knowledge identity proof (e.g. zkPassport, Anon Aadhaar). To identify: the wallet documentation or recovery UI mentions a ZK-based identity scheme by name. Requires inspecting the source code or audits to confirm the specific scheme used.

---

### Interface: `GuardianWalletPassword`

A single guardian represented by a wallet password.

- `type` (`GuardianType.WALLET_PASSWORD`)

---

### Interface: `GuardianSelfCustody`

A single guardian represented by a self-custodied private key.

- `type` (`GuardianType.SELF_CUSTODY`)

---

### Interface: `GuardianWalletProviderService`

A single guardian represented by a service provided by the wallet developer.

- `type` (`GuardianType.WALLET_PROVIDER`)
- `entity` (`WalletDeveloper`)
- `description` (`string`)

---

### Interface: `GuardianUserExternalAccount`

A single guardian represented by an account owned by the user, unrelated to the wallet.

- `type` (`GuardianType.USER_EXTERNAL_ACCOUNT`)
- `entity` (`Exclude<Entity, WalletDeveloper>`)
- `description` (`string`)

---

### Interface: `GuardianPasskey`

A single guardian represented by a private key stored as a passkey.

- `type` (`GuardianType.PASSKEY`)

---

### Interface: `GuardianZKID`

A single guardian represented by a ZK ID scheme (zkPassport, Anon Aadhaar, etc.) .

- `type` (`GuardianType.ZKID`)
- `id` (`string`)
- `description` (`string`)

---

### Type: `Guardian`

A single guardian within a broader multi-guardian setup.

```typescript
type Guardian =
	| GuardianSelfCustody
	| GuardianWalletPassword
	| GuardianWalletProviderService
	| GuardianUserExternalAccount
	| GuardianPasskey
	| GuardianZKID
```

---

### Enum: `GuardianPolicyType`

Type of guardian configuration.

This is not a comprehensive list — if a wallet uses a recovery scheme that doesn't fit any of these types, a new enum value should be added rather than forcing it into an existing one.

To identify: read the wallet's recovery documentation or security audit. Look for keywords — "secret sharing", "MPC", "Shamir" indicate SECRET_SPLIT; "approve", "guardians", "timelock", "waiting period" indicate K_OF_N_WITH_TIMELOCK.

- `SECRET_SPLIT_ACROSS_GUARDIANS` = `'SECRET_SPLIT_ACROSS_GUARDIANS'`: A recovery secret (seed phrase or equivalent cryptographic material) is split into shares using a scheme like Shamir's Secret Sharing or MPC, and each share is distributed to a different guardian. Recovery requires collecting enough shares to reconstruct the secret.

  To identify: the wallet documentation mentions "key splitting", "MPC", "Shamir", or describes that recovery involves multiple parties each contributing a fragment of the key. Source code inspection can confirm.

- `K_OF_N_WITH_TIMELOCK` = `'K_OF_N_WITH_TIMELOCK'`: K out of N designated guardians must approve a recovery request, subject to a timelock delay that lets the legitimate owner cancel it. (e.g. The user sets up 3 guardians and requires 2 approvals, with a 3-day waiting period during which the owner can cancel a malicious recovery.) To identify: the wallet documentation describes "X of Y guardians must approve" and a "waiting period" or "timelock". Check the recovery smart contract for the actual threshold and delay values.

---

### Type: `GuardianPolicySecretSplitAcrossGuardians`

A single specific configuration of guardians requiring K of N signatures to perform a recovery action under a timelock.

```typescript
type GuardianPolicySecretSplitAcrossGuardians = GuardianPolicyBase & {
	type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS

	/**
	 * Which guardians are **required** to participate — without them,
	 * recovery is cryptographically impossible regardless of other guardians.
	 * (e.g. If a wallet provider's server holds one required share and that
	 * service goes offline, the user cannot recover even with all optional
	 * guardians present.)
	 * To identify: determine which parties hold shares that cannot be
	 * substituted. A wallet provider holding the sole copy of a required
	 * share is a required guardian. Check the security documentation or
	 * source code for single points of failure in the recovery scheme.
	 */
	requiredGuardians: Guardian[]

	/**
	 * Which guardians the user can optionally configure; some minimum number
	 * of these must cooperate for recovery to succeed.
	 * To identify: the recovery setup UI lists these as choices (e.g.
	 * "Set up recovery with Google and/or Apple").
	 */
	optionalGuardians: Guardian[]

	/**
	 * Minimum number of optional guardians the user must configure during setup.
	 * (e.g. `1` means the user must set up at least one optional guardian,
	 * but they choose which one(s).)
	 * To identify: go through the recovery setup flow and note how many
	 * optional guardians must be configured before setup is complete.
	 */
	optionalGuardiansMinimumConfigurable: number

	/**
	 * Minimum number of optional guardians that must cooperate at recovery time.
	 * May differ from `optionalGuardiansMinimumConfigurable` if the wallet
	 * requires setting up more guardians than strictly needed for recovery.
	 * To identify: check the recovery documentation for "how many guardians
	 * do you need to recover?" vs "how many must you configure?".
	 */
	optionalGuardiansMinimumNeededForRecovery: number

	/**
	 * Where is the secret reassembled from its shares?
	 * `CLIENT_SIDE`: the shares are combined entirely on the user's device;
	 * the full key never passes through / touches any server.
	 * An `Entity`: the shares are sent to that entity's infrastructure
	 * for server-side reconstruction.
	 * To identify: this is NOT visible in the UI — check the wallet's
	 * security documentation for explicit claims ("key never leaves your device"),
	 * or inspect the source code for where share combination occurs.
	 * Server-side reconstruction is typically visible as an API call that
	 * receives multiple shares and returns the full key or a derived secret.
	 * TODO: Once issue #503 is resolved, this field should capture whether
	 * the reconstruction is auditable/verifiable vs. opaque.
	 */
	secretReconstitution: 'CLIENT_SIDE' | Entity
}
```

---

### Type: `GuardianPolicyKOfNWithTimelocks`

A single specific configuration of guardians requiring K of N signatures to perform a recovery action under a timelock.

```typescript
type GuardianPolicyKOfNWithTimelocks = GuardianPolicyBase & {
	type: GuardianPolicyType.K_OF_N_WITH_TIMELOCK

	/**
	 * The full list of configured guardians, each with equal voting weight.
	 * To identify: check the wallet's recovery UI for the list of guardian
	 * types the user can designate (e.g. a hardware wallet, a trusted friend's
	 * address, or the wallet provider's service).
	 */
	configuredGuardians: NonEmptyArray<Guardian>

	/**
	 * Which guardians are **required** to approve — without their signature,
	 * recovery cannot proceed regardless of how many optional guardians sign.
	 * (e.g. The wallet provider must co-sign every recovery request.)
	 * To identify: check the recovery smart contract or documentation for
	 * any mandatory co-signer that cannot be removed or substituted.
	 */
	requiredGuardians: Guardian[]

	/**
	 * Which entities are responsible for notifying the user when a recovery
	 * request has been initiated (during the timelock period).
	 * (e.g. The wallet provider sends an email/push notification so the
	 * legitimate owner can cancel a malicious recovery attempt.)
	 * To identify: check the wallet's security documentation or the recovery
	 * smart contract for event listeners and notification infrastructure.
	 */
	timelockWarningSentByAllOf: NonEmptyArray<Entity>

	/**
	 * Minimum number of guardian signatures needed for a recovery that
	 * goes through the full timelock delay.
	 * To identify: check the recovery smart contract or documentation for
	 * the guardian threshold. This is the K in "K of N".
	 */
	minimumSignaturesWithTimelock: number

	/**
	 * Minimum number of guardian signatures needed to bypass the timelock
	 * and recover immediately (typically a higher threshold).
	 * To identify: check if the recovery contract supports an "emergency
	 * recovery" path with a higher guardian threshold that skips the delay.
	 * If no bypass exists, this value equals `minimumSignaturesWithTimelock`.
	 */
	minimumSignaturesBypassTimelock: number
}
```

---

### Type: `GuardianPolicy`

A single specific configuration of guardians.

```typescript
type GuardianPolicy = GuardianPolicySecretSplitAcrossGuardians | GuardianPolicyKOfNWithTimelocks
```

---

### Interface: `GuardianRecovery`

For wallets supporting social recovery (guardian-based), what policy does it use for the guardians?

- `minimumGuardianPolicy` (`GuardianPolicy`): The _minimum_ guardian policy the wallet requires the user to configure. "Minimum" means the least-effort setup the wallet allows — e.g. if the wallet lets the user configure just one optional guardian, that is the minimum even if more are possible. To identify: go through the wallet's recovery setup flow with the fewest possible steps and record the resulting guardian configuration.

---

### Interface: `AccountRecovery`

How the wallet makes it possible for the user to recover their account.

Note: account recovery features generally cannot be fully verified through hands-on testing without deliberately losing access to a wallet. Use the following approach instead:

1. Walk through the wallet's recovery/backup settings UI to see what options are presented to the user. 2. Read the wallet's official security or recovery documentation for the high-level policy (guardian types, thresholds, timelocks). 3. Inspect the wallet's source code or published security audits for technical details that are not visible in the UI (e.g. where the recovery secret is reconstituted, or smart contract thresholds).

- `guardianRecovery` (`Support<WithRef<GuardianRecovery>>`): If the wallet supports "social recovery" (guardian-based), what policy does it use for the guardians? To identify: look for a "Recovery", "Backup", or "Guardian" section in the wallet's security settings. If no such feature exists, set to not supported. If it exists, fill in `GuardianRecovery` using the wallet's documentation and source code as described above.

---

## `src/schema/features/security/bug-bounty-program.ts`

### Enum: `BugBountyPlatform`

Platforms that host bug bounty programs. To identify: look for a "Bug Bounty", "Security", or "Responsible Disclosure" link on the wallet's website. The platform is usually obvious from the URL Use SELF_HOSTED if the program is run directly on the wallet's own website with no external platform involved.

- `SELF_HOSTED` = `'Self-hosted'`
- `HACKER_ONE` = `'Hacker One'`
- `BUG_CROWD` = `'Bugcrowd'`
- `INTIGRITI` = `'Intigriti'`
- `IMMUNEFI` = `'Immunefi'`
- `BUGRAP` = `'Bugrap'`

---

### Enum: `LegalProtectionType`

Types of legal protection provided to security researchers.

Legal protections give researchers explicit assurance they won't be prosecuted or sued for good-faith work.

To identify: look for a "Legal" or "Safe Harbor" section on the bug bounty page, or in the wallet's Terms of Service or Security Policy.

- `SAFE_HARBOR` = `'SAFE_HARBOR'`: The wallet explicitly grants researchers a "Safe Harbor" — formal legal language stating that good-faith security research will not result in legal action, even if the research technically violated the ToS or computer fraud laws. Safe Harbor language typically waives relevant ToS restrictions and references a defined standard for "Good Faith Security Research". To identify: the bug bounty page or security policy has an explicit "Safe Harbor" heading or section using that exact term, with formal legal commitment language.
- `LEGAL_ASSURANCE` = `'LEGAL_ASSURANCE'`: The wallet provides a softer form of legal protection — a pledge or policy commitment not to pursue legal action against researchers acting in good faith, but without formal Safe Harbor legal language. (e.g. A statement like "We will not take legal action against researchers who follow our responsible disclosure guidelines" without referencing Safe Harbor specifically.) To identify: the bug bounty page has a promise not to sue researchers, but does not use formal "Safe Harbor" language or a dedicated legal section. Use SAFE_HARBOR instead if the page explicitly uses that term.

---

### Type: `AtLeastOneCoverageBreadth`

A set of at least one coverage breadth

```typescript
type AtLeastOneCoverageBreadth = NonEmptySet<CoverageBreadth>
```

---

### Type: `LegalProtection`

Information about legal protections for security researchers

```typescript
type LegalProtection = MustRef<{
	/**
	 * The type of legal protection provided.
	 * The ref must link directly to the section of the bug bounty page or
	 * security policy that contains the legal protection language.
	 */
	type: LegalProtectionType
}>
```

---

### Enum: `BugBountyProgramAvailability`

The availability of the bug bounty program. To identify: check whether the bug bounty page is currently accepting new vulnerability reports. Platform pages (HackerOne, Immunefi, etc.) usually show a clear "Accepting reports" or "Paused" status.

- `ACTIVE` = `'ACTIVE'`: The program is currently running and accepting new vulnerability reports.
- `INACTIVE` = `'INACTIVE'`: The program exists but is temporarily paused and not accepting reports. (e.g. A wallet that had a program but has since suspended it.) If the program never existed at all, set the top-level `bugBountyProgram` field to `notSupported` rather than using this value.

---

### Enum: `CoverageBreadth`

The scope of what the bug bounty program covers. To identify: look for a "Scope" or "In Scope" section on the bug bounty page. Use `FULL_SCOPE` (the string) when everything is in scope — app, backend, smart contracts, firmware, hardware, etc. Use the specific enum values when the scope is explicitly restricted to only one component.

- `APP_ONLY` = `'APP_ONLY'`: Only the wallet application (browser extension, mobile/desktop app) is in scope. Backend services, firmware, and hardware are excluded.
- `FIRMWARE_ONLY` = `'FIRMWARE_ONLY'`: Only the device firmware is in scope. The app and hardware are excluded. Typically used for hardware wallets.
- `HARDWARE_ONLY` = `'HARDWARE_ONLY'`: Only the hardware design is in scope. The app and firmware are excluded. Typically used for hardware wallets with a separate hardware bounty.

---

### Type: `BugBountyProgramSupport`

Information about the bug bounty program implementation. The ref must link to the bug bounty program page (on the platform or the wallet's own site).

```typescript
type BugBountyProgramSupport = WithRef<{
	/**
	 * The date the bug bounty program started (YYYY-MM-DD).
	 * To identify: some platforms show a "Program started" date on the
	 * program page. Otherwise, check the wallet's blog or changelog for
	 * the announcement. If only the year/month is known, use the first
	 * day of that month as an approximation.
	 */
	dateStarted: CalendarDate

	/**
	 * Whether the program is currently accepting reports.
	 * See `BugBountyProgramAvailability` for how to identify.
	 */
	availability: BugBountyProgramAvailability

	/**
	 * What parts of the wallet are in scope.
	 * Use the string `'FULL_SCOPE'` when everything is in scope.
	 * See `CoverageBreadth` for how to identify specific scopes.
	 */
	coverageBreadth: AtLeastOneCoverageBreadth | 'FULL_SCOPE'

	/**
	 * The reward range offered to researchers.
	 * To identify: look for a "Rewards" or "Bounties" section on the program
	 * page. Rewards are typically shown as a table by severity (Critical, High,
	 * Medium, Low). Use the lowest reward across all severities as `minimum`
	 * and the highest as `maximum`. Set to not supported if no monetary rewards
	 * are offered (e.g. acknowledgement-only programs).
	 */
	rewards: Support<{
		minimum: number
		maximum: number
		currency: string
	}>

	/**
	 * The platform hosting the program.
	 * See `BugBountyPlatform` for how to identify.
	 */
	platform: BugBountyPlatform

	/**
	 * The coordinated disclosure policy — how long the wallet developer has
	 * to fix a reported vulnerability before the researcher may publish it.
	 * To identify: look for a "Disclosure" or "Responsible Disclosure" section
	 * on the bug bounty page. The `numberOfDays` is the embargo period in days
	 * (e.g. 90 days is the industry standard set by Google Project Zero).
	 * Set to not supported if the program has no defined disclosure timeline
	 * or prohibits public disclosure entirely.
	 */
	disclosure: Support<{
		numberOfDays: number
	}>

	/**
	 * Whether users can receive a fix for discovered vulnerabilities —
	 * i.e. whether the wallet has an update mechanism that reaches existing users.
	 * (e.g. `true`: the wallet is distributed via an app store or has
	 * auto-updates, so a patched version can reach all users.
	 * `false`: the wallet has no update mechanism — e.g. a static binary
	 * with no distribution channel — so a fix cannot be delivered to users
	 * who already installed the vulnerable version.)
	 * To identify: check whether the wallet is distributed through an app store,
	 * browser extension store, or has an auto-update mechanism. If users must
	 * manually replace binaries with no notification, set to false.
	 */
	upgradePathAvailable: boolean

	/**
	 * Legal protections offered to researchers acting in good faith.
	 * See `LegalProtectionType` for the distinction between Safe Harbor and
	 * Legal Assurance, and how to identify which applies.
	 * Set to not supported if the program offers no legal protections.
	 */
	legalProtections: Support<LegalProtection>
}>
```

---

### Type: `BugBountyProgramImplementation`

A record of bug bounty program support

```typescript
type BugBountyProgramImplementation = WithRef<BugBountyProgramSupport>
```

---

## `src/schema/features/security/firmware.ts`

### Enum: `FirmwareType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `FirmwareSupport`

- `type` (`FirmwareType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `silentUpdateProtection` (`FirmwareType | null`)
- `firmwareOpenSource` (`FirmwareType | null`)
- `reproducibleBuilds` (`FirmwareType | null`)
- `customFirmware` (`FirmwareType | null`)

---

## `src/schema/features/security/hardware-wallet-support.ts`

### Enum: `HardwareWalletType`

Types of hardware wallets that can be supported. To identify: check the wallet's documentation or settings for a list of supported hardware wallets, then verify by connecting each device. Use OTHER for hardware wallets not listed here.

- `LEDGER` = `'LEDGER'`
- `TREZOR` = `'TREZOR'`
- `GRIDPLUS` = `'GRIDPLUS'`
- `KEYSTONE` = `'KEYSTONE'`
- `KEEPKEY` = `'KEEPKEY'`
- `FIREFLY` = `'FIREFLY'`
- `ONEKEY` = `'ONEKEY'`
- `BITBOX` = `'BITBOX'`
- `IMKEY` = `'IMKEY'`
- `OTHER` = `'OTHER'`: A hardware wallet not listed above.

---

### Enum: `HardwareWalletConnection`

Connection method between software and hardware wallet. To identify: connect the hardware wallet and check which browser API or protocol the software wallet uses (visible in browser DevTools → Network or via the wallet's documentation).

- `USB` = `'USB'`: Native USB via a desktop application (not a browser). Use webUSB instead if the connection goes through a browser.
- `QR` = `'QR'`: QR-code based: the software wallet displays a QR code that the hardware wallet camera scans (or vice versa).
- `webUSB` = `'WEBUSB'`: USB through the browser's WebUSB API (browser extensions or web apps). Use USB instead for native desktop applications.
- `webHID` = `'WEBHID'`: HID through the browser's WebHID API. Similar to webUSB but uses the HID protocol instead. (e.g. Trezor uses WebHID in some browser integrations.)
- `bluetooth` = `'BLUETOOTH'`: Wireless connection via Bluetooth.
- `WALLET_CONNECT` = `'WALLET_CONNECT'`: Indirect connection via the WalletConnect protocol — the hardware wallet connects through its companion app rather than directly to the software wallet.

---

### Interface: `SupportedHardwareWallet`

Set of connection types that are supported for a single hardware wallet. To identify: connect the hardware wallet using each available method and record which ones work. Check the wallet's documentation for the full list.

- `connectionTypes` (`NonEmptyArray<HardwareWalletConnection>`): All supported ways to connect this hardware wallet to the software wallet. List every working connection method — a hardware wallet may support more than one (e.g. both webUSB and Bluetooth).

---

### Type: `HardwareWalletSupport`

A record of hardware wallet types and their support status. The ref must link to the wallet's documentation page listing supported hardware wallets, or to the relevant settings screen if no doc page exists.

```typescript
type HardwareWalletSupport = WithRef<{
	/**
	 * For each hardware wallet type, whether it is supported and via which
	 * connection methods. Omit a type entirely rather than setting it to
	 * not supported — only list wallets that have been explicitly verified.
	 */
	wallets: Partial<Record<HardwareWalletType, Support<SupportedHardwareWallet>>>
}>
```

---

## `src/schema/features/security/keys-handling.ts`

### Enum: `KeyGenerationLocation`

Where and how the private key (or key shares) are generated. To identify: check the wallet's security or architecture documentation. For MPC wallets, a blog post or whitepaper usually describes the key generation protocol.

- `FULLY_ON_USER_DEVICE` = `'FULLY_ON_USER_DEVICE'`: The key is generated entirely on the user's device. No key material leaves the device during generation. (e.g. A standard BIP-39 seed phrase wallet where the entropy is generated locally and the seed never touches a server.) To identify: this is the default for most traditional wallets. Confirm by checking that onboarding works fully offline and that no key material is sent to any server (inspect source code or network traffic during setup).
- `FULLY_OFF_USER_DEVICE` = `'FULLY_OFF_USER_DEVICE'`: The key is generated entirely off the user's device — on a remote server or service — and then delivered to the user. (e.g. A custodial service that generates keys server-side and holds them on behalf of the user.) To identify: the wallet's documentation states that keys are generated server-side, or the wallet requires an internet connection and account login before any key material is available.
- `MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE` = `'MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE'`: The key is computed through a multi-party protocol where both the user's device and at least one remote party contribute randomness or key shares. No single party ever holds the complete key — not even the user's device. (e.g. An MPC wallet where the user's device and the wallet provider's server each generate a key share, and threshold signing is used so the full key is never assembled anywhere.) To identify: the wallet documentation explicitly describes MPC key generation involving the user's device as one of the parties.

---

### Enum: `MultiPartyKeyReconstruction`

If the key is split between multiple parties, how does signing/reconstruction occur? To identify: check the wallet's security documentation or source code. For MPC wallets, the key model (threshold signing vs. client-side reconstruction) is usually described in the whitepaper or architecture docs.

- `NON_MULTIPARTY` = `'NON_MULTIPARTY'`: The key is not split — it exists in full on the user's device. This is the standard model for traditional seed phrase wallets.
- `ON_USER_DEVICE` = `'RECONSTRUCTED_ON_USER_DEVICE'`: The key shares are combined on the user's device to reconstruct the full key before signing. The key exists in full on-device momentarily. (e.g. A wallet that stores key shares with different guardians but fetches them all to the user's device and assembles the key locally at signing time.) To identify: the wallet documentation describes "client-side key reconstruction" or the source code shows shares being combined on-device.
- `MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE` = `'MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE'`: Signing is performed through a multi-party computation protocol that includes the user's device as one of the signing parties. The full key is never reconstructed — each party signs with its share. (e.g. An MPC wallet where the user's device holds one key share and the provider's server holds another; both participate in threshold signing for every transaction without ever combining their shares.) To identify: the wallet documentation describes "threshold signing", "MPC signing", or "distributed signing" where the user's device participates.
- `MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE` = `'MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE'`: Signing is performed through a multi-party computation entirely on remote infrastructure — the user's device does not participate in the signing computation itself, only in authorizing it

  To identify: the wallet documentation describes server-side MPC signing where the user's device is not one of the signing parties.

---

### Interface: `KeysHandlingSupport`

How is private key material handled?

Keys handling data is not visible in the wallet UI — it must be determined from the wallet's security documentation, architecture overview, or source code. MPC-based wallets typically describe their key model in a blog post or whitepaper.

- `keyGeneration` (`KeyGenerationLocation`): Where and how the key is generated. See `KeyGenerationLocation` for how to identify.
- `multipartyKeyReconstruction` (`MultiPartyKeyReconstruction`): If the key is split across multiple parties, how does signing occur? Use `NON_MULTIPARTY` for standard wallets where the full key lives on the user's device. See `MultiPartyKeyReconstruction` for MPC cases.

---

## `src/schema/features/security/light-client.ts`

### Enum: `EthereumL1LightClient`

Known Ethereum L1 light client implementations a wallet may embed. Sometimes visible in the UI, but more reliably identified by checking the wallet's documentation for light client claims, or by searching the source code for imports of helios or similar libraries.

- `helios` = `'helios'`: Helios: a fast, trustless Ethereum light client written in Rust.
- `heliosMobi` = `'heliosMobi'`: Helios-Mobi: a mobile-optimized port of Helios.

---

### Type: `EthereumL1LightClientSupport`

```typescript
type EthereumL1LightClientSupport = AtLeastOneSupported<EthereumL1LightClient>
```

---

## `src/schema/features/security/passkey-verification.ts`

### Enum: `PasskeyVerificationLibrary`

On-chain P-256 verifier libraries used to validate passkey (WebAuthn) signatures in smart contract wallets.

This is not about whether the wallet uses passkeys for login — it refers specifically to the smart contract library the wallet uses to verify passkey signatures on-chain when passkeys are used as a signing key.

Not visible in the UI — identify by inspecting the wallet's smart contract source code for the verifier contract it imports or calls, or by checking the wallet's technical documentation.

- `SMOOTH_CRYPTO_LIB` = `'SMOOTH_CRYPTO_LIB'`: SmoothCryptoLib — a P-256 verification library.
- `FRESH_CRYPTO_LIB` = `'FRESH_CRYPTO_LIB'`: FreshCryptoLib — a P-256 verification library.
- `DAIMO_P256_VERIFIER` = `'DAIMO_P256_VERIFIER'`: Daimo's P-256 verifier contract.
- `OPEN_ZEPPELIN_P256_VERIFIER` = `'OPEN_ZEPPELIN_P256_VERIFIER'`: OpenZeppelin's P-256 verifier.
- `WEB_AUTHN_SOL` = `'WEB_AUTHN_SOL'`: WebAuthn.sol — a Solidity library for on-chain WebAuthn verification.
- `OTHER` = `'OTHER'`: A verifier library not listed above. Set `libraryUrl` to the repository or documentation URL.

---

### Interface: `PasskeyVerificationSupport`

Information about the passkey verification implementation. To identify: look at the wallet's smart contract source code for the P-256 verifier it imports or delegates to.

- `library` (`PasskeyVerificationLibrary`): The on-chain library used to verify passkey signatures. Use OTHER if the library is not listed in `PasskeyVerificationLibrary`, and set `libraryUrl` to its repository.
- `libraryUrl` (`string`, optional): URL to the library's repository or documentation. Required when `library` is OTHER; optional otherwise.
- `details` (`string`, optional): Any additional implementation details worth noting. (e.g. a specific contract address, a fork of an upstream library, etc.)

---

### Type: `PasskeyVerificationImplementation`

A record of passkey verification support. Set to not supported if the wallet does not use passkeys as a signing key and therefore has no on-chain P-256 verifier.

```typescript
type PasskeyVerificationImplementation = WithRef<PasskeyVerificationSupport>
```

---

## `src/schema/features/security/scam-alerts.ts`

### Type: `ScamUrlWarning`

```typescript
type ScamUrlWarning = WithRef<{
	/**
	 * Whether the scam site lookup process leaks the visited URL to an
	 * external service, as opposed to something like a partial hash match
	 * like the Google Safe Browsing API for checking spam domains without
	 * leaking the domains being visited to Google.
	 */
	leaksVisitedUrl: 'FULL_URL' | 'DOMAIN_ONLY' | 'PARTIAL_HASH_OF_DOMAIN' | 'NO'

	/**
	 * Whether the contract lookup process leaks the user's Ethereum address
	 * to an external service.
	 */
	leaksUserAddress: boolean

	/**
	 * Whether the scam site lookup process leaks the user's IP to an external
	 * service, as opposed to using an anonymizing proxy.
	 */
	leaksIp: boolean
}>
```

---

### Type: `ContractTransactionWarning`

```typescript
type ContractTransactionWarning = WithRef<{
	/**
	 * Does the wallet warn the user when they are interacting with a contract
	 * they have not interacted with before?
	 */
	previousContractInteractionWarning: boolean

	/**
	 * Does the wallet warn the user when they are interacting with a contract
	 * that has only recently been deployed to the chain.
	 */
	recentContractWarning: boolean

	/**
	 * Does the wallet check a registry of known scam/non-scam contracts and
	 * use it to warn the user?
	 */
	contractRegistry: boolean

	/**
	 * Whether the contract lookup process leaks the contract address to an
	 * external service, as opposed to something like a partial match against
	 * a static list.
	 */
	leaksContractAddress: boolean

	/**
	 * Whether the contract lookup process leaks the user's Ethereum address
	 * to an external service.
	 */
	leaksUserAddress: boolean

	/**
	 * Whether the contract lookup process leaks the user's IP address to an
	 * external service.
	 */
	leaksUserIp: boolean
}>
```

---

### Type: `SendTransactionWarning`

```typescript
type SendTransactionWarning = WithRef<{
	/**
	 * Does the wallet feature a user-editable whitelist, outside of which
	 * the wallet warns when sending to other addresses?
	 */
	userWhitelist: boolean

	/**
	 * Does the wallet warn the user when they are sending to an address they
	 * have not sent funds to before?
	 */
	newRecipientWarning: boolean

	/**
	 * Whether the lookup process leaks the recipient address to an external
	 * service.
	 */
	leaksRecipient: boolean

	/**
	 * Whether the lookup process leaks the user's Ethereum address to an
	 * external service.
	 */
	leaksUserAddress: boolean

	/**
	 * Whether the lookup process leaks the user's IP address to an external
	 * service.
	 */
	leaksUserIp: boolean
}>
```

---

### Interface: `ScamAlerts`

Whether the wallet supports scam alerts.

- `scamUrlWarning` (`Support<ScamUrlWarning>`): Does the wallet warn the user when visiting a known-scam site?
- `contractTransactionWarning` (`Support<ContractTransactionWarning>`): Does the wallet warn the user before executing a contract transaction?
- `sendTransactionWarning` (`Support<SendTransactionWarning>`): Does the wallet warn the user before executing a send transaction?

---

## `src/schema/features/security/secure-element.ts`

### Type: `SecureElementSupport`

```typescript
type SecureElementSupport = WithRef<{
	secureElementType: SecureElementType
}>
```

---

### Enum: `SecureElementType`

- `EAL_7` = `'EAL 7'`
- `EAL_6_PLUS` = `'EAL 6+'`
- `EAL_5_PLUS` = `'EAL 5+'`
- `PCI` = `'PCI'`

---

## `src/schema/features/security/security-audits.ts`

### Enum: `SecurityFlawSeverity`

The severity of a security flaw, as assigned by the auditor. Only medium-severity or higher flaws are tracked here, lower-severity findings are ignored.

If the security auditor does not assign a severity rating, use your best judgement.

- `CRITICAL` = `'CRITICAL'`
- `HIGH` = `'HIGH'`
- `MEDIUM` = `'MEDIUM'`

---

### Type: `UnpatchedSecurityFlaw`

A security flaw that was unaddressed at the time the audit report was published. To identify: read the audit report's findings section. For each medium-or-higher finding marked as unresolved/acknowledged at publication, add an entry here. Then check if the flaw was subsequently fixed and set `presentStatus` accordingly.

```typescript
type UnpatchedSecurityFlaw = {
	/** Short name or description of the flaw, as used in the audit report. */
	name: string

	/**
	 * Severity as assigned by the auditor at publication time.
	 * If the auditor later revised the severity, use the original published value.
	 */
	severityAtAuditPublication: SecurityFlawSeverity
} & (
	| {
			/**
			 * The flaw remains unpatched as of today.
			 * To verify: check if the wallet's source code or a newer audit confirms
			 * the fix. If no evidence of a fix exists, use NOT_FIXED.
			 */
			presentStatus: 'NOT_FIXED'
	  }
	| MustRef<{
			/**
			 * The flaw was fixed after audit publication.
			 * The ref must link to evidence of the fix.
			 */
			presentStatus: 'FIXED'

			/** The date the fix was confirmed. */
			fixedDate: CalendarDate
	  }>
)
```

---

### Type: `SecurityAudit`

A single public security audit. The ref must link directly to the publicly available audit report (PDF or web page). Only include audits whose full report is PUBLICLY accessible.

```typescript
type SecurityAudit = MustRef<{
	/**
	 * The firm or individual that performed the audit.
	 * Must be an entity defined in the `SecurityAuditor` type.
	 */
	auditor: SecurityAuditor

	/**
	 * The date the audit report was published or delivered.
	 * To identify: look for a date on the report cover page or in its header.
	 */
	auditDate: CalendarDate

	/**
	 * The snapshot of code that was audited, if specified in the report.
	 * To identify: audit reports often include a "Scope" or "Target" section
	 * listing the commit hash or tag audited. Leave unset if not provided.
	 */
	codeSnapshot?: {
		/** When the code snapshot was taken, if stated in the report. */
		date: CalendarDate

		/** The git commit hash of the audited snapshot, if provided. */
		commit?: string

		/** The git release tag of the audited snapshot, if provided. */
		tag?: string
	}

	/**
	 * Which wallet variants were covered by this audit.
	 * Use `ALL_VARIANTS` if the audit covered the entire wallet codebase.
	 */
	variantsScope: AtLeastOneTrueVariant | 'ALL_VARIANTS'

	/**
	 * Security flaws found but not fixed by the time the report was published.
	 * Only medium-severity or higher findings are tracked.
	 *
	 * `NONE_FOUND`: no medium-or-higher flaws were found in the audit.
	 * `ALL_FIXED`: flaws were found but all were resolved before publication,
	 * or were below medium severity.
	 * An array: one entry per unresolved medium-or-higher finding at publication.
	 */
	unpatchedFlaws: 'NONE_FOUND' | 'ALL_FIXED' | NonEmptyArray<UnpatchedSecurityFlaw>
}>
```

---

## `src/schema/features/security/supply-chain-diy.ts`

### Enum: `SupplyChainDIYType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `SupplyChainDIYSupport`

- `type` (`SupplyChainDIYType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `diyNoNda` (`SupplyChainDIYType`)
- `componentSourcingComplexity` (`SupplyChainDIYType`)

---

### Type: `SupplyChainDIYImplementation`

```typescript
type SupplyChainDIYImplementation = WithRef<SupplyChainDIYSupport>
```

---

## `src/schema/features/security/supply-chain-factory.ts`

### Enum: `SupplyChainFactoryType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `SupplyChainFactorySupport`

- `type` (`SupplyChainFactoryType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `factoryOpsecDocs` (`SupplyChainFactoryType`)
- `factoryOpsecAudit` (`SupplyChainFactoryType`)
- `tamperEvidence` (`SupplyChainFactoryType`)
- `hardwareVerification` (`SupplyChainFactoryType`)
- `tamperResistance` (`SupplyChainFactoryType`)
- `genuineCheck` (`SupplyChainFactoryType`)

---

### Type: `SupplyChainFactoryImplementation`

```typescript
type SupplyChainFactoryImplementation = WithRef<SupplyChainFactorySupport>
```

---

## `src/schema/features/security/transaction-legibility.ts`

### Enum: `DataDisplayOptions`

To test: initiate the relevant transaction type and observe the approval screen without clicking anything fee-related or expanding any sections.

- `SHOWN_BY_DEFAULT` = `'SHOWN_BY_DEFAULT'`: Visible on the approval screen before any clicks or settings changes.
- `SHOWN_OPTIONALLY` = `'SHOWN_OPTIONALLY'`: Visible only after at least one user action on the approval screen (e.g. tapping a row, clicking "Details", or enabling a setting).
- `NOT_IN_UI` = `'NOT_IN_UI'`: Not shown anywhere on the approval screen, even after interaction.

---

### Interface: `DisplayedBasicTransactionDetails`

How are the essential transaction data displayed by the wallet for basic transactions? Basic transactions have a clear recipient and value. To test: initiate a plain ETH transfer (for ETH_TRANSFER) or an ERC-20 send and check which of the fields below appear on the approval screen.

- `gas` (`DataDisplayOptions`): The gas fee / estimated network cost.
- `nonce` (`DataDisplayOptions`): The transaction nonce.
- `from` (`DataDisplayOptions`): The sender address (the user's own address).
- `to` (`DataDisplayOptions`): The recipient address.
- `chain` (`DataDisplayOptions`): The chain / network the transaction will be sent on.
- `value` (`DataDisplayOptions`): The ETH value being sent.

---

### Enum: `TransactionOutcome`

Whether the effect of a complex transaction is explained to the user.

For regular (EOA) transactions, "outcome" means the wallet explains what the transaction will do to the signer's own address — e.g. "You are approving 100 USDC to be spent by Aave", "You are supplying 1 ETH", "You are receiving / sending ERC-721 / ERC-1155 tokens.".

For Safe (multisig) transactions, the standard is identical: the wallet must show what the Safe execution will actually do — the real-world effect on the Safe's address. The signer is adding a confirmation to an `execTransaction` call.

To test: initiate the benchmark transaction and check whether the approval screen describes the real-world effect in plain terms. For Safe transactions, verify the wallet shows the outcome of what the Safe will execute, not just the outer `execTransaction` parameters or a Safe tx hash.

- `EXPLAINED` = `'EXPLAINED'`: The effect is clearly explained. For EOA transactions: the wallet describes what will happen to the signer's address (e.g. token approvals / transfers, defi deposit). For Safe transactions: the wallet describes what will happen to the Safe address.
- `NOT_EXPLAINED` = `'NOT_EXPLAINED'`: The effect is not explained, leaving the user to interpret raw calldata. For Safe transactions, this includes wallets that only show the Safe tx hash or the outer `execTransaction` parameters without showing what the Safe will actually do.

---

### Interface: `DisplayedComplexTransactionDetails`

How are the essential transaction data displayed by the wallet for complex transactions? Complex transactions interact with contracts, so there is no simple "to" address or "value" — instead we evaluate whether the transaction outcome is explained. To test: initiate the relevant benchmark transaction and observe the approval screen.

Users can test on https://beta.walletbeat.eth.limo/test and test a transaction request under `Transactions` tab.

- `gas` (`DataDisplayOptions`): The gas fee / estimated network cost.
- `nonce` (`DataDisplayOptions`): The transaction nonce.
- `from` (`DataDisplayOptions`): The sender address.
- `to` (`DataDisplayOptions`): The contract being called.
- `chain` (`DataDisplayOptions`): The chain / network the transaction will be sent on.
- `value` (`DataDisplayOptions`): The ETH value attached to the call (often zero for token interactions).
- `calldataDecoded` (`DataDisplayOptions`): Whether the calldata is decoded into a human-readable function name and arguments. For Safe transactions, this means the wallet must decode the inner calldata (the `bytes` `data` parameter of `execTransaction`) — not just the outer `execTransaction` call itself. For example, a Safe Aave supply transaction wraps `supply(address,uint256,address,uint16)` inside `execTransaction(..., data, ...)`; decoding only the outer call leaves the inner `data` as an opaque hex blob.
- `transactionOutcome` (`TransactionOutcome`): Whether the real-world effect of the transaction is explained. See `TransactionOutcome` for the full definition, including the distinction for Safe (multisig) transactions.

---

### Enum: `BasicBenchmarkTransactions`

Benchmark transactions for basic operations with a clear recipient and value.

Important: THIS INFORMATION MUST BE ON THE WALLET ITSELF for hardware wallets. We do not trust the software "around" the wallets.

To judge this feature, we will assess a "hard-and-fast" rule of "can you decode this specific set of calldata?" Hardware wallets could "cheat" this system by hard-coding just these transactions to pass the test, so we expect this list to grow over time.

- `ETH_TRANSFER` = `'ETH_TRANSFER'`: Plain ETH transfer to an EOA (no calldata). A simple send of Ether to another address.
- `ERC_20_TRANSFER` = `'ERC_20_TRANSFER'`: Sending of ERC-20 tokens to another address.
- `ERC_721_TRANSFER` = `'ERC_721_TRANSFER'`: Sending of ERC-721 tokens (NFTs) to another address.
- `ERC_1155_TRANSFER` = `'ERC_1155_TRANSFER'`: Sending of ERC-1155 tokens to another address.
- `ZKSYNC_USDC_TRANSFER` = `'ZKSYNC_USDC_TRANSFER'`: ZKSync USDC transfer transaction. Same as a token transfer, but on a non-mainnet chain.

---

### Enum: `ComplexBenchmarkTransactions`

Benchmark transactions for complex contract interactions.

These transactions interact with smart contracts in non-trivial ways, so there is no simple "to" address or "value" to display. Instead, we evaluate whether the wallet explains the transaction outcome.

- `USDC_APPROVAL` = `'USDC_APPROVAL'`: USDC approval transaction cast calldata "approve(address,uint256)" 0x06496E706bB260Bef1656297A7eaDDF5D3E7788A 1000000 https://tools.cyfrin.io/abi-encoding?data=0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f4240

  ```
  📞 Function: approve(address,uint256)
  📋 Parameters:
    param0: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 - AAVE Address
    param1: 1000000
  To: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
  ```

- `AAVE_SUPPLY` = `'AAVE_SUPPLY'`: Aave supply transaction cast calldata "supply(address,uint256,address,uint16)" 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E 50000000000000000000 0x9467919138E36f0252886519f34a0f8016dDb3a3 0 https://tools.cyfrin.io/abi-encoding?data=0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000

  ```
  📞 Function: supply(address,uint256,address,uint16)
  📋 Parameters:
    param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
    param1: 50000000000000000000
    param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
    param3: 0
  ```

- `SAFEWALLET_AAVE_SUPPLY_NESTED` = `'SAFEWALLET_AAVE_SUPPLY_NESTED'`: SafeWallet Aave supply transaction https://tools.cyfrin.io/abi-encoding?data=0x6a76120200000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000

  ```
  📞 Function: execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
  📋 Parameters:
    param0: 0x78e30497a3c7527d953c6B1E3541b021A98Ac43c
    param1: 0
    param2:
      📞 Function: supply(address,uint256,address,uint16)
      🔍 Selector: 0x617ba037
      📋 Parameters:
        param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
        param1: 50000000000000000000
        param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
        param3: 0
      🔤 Raw Data: 0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
    param3: 0
    param4: 0
    param5: 0
    param6: 0
    param7: 0x0000000000000000000000000000000000000000
    param8: 0x0000000000000000000000000000000000000000
    param9: 0x000000000000000000000000f8cade19b26a2b970f2def5ea9eccf1bda3d1186000000000000000000000000000000000000000000000000000000000000000001
  ```

- `SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND` = `'SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND'`: SafeWallet Aave USDC approve supply batch nested multi-send transaction https://tools.cyfrin.io/abi-encoding?data=0x6a761202000000000000000000000000f220d3b4dfb23c4ade8c88e526c1353abacbc38f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000001c48d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000

  ```

  📞 Function: execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
  📋 Parameters:
    param0: 0xf220D3b4DFb23C4ade8C88E526C1353AbAcbC38F
    param1: 0
    param2:
      📞 Function: multiSend(bytes)
      🔍 Selector: 0x8d80ff0a
      📋 Parameters:
        param0:
          📦 Multi-Send (2 transactions):
            [0] Transaction:
              Operation: 0 (Call)
              To: 0x5a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e
              Value: 0
              Data Length: 68
              Decoded Call:
                📞 Function: approve(address,uint256)
                🔍 Selector: 0x095ea7b3
                📋 Parameters:
                  param0: 0x78e30497a3c7527d953c6B1E3541b021A98Ac43c
                  param1: 50000000000000000000
                🔤 Raw Data: 0x095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b1880000
            [1] Transaction:
              Operation: 0 (Call)
              To: 0x78e30497a3c7527d953c6b1e3541b021a98ac43c
              Value: 0
              Data Length: 132
              Decoded Call:
                📞 Function: supply(address,uint256,address,uint16)
                🔍 Selector: 0x617ba037
                📋 Parameters:
                  param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
                  param1: 50000000000000000000
                  param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
                  param3: 0
                🔤 Raw Data: 0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
      🔤 Raw Data: 0x8d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    param3: 1
    param4: 0
    param5: 0
    param6: 0
    param7: 0x0000000000000000000000000000000000000000
    param8: 0x0000000000000000000000000000000000000000
    param9: 0x000000000000000000000000f8cade19b26a2b970f2def5ea9eccf1bda3d1186000000000000000000000000000000000000000000000000000000000000000001
  ```

---

### Type: `HardwareBenchmarkTransactions`

HardwareBenchmarkTransactions is the union of basic and complex benchmark transactions. Used for hardware wallet calldata decoding evaluation.

```typescript
type HardwareBenchmarkTransactions = BasicBenchmarkTransactions | ComplexBenchmarkTransactions
```

---

### Enum: `SimulationBenchmarkTransactions`

Benchmark transactions for simulation-specific scenarios. These test the wallet's ability to simulate edge-case transaction outcomes.

- `FAILED_TRANSACTION` = `'FAILED_TRANSACTION'`: A transaction that will fail (revert).
- `NONDETERMINISTIC_TRANSACTION` = `'NONDETERMINISTIC_TRANSACTION'`: A transaction that has nondeterministic outcome (e.g. depends on execution state).

---

### Interface: `DisplayedFailedTransactionDetails`

Details for a failed simulation benchmark transaction.

- `failure` (`'DETECTED' | 'NOT_DETECTED'`): If the wallet detects that a transaction will fail and shows this to the user, it's 'DETECTED'; otherwise, 'NOT_DETECTED'.

---

### Interface: `DisplayedNondeterministicTransactionDetails`

Details for a nondeterministic simulation benchmark transaction.

- `nondeterminism` (`| 'NO_OUTCOME_SHOWN' | 'STATIC_SINGLE_OUTCOME' | 'RESIMULATES_NO_WARNING' | 'RESIMULATES_WITH_WARNING'`): How the wallet handles state-dependent (non-deterministic) transactions.
  - STATIC_SINGLE_OUTCOME: Shows one outcome and keeps it static. No re-simulation if state changes.
  - RESIMULATES_NO_WARNING: Re-simulates and updates the outcome if state changes, but doesn’t explicitly warn the user.
  - RESIMULATES_WITH_WARNING: Re-simulates and explicitly warns that multiple outcomes are possible.

---

### Interface: `DisplayedTokenTransferDetails`

Display details for token transfer transactions (ERC-20, ERC-721). These include a transaction outcome since the transfer involves contract interaction.

- `transactionOutcome` (`TransactionOutcome`)

---

### Type: `SoftwareTransactionDetailsDisplay`

Per-benchmark-transaction display details for software wallets. Each benchmark transaction records what the wallet shows when that transaction is being signed.

```typescript
type SoftwareTransactionDetailsDisplay =
	| ({
			[BasicBenchmarkTransactions.ETH_TRANSFER]: DisplayedBasicTransactionDetails
			[BasicBenchmarkTransactions.ERC_20_TRANSFER]: DisplayedTokenTransferDetails
			[BasicBenchmarkTransactions.ERC_721_TRANSFER]: DisplayedTokenTransferDetails
			[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: DisplayedTokenTransferDetails
			[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: DisplayedBasicTransactionDetails
	  } & Record<ComplexBenchmarkTransactions, DisplayedComplexTransactionDetails> & {
				[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: DisplayedFailedTransactionDetails
			} & {
				[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: DisplayedNondeterministicTransactionDetails
			})
	| null
```

---

### Type: `CalldataDecodingTypes`

Types of transactions that a wallet can decode the calldata of.

```typescript
type CalldataDecodingTypes = Record<HardwareBenchmarkTransactions, DataDecoded | null>
```

---

### Enum: `DataDecoded`

Where does the calldata decoding actually happen? To identify: initiate a contract transaction and observe whether the decoded output appears on the hardware wallet's own screen, or only in the companion app / browser extension on the computer.

- `ON_DEVICE` = `'ON_DEVICE'`: Decoding happens on the hardware wallet device itself. The decoded function name and parameters are shown on the device screen, independently of any software running on the connected computer.
- `OFF_DEVICE` = `'OFF_DEVICE'`: Decoding happens off-device — in a companion app, browser extension, or desktop software. The hardware wallet's own screen does not show decoded data.
- `NOT_DECODED` = `'NOT_DECODED'`: No decoding occurs; raw hex calldata is shown (or nothing at all).

---

### Enum: `MessageSigningDetails`

What does the wallet provide for message signing legibility? To test: trigger an `eth_signTypedData_v4` request (e.g. via an app that uses EIP-712 signatures, or via the browser console) and observe what the wallet's approval screen shows.

Users can test on https://beta.walletbeat.eth.limo/test and test a EIP-712 message signing request under `Signatures` tab.

- `EIP712_STRUCT` = `'EIP712_STRUCT'`: The wallet shows the full decoded EIP-712 struct — domain fields and message fields rendered as human-readable key-value pairs.
- `DOMAIN_HASH` = `'DOMAIN_HASH'`: The wallet shows the EIP-712 domain separator hash.
- `MESSAGE_HASH` = `'MESSAGE_HASH'`: The wallet shows the EIP-712 message hash.
- `SAFE_HASH` = `'SAFE_HASH'`: The wallet shows the Safe-specific transaction hash (used in Safe signing flows).

---

### Type: `SoftwareMessageSigningLegibility`

For software wallets: track which message signing data types are available

```typescript
type SoftwareMessageSigningLegibility = Record<MessageSigningDetails, DataDisplayOptions> | null
```

---

### Interface: `HardwareMessageSigningLegibility`

For hardware wallets: track which message signing data types are available and where they are displayed

- `messageSigningDetails` (`Record<MessageSigningDetails, DataDisplayOptions>`): Which message signing data types does the wallet provide?
- `decoded` (`DataDecoded`): Where does the message signing data display happen?

---

### Enum: `DataExtraction`

Data Extraction: how can a user independently verify the data shown on a hardware wallet, beyond reading it with their eyes?

IN FLUX: the industry has not yet standardized this. https://ethereum-magicians.org/t/standardizing-wallet-information-so-humans-can-actually-know-what-they-are-signing/24295

To identify: initiate a contract call and observe what the hardware wallet offers beyond text display on the screen.

- `EYES` = `'EYES'`: The data is shown on screen and the user reads it visually. No machine-readable export is available.
- `QRCODE` = `'QRCODE'`: The device displays a QR code that encodes the transaction data, which can be scanned to extract and verify it externally.
- `HASHES` = `'HASHES'`: The device shows cryptographic hashes (e.g. domain hash, message hash) that the user can independently compute and compare.

---

### Type: `DataExtractionMethods`

Set of data extraction methods that a wallet supports.

```typescript
type DataExtractionMethods = Record<DataExtraction, boolean | null>
```

---

### Interface: `HardwareTransactionLegibilitySupport`

A record of transaction legibility support (both message and transaction)

- `calldataDecoded` (`CalldataDecodingTypes | null`): Does the wallet decode basic and complex transaction calldata to show function names and parameters?
- `detailsDisplayed` (`DisplayedBasicTransactionDetails | null`): Does a wallet display transaction details clearly?
- `dataExtraction` (`DataExtractionMethods | null`): Does a wallet allow for data extraction?
- `messageSigningLegibility` (`HardwareMessageSigningLegibility | null`): What message signing data does the hardware wallet provide and where is it displayed?

---

### Interface: `CallDataDisplay`

What can the user do with the calldata on the approval screen? To test: initiate a contract transaction (e.g. USDC_APPROVAL) and check what calldata options the wallet provides.

Users can test on https://beta.walletbeat.eth.limo/test and test a USDC approval transaction under `Transactions` tab.

- `rawHex` (`boolean`): The raw `0x...` hex calldata is visible somewhere on the approval screen. To test: look for a hex string starting with `0x` on the approval screen or in an expandable section.
- `copyHexToClipboard` (`boolean`): A dedicated button copies the raw hex calldata to the clipboard. For batched transactions, the full hex including the multicall wrapper is expected. To test: look for a copy icon or "Copy" button next to the calldata.
- `formatted` (`boolean`): The calldata is decoded into a human-readable function name and arguments (e.g. JSON or structured text), not just raw hex. For batched transactions, each inner call should be decoded individually. To test: check if the wallet shows the function name (e.g. `approve`) and parameters (e.g. spender address, amount) in a readable format.

---

### Interface: `SoftwareTransactionLegibilitySupport`

A record of transaction legibility support (both message and transaction)

- `calldataDisplay` (`CallDataDisplay | null`): Does the software wallet support displaying the calldata in different formats?
- `transactionDetailsDisplay` (`SoftwareTransactionDetailsDisplay | null`): Does the software wallet support displaying the transaction details? Evaluated per benchmark transaction type.
- `messageSigningLegibility` (`SoftwareMessageSigningLegibility | null`): What message signing data does the software wallet provide?

---

### Type: `HardwareTransactionLegibilityImplementation`

```typescript
type HardwareTransactionLegibilityImplementation = WithRef<HardwareTransactionLegibilitySupport>
```

---

### Type: `SoftwareTransactionLegibilityImplementation`

```typescript
type SoftwareTransactionLegibilityImplementation = WithRef<SoftwareTransactionLegibilitySupport>
```

---

## `src/schema/features/security/user-safety.ts`

### Enum: `UserSafetyType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `UserSafetySupport`

- `type` (`UserSafetyType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `readableAddress` (`UserSafetyType`)
- `contractLabeling` (`UserSafetyType`)
- `rawTxReview` (`UserSafetyType`)
- `readableTx` (`UserSafetyType`)
- `txCoverageExtensibility` (`UserSafetyType`)
- `txExpertMode` (`UserSafetyType`)
- `rawEip712` (`UserSafetyType`)
- `readableEip712` (`UserSafetyType`)
- `eip712CoverageExtensibility` (`UserSafetyType`)
- `eip712ExpertMode` (`UserSafetyType`)
- `riskAnalysis` (`UserSafetyType`)
- `riskAnalysisLocal` (`UserSafetyType`)
- `fullyLocalRiskAnalysis` (`UserSafetyType`)
- `txSimulation` (`UserSafetyType`)
- `txSimulationLocal` (`UserSafetyType`)
- `fullyLocalTxSimulation` (`UserSafetyType`)

---

### Type: `UserSafetyImplementation`

```typescript
type UserSafetyImplementation = WithRef<UserSafetySupport>
```

---

## `src/schema/features/self-sovereignty/chain-configurability.ts`

### Enum: `RpcEndpointConfiguration`

Can a chain's RPC endpoint be configured, and if so, when?

- `YES_BEFORE_ANY_REQUEST` = `'YES_BEFORE_ANY_REQUEST'`: It is possible to set a custom RPC endpoint address before the wallet makes any request to its default RPC endpoint setting. To test: install the wallet fresh, open the network/chain settings before doing anything else, and verify you can change the RPC URL before any network requests have been made. Use the browser devtools Network tab to confirm no RPC calls fired before you reached the setting.
- `YES_AFTER_OTHER_REQUESTS` = `'YES_AFTER_OTHER_REQUESTS'`: It is possible to set a custom RPC endpoint address, but the wallet makes sensitive requests to its default RPC endpoint before the user has a chance to get to the configuration options for RPC endpoints. To test: install the wallet fresh and watch the browser devtools Network tab during onboarding. If requests to a default RPC fire before you can reach the RPC configuration screen, this is the correct value.
- `NO` = `'NO'`: The RPC endpoint is not configurable by the user. To test: look for any network or chain settings in the wallet. If there is no option to change the RPC URL for any chain, use this value.

---

### Interface: `SingleChainConfigurability`

Can the wallet's usage of a particular chain be configured?

- `rpcEndpointConfiguration` (`RpcEndpointConfiguration`): Can the wallet's RPC endpoint for the chain be configured? To test: navigate to the wallet's network or chain settings and look for an option to change the RPC URL for a given chain.

---

### Interface: `SelfHostedNodeL1BasicOperationsSupport`

Can the wallet be used to perform basic operations only using a self-hosted node?

- `withNoConnectivityExceptL1RPCEndpoint` (object): Can the wallet be used to perform basic operations only using the L1 RPC provider?

  These operations must be tested in an environment with no network connectivity to external services, other than to a user's L1 RPC endpoint.

  To set up the test environment: point the wallet at a self-hosted node, then block all other outbound traffic using firewall rules, `/etc/hosts`, or browser DevTools → Network conditions → Offline (with a localhost RPC proxy still reachable). Then attempt each operation below and record whether it succeeds.
  - `accountCreation` (`Support`): Can you create an account? To test: go through the wallet's new account / seed phrase creation flow in the restricted environment and check if it completes successfully.
  - `accountImport` (`Support`): Can you import an account? To test: import an existing seed phrase or private key in the restricted environment and check if the wallet loads without errors.
  - `etherBalanceLookup` (`Support`): Can you see your Ether balance? To test: after setup, check if the ETH balance is displayed using only the self-hosted L1 RPC, with no external API calls.
  - `erc20BalanceLookup` (`Support`): Can you look up an ERC-20 token balance? Requiring the user to input the ERC-20 contract address is OK, the token does not need to be automatically discovered. To test: manually enter a known ERC-20 contract address and check if the balance loads using only the L1 RPC.
  - `erc20TokenSend` (`Support`): Can you send an ERC-20 token to another address? Requiring the user to input the ERC-20 contract address is OK, the token does not need to be automatically discovered. Must be able to send to a different address than your own. To test: attempt to send an ERC-20 token to a different address in the restricted environment. The transaction should broadcast successfully using only the L1 RPC, with no external API calls required.

---

### Interface: `ChainConfigurability`

Customization options that exist for chains.

- `l1` (`Support<SingleChainConfigurability & SelfHostedNodeL1BasicOperationsSupport>`): Does the wallet support using Ethereum L1 at all? To test: check if the wallet lists Ethereum mainnet as an available network and can send transactions on it.
- `nonL1` (`Support<SingleChainConfigurability>`): Does the wallet support non-L1 Ethereum chains? (e.g. The wallet allows switching to or adding Arbitrum, Base, Optimism, or other L2s.)
- `customChainRpcEndpoint` (`Support`): Does the wallet support adding custom chains? (e.g. The wallet has an "Add network" option where you can input a custom chain ID, RPC URL, and currency symbol — beyond just editing existing chains.)

---

## `src/schema/features/self-sovereignty/interoperability.ts`

### Enum: `InteroperabilityType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `InteroperabilitySupport`

- `type` (`InteroperabilityType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `interoperability` (`InteroperabilityType`)
- `noSupplierLinkage` (`InteroperabilityType`)

---

### Type: `InteroperabilityImplementation`

```typescript
type InteroperabilityImplementation = WithRef<InteroperabilitySupport>
```

---

## `src/schema/features/self-sovereignty/transaction-submission.ts`

### Enum: `TransactionSubmissionL2Type`

L2 types considered for transaction submission. Each L2 type has its own force-inclusion mechanism documented below.

- `arbitrum` = `'arbitrum'`: Arbitrum chains (Arbitrum One, Arbitrum Nova, etc.). Force inclusion: users can submit transactions directly to the L1 delayed inbox, bypassing the sequencer after a delay. Reference: https://rollup-fortress.github.io/uncensored-book/research/arbitrum-force-inclusion.html
- `opStack` = `'opStack'`: OP Stack chains (Optimism, Base, Mode, etc.). Force inclusion: users can deposit transactions directly via the L1 bridge contract, which the sequencer must include. Reference: https://docs.optimism.io/stack/transactions/forced-transaction

---

### Enum: `TransactionSubmissionL2Support`

Levels of support for L2 force-inclusion transactions.

Force inclusion is an L2 escape hatch: when a sequencer censors or delays a transaction, the user can submit it directly to L1 and force the sequencer to include it. This is a critical self-sovereignty property.

To identify: check the wallet's documentation or UI for any "force include", "sequencer bypass", or "L1 submission" feature.

- `NOT_SUPPORTED_BY_WALLET_BY_DEFAULT` = `'NOT_SUPPORTED_BY_WALLET_BY_DEFAULT'`: The wallet does not support this L2 type with its default configuration. (e.g. The wallet has no Arbitrum or OP Stack network in its default chain list.) To identify: check the wallet's default network list — if the L2 type is absent, use this value.
- `SUPPORTED_BUT_NO_FORCE_INCLUSION` = `'SUPPORTED_BUT_NO_FORCE_INCLUSION'`: The L2 is supported, but the wallet has no force-inclusion capability. The user can only submit transactions through the sequencer. (e.g. The wallet supports Arbitrum but offers no way to submit directly to the L1 delayed inbox.) To identify: the wallet supports the L2 but has no force-inclusion UI or documented escape hatch flow.
- `SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS` = `'SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS'`: The wallet supports force-including withdrawal transactions on this L2. This covers the case where the user can force-exit funds to L1 even if the sequencer is censoring them, but cannot force-include arbitrary calls. (e.g. The wallet has a dedicated "withdraw via L1" flow for moving funds out of the L2 without relying on the sequencer.)
- `SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS` = `'SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS'`: The wallet supports force-including any arbitrary transaction on this L2, not just withdrawals. (e.g. The wallet allows submitting any L2 transaction directly to L1 via the force-inclusion mechanism, bypassing sequencer censorship entirely.)

---

### Interface: `TransactionSubmission`

Support for transaction broadcast and inclusion. L1 broadcast fields require network traffic inspection or source code research to verify — the UI alone does not reveal how transactions are submitted.

- `l1` (`WithRef<{ selfBroadcastViaDirectGossip: Support | null selfBroadcastViaSelfHostedNode: Support | null }>`): Options for broadcasting transactions to L1. The ref must link to documentation or source code evidence for each claim.
- `l2` (`WithRef<Record<TransactionSubmissionL2Type, TransactionSubmissionL2Support | null>>`): Options for broadcasting transactions to L2 chains. The ref must link to documentation or source code evidence. Set a chain's value to null if its support level has not been researched.

---

## `src/schema/features/support.ts`

### Type: `Supported<T extends object = object>`

A supported feature.

```typescript
type Supported<T extends object = object> = T & {
	support: 'SUPPORTED'
}
```

---

### Interface: `NotSupported`

An unsupported feature.

- `support` (`'NOT_SUPPORTED'`)

---

### Type: `Support<T extends object = object>`

A feature that may or may not be supported.

```typescript
type Support<T extends object = object> = NotSupported | Supported<T>
```

---

### Type: `AtLeastOneSupported<K extends string, T extends object = object>`

A non-empty record where at least one member must be supported.

```typescript
type AtLeastOneSupported<K extends string, T extends object = object> = NonEmptyRecord<
	K,
	Support<T>
> &
	{
		[V in K]: Record<V, Supported<T>> & Partial<Record<Exclude<K, V>, Support<T>>>
	}[K]
```

---

## `src/schema/features/transparency/fee-display.ts`

### Enum: `FeeDisplayLevel`

What level of information is shown about fees.

- `NONE` = `'NONE'`: No fee information is shown at all. (e.g. The wallet silently takes a spread on a swap without showing any fee line item; the user only sees the input and output amounts.) To identify: go through the full transaction approval flow and confirm that no fee, gas, or cost figure appears anywhere on screen.
- `AGGREGATED` = `'AGGREGATED'`: A single total fee number is shown, with no breakdown of where it goes. (e.g. The wallet shows "Network fee: 0.002 ETH" but does not distinguish between the gas cost and any wallet/protocol fee taken on top.) To identify: a fee amount is visible, but all costs are collapsed into one line with no itemization of individual fee recipients.
- `COMPREHENSIVE` = `'COMPREHENSIVE'`: A full fee breakdown is shown: separate line items for each fee and who receives it. (e.g. The wallet shows "Gas: 0.001 ETH", "Protocol fee: 0.05%", "Wallet fee: 0.1%" as distinct line items.) To identify: the transaction approval screen lists each fee component separately, making it clear how much goes to the network, the protocol, and/or the wallet.

---

### Interface: `FeeDisplay`

How much fee information is displayed by default and after an action.

- `byDefault` (`FeeDisplayLevel`): Level of fee information shown with default wallet settings and zero fee-specific interactions on the transaction approval screen. To test: initiate the transaction on a freshly installed wallet with no settings changed. Record the fee display level visible on the approval screen before clicking anything fee-related.
- `afterSingleAction` (`FeeDisplayLevel`): Level of fee information shown after at most one additional click/tap on the transaction approval screen (e.g. tapping a fee row, an info icon, or a "show details" chevron), with no settings changed. To test: from the same default approval screen, make exactly one fee-related interaction and record the highest level of detail then shown. If `byDefault` is already `COMPREHENSIVE`, this should be the same value.
- `fullySponsored` (`boolean`): Whether the wallet fully sponsors these fees on behalf of the user, so the user pays nothing. To test: complete the transaction and verify that no gas or protocol fee is deducted from the user's balance. Check the wallet's documentation or source code to confirm sponsorship is intentional and not a test-net artifact.

---

### Interface: `BasicOperationFees`

Details about how the wallet displays fees for basic operations.

- `ethL1Transfer` (`Support<WithRef<FeeDisplay>>`): How does the wallet display fees for a simple ETH transfer on L1? To test: initiate a send of any ETH amount to a different address on Ethereum mainnet and evaluate the fee display on the approval screen.
- `erc20L1Transfer` (`Support<WithRef<FeeDisplay>>`): How does the wallet display fees for a simple ERC-20 transfer on L1? To test: initiate a send of any ERC-20 token (e.g. USDC) to a different address on Ethereum mainnet and evaluate the fee display on the approval screen.
- `builtInErc20Swap` (`Support<WithRef<FeeDisplay>>`): If the wallet has a built-in ERC-20 swap feature, how are fees displayed? To test: use the wallet's own swap UI (not an external app) to swap one ERC-20 token for another (e.g. USDC → DAI) and evaluate the fee display on the approval screen. Set to not supported if the wallet has no built-in swap feature.
- `uniswapUSDCToEtherSwap` (`Support<WithRef<FeeDisplay>>`): For a Uniswap transaction exchanging USDC for Ether, initiated through the Uniswap frontend (not the wallet's built-in swap feature, if any), how are fees displayed in the wallet's transaction approval dialog? To test: go to app.uniswap.org, connect the wallet, set up a USDC→ETH swap, and evaluate the fee display shown in the wallet's approval popup — not the Uniswap UI itself.

---

## `src/schema/features/transparency/license.ts`

### Enum: `FOSSLicense`

A Free and Open Source license.

Licenses are mapped to their SPDX ID. https://spdx.org/licenses/

To identify: look for a LICENSE or LICENSE.md file in the wallet's source repository and match it to one of the values below. Most GitHub repositories also display the detected license on the repo's main page under the "License" label in the sidebar.

- `APACHE_2_0` = `'Apache-2.0'`: Apache License 2.0 — permissive; requires attribution and preservation of copyright/license notices.
- `GPL_3_0` = `'GPL-3.0'`: GNU General Public License v3.0 — strong copyleft; derivative works must also be licensed under GPL-3.0.
- `BSD_3_CLAUSE` = `'BSD-3-Clause'`: BSD 3-Clause License — permissive; requires attribution and prohibits use of the project name in endorsements.
- `MIT` = `'MIT'`: MIT License — very permissive; requires only that the copyright notice and license text are included.
- `MIT_WITH_CLAUSE` = `'MIT-C'`: MIT License with an additional restrictive clause that prevents it from qualifying as fully FOSS under the OSI definition. (e.g. MIT + Commons Clause, which prohibits selling the software commercially. The LICENSE file typically starts with the standard MIT text and appends a "Commons Clause" addendum at the end.) To identify: look for a LICENSE file whose text is MIT-based but includes additional restrictions. Do NOT use this for standard MIT — only when an extra clause is explicitly added.

---

### Enum: `FutureFOSSLicense`

A license that guarantees the code will later be Free and Open Source.

- `BUSL_1_1` = `'BUSL-1.1'`: Business Source License 1.1. The source code is publicly available, but commercial use is restricted until the "Change Date" specified in the license, after which it automatically converts to a specified FOSS license. (e.g. A wallet licensed under BUSL-1.1 with a Change Date of 2027-01-01 and a Change License of GPL-3.0 means the code becomes GPL-3.0 on that date.) To identify: look for a LICENSE file that contains "Business Source License" or "BUSL-1.1". The Change Date and eventual open-source license are both specified in the license file itself.

---

### Enum: `SourceAvailableNonFOSSLicense`

A license that represents source-available code, but not FOSS.

- `PROPRIETARY_SOURCE_AVAILABLE` = `'_PROPRIETARY_SOURCE_AVAILABLE'`: The source code is publicly available (e.g. on GitHub) but is covered by a proprietary license that does not meet the OSI definition of open source. (e.g. A wallet whose repository is public but whose LICENSE file says "All rights reserved", or uses a custom restrictive license that prohibits forking or redistribution.) To identify: the repository is publicly accessible, a LICENSE file is present, but the license is not OSI-approved and does not appear in the FOSSLicense or FutureFOSSLicense enums above.
- `UNLICENSED_VISIBLE` = `'_UNLICENSED_VISIBLE'`: The source code is publicly visible (e.g. the repository is public on GitHub) but no license file is present. Under copyright law, the absence of a license means all rights are reserved by default — the code cannot be legally used, modified, or redistributed. (e.g. A wallet with a public GitHub repo that has no LICENSE or COPYING file, and no license field in its package.json.) To identify: the repository is publicly accessible but has no LICENSE or COPYING file, and no license is declared in package.json or similar manifests.

---

### Enum: `SourceNotAvailableLicense`

Source licenses that are not source-available.

- `PROPRIETARY` = `'_PROPRIETARY'`: The wallet's source code is not publicly available. The wallet is distributed as a binary only, with no public source repository. (e.g. A closed-source wallet distributed only through an app store, with no public GitHub repository or published source code of any kind.) To identify: there is no public source code repository, or the repository contains only documentation, marketing pages, or build artifacts — not the actual wallet source code.

---

### Type: `SourceAvailableLicense`

A source-available code license.

```typescript
type SourceAvailableLicense = FOSSLicense | FutureFOSSLicense | SourceAvailableNonFOSSLicense
```

---

### Type: `License`

A source code license.

```typescript
type License = SourceAvailableLicense | SourceNotAvailableLicense
```

---

### Type: `LicenseWithRef`

A license and a reference.

```typescript
type LicenseWithRef = { license: License } &
	// If a source-available license, a reference must be provided.
	(| MustRef<{
				license: SourceAvailableLicense
		  }>
		// The reference is not necessary for source-unavailable licenses.
		| {
				ref: References | typeof refNotNecessary
				license: SourceNotAvailableLicense
		  }
	)
```

---

### Enum: `LicensingType`

Type of licensing by the wallet.

- `SINGLE_WALLET_REPO_AND_LICENSE` = `'SINGLE_WALLET_REPO_AND_LICENSE'`: There is a single repository that is entirely covered by a single license. This repository is all that is needed to build the wallet locally. (e.g. A wallet with one GitHub repo, one LICENSE file covering all its code, and no separate proprietary core dependency required to build it.)

  To identify: the wallet has one main source repository with one LICENSE file, and all wallet functionality can be built from that repository alone.

- `SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE` = `'SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE'`: The wallet's code is split between "core code" covered under a specific license, and wallet/app code that is covered under a different license.

  To identify: the wallet has separate repositories — or a monorepo with separate LICENSE files per package — where the signing/crypto library and the UI app carry different licenses.

---

### Type: `WalletLicensing`

License feature data for a wallet. Set to null if licensing information has not yet been researched.

```typescript
type WalletLicensing =
	| SingleWalletRepoAndLicense<VariantFeature<LicenseWithRef>>
	| SeparateCoreCodeVsWalletCodeLicense<VariantFeature<LicenseWithRef>>
	| null
```

---

### Type: `ResolvedWalletLicensing`

License feature data for a wallet, resolved for a single variant.

```typescript
type ResolvedWalletLicensing =
	| SingleWalletRepoAndLicense<ResolvedFeature<LicenseWithRef>>
	| SeparateCoreCodeVsWalletCodeLicense<ResolvedFeature<LicenseWithRef>>
	| null
```

---

### Enum: `FOSS`

An enum representing whether a given license is FOSS (Free and Open Source Software).

- `FOSS` = `'FOSS'`
- `FUTURE_FOSS` = `'FUTURE_FOSS'`
- `NOT_FOSS` = `'NOT_FOSS'`

---

## `src/schema/features/transparency/maintenance.ts`

### Enum: `MaintenanceType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `MaintenanceSupport`

- `type` (`MaintenanceType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `physicalDurability` (`MaintenanceType`)
- `mtbfDocumentation` (`MaintenanceType`)
- `repairability` (`MaintenanceType`)
- `batteryHandling` (`MaintenanceType`)
- `warrantyExtensions` (`MaintenanceType`)

---

### Type: `MaintenanceImplementation`

```typescript
type MaintenanceImplementation = WithRef<MaintenanceSupport>
```

---

## `src/schema/features/transparency/monetization.ts`

### Enum: `MonetizationStrategy`

A set of possible ways by which a wallet may fund its development.

This enum uses camelCase-style values because it is used as object key in the wallet features.

- `SELF_FUNDED` = `'selfFunded'`: Founders or the company fund development from their own capital.
- `DONATIONS` = `'donations'`: Funded by voluntary contributions from the community.
- `ECOSYSTEM_GRANTS` = `'ecosystemGrants'`: Funded by grants from Ethereum ecosystem organizations or foundations.
- `PUBLIC_OFFERING` = `'publicOffering'`: Funded via a public token or equity sale (e.g. ICO, IPO).
- `VENTURE_CAPITAL` = `'ventureCapital'`: Funded by venture capital firms in exchange for equity or tokens.
- `TRANSPARENT_CONVENIENCE_FEES` = `'transparentConvenienceFees'`: Earns revenue through fees on swaps, bridges, or other services that are disclosed to the user.
- `HIDDEN_CONVENIENCE_FEES` = `'hiddenConvenienceFees'`: Earns revenue through undisclosed markups or routing fees hidden from the user.
- `GOVERNANCE_TOKEN_LOW_FLOAT` = `'governanceTokenLowFloat'`: Has a governance token where most supply is held not by the community.
- `GOVERNANCE_TOKEN_MOSTLY_DISTRIBUTED` = `'governanceTokenMostlyDistributed'`: Has a governance token where most supply is distributed to the community.

---

### Type: `Monetization`

```typescript
type Monetization = WithRef<{
	revenueBreakdownIsPublic: boolean
	strategies: Record<MonetizationStrategy, boolean | null>
}>
```

---

## `src/schema/features/transparency/reputation.ts`

### Enum: `ReputationType`

- `PASS` = `'PASS'`
- `PARTIAL` = `'PARTIAL'`
- `FAIL` = `'FAIL'`

---

### Interface: `ReputationSupport`

- `type` (`ReputationType`)
- `url` (`string`, optional)
- `details` (`string`, optional)
- `originalProduct` (`ReputationType`)
- `availability` (`ReputationType`)
- `warrantySupportRisk` (`ReputationType`)
- `disclosureHistory` (`ReputationType`)
- `bugBounty` (`ReputationType`)

---

### Type: `ReputationImplementation`

```typescript
type ReputationImplementation = WithRef<ReputationSupport>
```

---
