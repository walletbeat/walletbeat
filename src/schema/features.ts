import type { AccountSupport } from './features/account-support'
import {
	notApplicableWalletIntegration,
	type ResolvedWalletIntegration,
	resolveWalletIntegrationFeatures,
	type WalletIntegration,
} from './features/ecosystem/integration'
import type { AddressResolution } from './features/privacy/address-resolution'
import type { DataCollection } from './features/privacy/data-collection'
import type { HardwarePrivacySupport } from './features/privacy/hardware-privacy'
import type { TransactionPrivacy } from './features/privacy/transaction-privacy'
import type { WalletProfile } from './features/profile'
import type { BugBountyProgramImplementation } from './features/security/bug-bounty-program'
import type { FirmwareSupport } from './features/security/firmware'
import type { HardwareWalletDappSigningImplementation } from './features/security/hardware-wallet-dapp-signing'
import type { HardwareWalletSupport } from './features/security/hardware-wallet-support'
import type { KeysHandlingSupport } from './features/security/keys-handling'
import type { EthereumL1LightClientSupport } from './features/security/light-client'
import type { PasskeyVerificationImplementation } from './features/security/passkey-verification'
import type { ScamAlerts } from './features/security/scam-alerts'
import type { SecurityAudit } from './features/security/security-audits'
import type { SupplyChainDIYSupport } from './features/security/supply-chain-diy'
import type { SupplyChainFactorySupport } from './features/security/supply-chain-factory'
import type { UserSafetySupport } from './features/security/user-safety'
import type { ChainConfigurability } from './features/self-sovereignty/chain-configurability'
import type { InteroperabilitySupport } from './features/self-sovereignty/interoperability'
import type { TransactionSubmission } from './features/self-sovereignty/transaction-submission'
import type { Support } from './features/support'
import type { FeeTransparencySupport } from './features/transparency/fee-transparency'
import type { LicenseWithRef } from './features/transparency/license'
import type { MaintenanceSupport } from './features/transparency/maintenance'
import type { Monetization } from './features/transparency/monetization'
import type { ReputationSupport } from './features/transparency/reputation'
import type { WithRef } from './reference'
import { type ResolvedFeature, resolveFeature, type Variant, type VariantFeature } from './variants'

/**
 * A set of features about any type of wallet.
 *
 * None of the fields in this type should be marked as possibly `undefined`.
 * If you want to add a new field, you need to add it to all existing wallets,
 * even if unrated (i.e. `null`).
 */
export interface WalletBaseFeatures {
	/**
	 * The profile of the wallet, determining the use-cases and audience
	 * that it is meant for. This has impact on which attributes are relevant
	 * to it, and which attributes it is exempt from.
	 * This is *not* per-variant, because users would not expect that a single
	 * wallet would fulfill different use-cases depending on which variant of
	 * the wallet they install.
	 */
	profile: WalletProfile

	/** Security features. */
	security: {
		/**
		 * Public security audits the wallet has gone through.
		 * If never audited, this should be an empty array, as 'null' represents
		 * the fact that we haven't checked whether there have been any audit.
		 */
		publicSecurityAudits: SecurityAudit[] | null

		/** Bug bounty program implementation */
		bugBountyProgram: VariantFeature<BugBountyProgramImplementation>

		/** Light clients. */
		lightClient: {
			/** Light client used for Ethereum L1. */
			ethereumL1: VariantFeature<Support<WithRef<EthereumL1LightClientSupport>>>
		}

		/** Passkey verification implementation */
		passkeyVerification: VariantFeature<PasskeyVerificationImplementation>
	}

	/** Privacy features. */
	privacy: {
		/** Data collection information. */
		dataCollection: VariantFeature<DataCollection>

		/** Privacy policy URL of the wallet. */
		privacyPolicy: VariantFeature<string>

		/** Transaction privacy features. */
		transactionPrivacy: VariantFeature<TransactionPrivacy>
	}

	/** Self-sovereignty features. */
	selfSovereignty: object // Expanded in subtypes.

	/** Transparency features. */
	transparency: {
		/** Fee transparency information. */
		feeTransparency: VariantFeature<FeeTransparencySupport>
	}

	/** Which types of accounts the wallet supports. */
	accountSupport: VariantFeature<AccountSupport>

	/** Does the wallet support more than one Ethereum address? */
	multiAddress: VariantFeature<Support>

	/** License of the wallet. */
	license: VariantFeature<LicenseWithRef>

	/** The monetization model of the wallet. */
	monetization: VariantFeature<Monetization>
}

/**
 * A set of features for any software wallet.
 *
 * None of the fields in this type should be marked as possibly `undefined`.
 * If you want to add a new field, you need to add it to all existing wallets,
 * even if unrated (i.e. `null`).
 */
export type WalletSoftwareFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & {
		/** Support for alerting the user about potential scams. */
		scamAlerts: VariantFeature<ScamAlerts>

		/** Hardware wallet support */
		hardwareWalletSupport: VariantFeature<HardwareWalletSupport>

		/** Passkey verification implementation */
		passkeyVerification: VariantFeature<PasskeyVerificationImplementation>
	}

	/** Self-sovereignty features. */
	selfSovereignty: WalletBaseFeatures['selfSovereignty'] & {
		/** Describes the set of options for submitting transactions. */
		transactionSubmission: VariantFeature<TransactionSubmission>
	}

	/** Level of configurability for chains. */
	chainConfigurability: VariantFeature<ChainConfigurability>

	/** Integration inside browsers, mobile phones, etc. */
	integration: WalletIntegration

	/** How the wallet resolves Ethereum addresses. */
	addressResolution: VariantFeature<WithRef<AddressResolution>>
}

/**
 * Type predicate for WalletSoftwareFeatures.
 */
export function isWalletSoftwareFeatures(
	baseFeatures: WalletBaseFeatures,
): baseFeatures is WalletSoftwareFeatures {
	return Object.hasOwn(baseFeatures, 'chainConfigurability')
}

/**
 * A set of features for any hardware wallet.
 *
 * None of the fields in this type should be marked as possibly `undefined`.
 * If you want to add a new field, you need to add it to all existing wallets,
 * even if unrated (i.e. `null`).
 */
export type WalletHardwareFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & {
		/** Hardware wallet dApp signing support */
		hardwareWalletDappSigning: VariantFeature<HardwareWalletDappSigningImplementation>

		firmware: VariantFeature<FirmwareSupport>
		keysHandling: VariantFeature<KeysHandlingSupport>
		supplyChainDIY: VariantFeature<SupplyChainDIYSupport>
		supplyChainFactory: VariantFeature<SupplyChainFactorySupport>
		userSafety: VariantFeature<UserSafetySupport>
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
}

/**
 * Type predicate for WalletHardwareFeatures.
 */
export function isWalletHardwareFeatures(
	baseFeatures: WalletBaseFeatures,
): baseFeatures is WalletHardwareFeatures {
	return Object.hasOwn(baseFeatures.security, 'firmware')
}

/**
 * A set of features for any embedded wallet.
 *
 * None of the fields in this type should be marked as possibly `undefined`.
 * If you want to add a new field, you need to add it to all existing wallets,
 * even if unrated (i.e. `null`).
 */
export type WalletEmbeddedFeatures = WalletBaseFeatures & {}

/**
 * A set of features about a specific wallet variant.
 * All features are resolved to a single variant here.
 */
export interface ResolvedFeatures {
	/** The wallet variant which was used to resolve the feature tree. */
	variant: Variant

	/** The profile of the wallet. */
	profile: WalletProfile

	security: {
		scamAlerts: ResolvedFeature<ScamAlerts>
		publicSecurityAudits: SecurityAudit[] | null
		lightClient: {
			ethereumL1: ResolvedFeature<Support<WithRef<EthereumL1LightClientSupport>>>
		}
		hardwareWalletSupport: ResolvedFeature<HardwareWalletSupport>
		hardwareWalletDappSigning: ResolvedFeature<HardwareWalletDappSigningImplementation>
		passkeyVerification: ResolvedFeature<PasskeyVerificationImplementation>
		bugBountyProgram: ResolvedFeature<BugBountyProgramImplementation>
		firmware: ResolvedFeature<FirmwareSupport>
		keysHandling: ResolvedFeature<KeysHandlingSupport>
		supplyChainDIY: ResolvedFeature<SupplyChainDIYSupport>
		supplyChainFactory: ResolvedFeature<SupplyChainFactorySupport>
		userSafety: ResolvedFeature<UserSafetySupport>
	}
	privacy: {
		dataCollection: ResolvedFeature<DataCollection>
		privacyPolicy: ResolvedFeature<string>
		hardwarePrivacy: ResolvedFeature<HardwarePrivacySupport>
		transactionPrivacy: ResolvedFeature<TransactionPrivacy>
	}
	selfSovereignty: {
		transactionSubmission: ResolvedFeature<TransactionSubmission>
		interoperability: ResolvedFeature<InteroperabilitySupport>
	}
	transparency: {
		feeTransparency: ResolvedFeature<FeeTransparencySupport>
		reputation: ResolvedFeature<ReputationSupport>
		maintenance: ResolvedFeature<MaintenanceSupport>
	}
	chainConfigurability: ResolvedFeature<ChainConfigurability>
	accountSupport: ResolvedFeature<AccountSupport>
	multiAddress: ResolvedFeature<Support>
	integration: ResolvedWalletIntegration
	addressResolution: ResolvedFeature<WithRef<AddressResolution>>
	license: ResolvedFeature<LicenseWithRef>
	monetization: ResolvedFeature<Monetization>
}

/** Resolve a set of features according to the given variant. */
export function resolveFeatures(features: WalletBaseFeatures, variant: Variant): ResolvedFeatures {
	const baseFeat = <F>(
		featureFn: (baseFeatures: WalletBaseFeatures) => VariantFeature<F>,
	): ResolvedFeature<F> => resolveFeature<F>(featureFn(features), variant)

	const softwareFeat = <F>(
		featureFn: (softwareFeatures: WalletSoftwareFeatures) => VariantFeature<F>,
	): ResolvedFeature<F> => {
		if (!isWalletSoftwareFeatures(features)) {
			return null
		}

		return resolveFeature<F>(featureFn(features), variant)
	}
	const hardwareFeat = <F>(
		featureFn: (hardwareFeatures: WalletHardwareFeatures) => VariantFeature<F>,
	): ResolvedFeature<F> => {
		if (!isWalletHardwareFeatures(features)) {
			return null
		}

		return resolveFeature<F>(featureFn(features), variant)
	}

	return {
		variant,
		profile: features.profile,
		security: {
			scamAlerts: softwareFeat(features => features.security.scamAlerts),
			publicSecurityAudits:
				features.security.publicSecurityAudits === null
					? null
					: features.security.publicSecurityAudits.filter(
							audit =>
								audit.variantsScope === 'ALL_VARIANTS' || audit.variantsScope[variant] === true,
						),
			lightClient: {
				ethereumL1: softwareFeat(features => features.security.lightClient.ethereumL1),
			},
			hardwareWalletSupport: softwareFeat(features => features.security.hardwareWalletSupport),
			hardwareWalletDappSigning: hardwareFeat(
				features => features.security.hardwareWalletDappSigning,
			),
			passkeyVerification: baseFeat(features => features.security.passkeyVerification),
			bugBountyProgram: hardwareFeat(features => features.security.bugBountyProgram),
			firmware: hardwareFeat(features => features.security.firmware),
			keysHandling: hardwareFeat(features => features.security.keysHandling),
			supplyChainDIY: hardwareFeat(features => features.security.supplyChainDIY),
			supplyChainFactory: hardwareFeat(features => features.security.supplyChainFactory),
			userSafety: hardwareFeat(features => features.security.userSafety),
		},
		privacy: {
			dataCollection: baseFeat(features => features.privacy.dataCollection),
			privacyPolicy: baseFeat(features => features.privacy.privacyPolicy),
			hardwarePrivacy: hardwareFeat(features => features.privacy.hardwarePrivacy),
			transactionPrivacy: baseFeat(features => features.privacy.transactionPrivacy),
		},
		selfSovereignty: {
			transactionSubmission: softwareFeat(
				features => features.selfSovereignty.transactionSubmission,
			),
			interoperability: hardwareFeat(features => features.selfSovereignty.interoperability),
		},
		transparency: {
			feeTransparency: baseFeat(features => features.transparency.feeTransparency),
			reputation: hardwareFeat(features => features.transparency.reputation),
			maintenance: hardwareFeat(features => features.transparency.maintenance),
		},
		chainConfigurability: softwareFeat(features => features.chainConfigurability),
		accountSupport: baseFeat(features => features.accountSupport),
		multiAddress: baseFeat(features => features.multiAddress),
		integration: resolveWalletIntegrationFeatures(
			isWalletSoftwareFeatures(features) ? features.integration : notApplicableWalletIntegration,
			variant,
		),
		addressResolution: softwareFeat(features => features.addressResolution),
		license: baseFeat(features => features.license),
		monetization: baseFeat(features => features.monetization),
	}
}
