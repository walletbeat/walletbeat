import { prefixError } from '@/types/errors'
import { isNonNull, type Nullable, type NullableObject } from '@/types/utils/nullable'

import type { Entity } from './entity'
import type { AccountSupport } from './features/account-support'
import type { ChainAbstraction } from './features/ecosystem/chain-abstraction'
import type { DelegationHandling } from './features/ecosystem/delegation-handling'
import type { AppConnectionSupport } from './features/ecosystem/hw-app-connection-support'
import {
	notApplicableWalletIntegration,
	type ResolvedWalletIntegration,
	resolveWalletIntegrationFeatures,
	type WalletIntegration,
} from './features/ecosystem/integration'
import type { AddressResolution } from './features/privacy/address-resolution'
import type { AppIsolation as AppIsolation } from './features/privacy/app-isolation'
import type { CollectionPolicy, DataCollection } from './features/privacy/data-collection'
import type { HardwarePrivacySupport } from './features/privacy/hardware-privacy'
import type { TransactionPrivacy } from './features/privacy/transaction-privacy'
import type { WalletProfile } from './features/profile'
import type { AccountRecovery } from './features/security/account-recovery'
import type { BugBountyProgramImplementation } from './features/security/bug-bounty-program'
import type { DuressResistance } from './features/security/duress-resistance'
import type { FirmwareSupport } from './features/security/firmware'
import type { HardwareWalletSupport } from './features/security/hardware-wallet-support'
import type { KeysHandlingSupport } from './features/security/keys-handling'
import type { EthereumL1LightClientSupport } from './features/security/light-client'
import type { PasskeyVerificationImplementation } from './features/security/passkey-verification'
import type { ScamAlerts } from './features/security/scam-alerts'
import type { SecureElementSupport } from './features/security/secure-element'
import type { SecurityAudit } from './features/security/security-audits'
import type { SupplyChainDIYSupport } from './features/security/supply-chain-diy'
import type { SupplyChainFactorySupport } from './features/security/supply-chain-factory'
import type {
	HardwareTransactionLegibilityImplementation,
	SoftwareTransactionLegibilityImplementation,
} from './features/security/transaction-legibility'
import type { UserSafetySupport } from './features/security/user-safety'
import type { ChainConfigurability } from './features/self-sovereignty/chain-configurability'
import type { InteroperabilitySupport } from './features/self-sovereignty/interoperability'
import type { PermissionsManagementSupport } from './features/self-sovereignty/permissions-management'
import type { TransactionSubmission } from './features/self-sovereignty/transaction-submission'
import type { Support } from './features/support'
import type { BasicOperationFees } from './features/transparency/fee-display'
import {
	type ResolvedWalletLicensing,
	resolveWalletLicense,
	type WalletLicensing,
} from './features/transparency/license'
import type { MaintenanceSupport } from './features/transparency/maintenance'
import type { Monetization } from './features/transparency/monetization'
import type { ReputationSupport } from './features/transparency/reputation'
import type { WithRef } from './reference'
import {
	type AtLeastOneTrueVariant,
	type ResolvedFeature,
	resolveFeature,
	type Variant,
	type VariantFeature,
} from './variants'
import { variantToWalletType, type WalletType } from './wallet-types'

export type WalletAnalytics = WithRef<{
	/** Where analytics data goes. */
	entity: Entity

	/** Analytics data collection policy. */
	policy: Exclude<CollectionPolicy, CollectionPolicy.NEVER>
}>

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
		bugBountyProgram: VariantFeature<Support<BugBountyProgramImplementation>>

		/** Transaction legibility features. */
		transactionLegibility: VariantFeature<
			HardwareTransactionLegibilityImplementation | SoftwareTransactionLegibilityImplementation
		>

		/** Light clients. */
		lightClient: {
			/** Light client used for Ethereum L1. */
			ethereumL1: VariantFeature<Support<WithRef<EthereumL1LightClientSupport>>>
		}

		/** How can users of the wallet recover their account? */
		accountRecovery: VariantFeature<AccountRecovery>

		/**
		 * Duress resistance features, covering both basic lock-screen
		 * protection and dedicated duress-PIN mechanisms (decoy wallet or
		 * self-destruct-and-forward).
		 *
		 */
		duressResistance: VariantFeature<DuressResistance>

		/** How are secret keys handled? */
		keysHandling: VariantFeature<WithRef<KeysHandlingSupport>>
	}

	/** Privacy features. */
	privacy: {
		/**
		 * Data collection information.
		 * See /docs/mitmproxy-guide for how to collect this.
		 */
		dataCollection: VariantFeature<DataCollection>

		/** Privacy policy URL of the wallet. */
		privacyPolicy: VariantFeature<string>

		/** Transaction privacy features. */
		transactionPrivacy: VariantFeature<TransactionPrivacy>

		/**
		 * Wallet analytics collectors and consent policy.
		 * Use `NOT_SUPPORTED` when a type of analytics is not used by the wallet.
		 */
		analytics: {
			/** Product analytics / UI usage tracking telemetry. */
			usage: VariantFeature<Support<WalletAnalytics>>

			/** Crash and error reporting telemetry. */
			crashReports: VariantFeature<Support<WalletAnalytics>>
		}
	}

	/** Self-sovereignty features. */
	selfSovereignty: object // Expanded in subtypes.

	/** Transparency features. */
	transparency: {
		/** Information on how fees are displayed for basic operations. */
		operationFees: VariantFeature<Nullable<BasicOperationFees>>
	}

	/** Which types of accounts the wallet supports. */
	accountSupport: VariantFeature<AccountSupport>

	/** Does the wallet support more than one Ethereum address? */
	multiAddress: VariantFeature<Support>

	/**
	 * License of the wallet.
	 * Variant specificity handled internally to `WalletLicense` type.
	 */
	licensing: WalletLicensing

	/** The monetization model of the wallet. */
	monetization: VariantFeature<Monetization>
}

export type WalletFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & {
		scamAlerts: VariantFeature<Nullable<ScamAlerts>>
		hardwareWalletSupport: VariantFeature<HardwareWalletSupport>
		passkeyVerification: VariantFeature<Support<PasskeyVerificationImplementation>>
		firmware: VariantFeature<FirmwareSupport>
		supplyChainDIY: VariantFeature<SupplyChainDIYSupport>
		supplyChainFactory: VariantFeature<SupplyChainFactorySupport>
		userSafety: VariantFeature<UserSafetySupport>
		secureElement: VariantFeature<Support<SecureElementSupport>>
	}
	privacy: WalletBaseFeatures['privacy'] & {
		appIsolation: VariantFeature<Nullable<AppIsolation>>
		hardwarePrivacy: VariantFeature<HardwarePrivacySupport>
	}
	selfSovereignty: WalletBaseFeatures['selfSovereignty'] & {
		transactionSubmission: VariantFeature<Nullable<TransactionSubmission>>
		permissionsManagement: VariantFeature<Support<PermissionsManagementSupport>>
		interoperability: VariantFeature<InteroperabilitySupport>
	}
	transparency: WalletBaseFeatures['transparency'] & {
		reputation: VariantFeature<ReputationSupport>
		maintenance: VariantFeature<MaintenanceSupport>
	}
	ecosystem: {
		delegation: VariantFeature<DelegationHandling>
	}
	chainConfigurability: VariantFeature<Support<WithRef<Nullable<ChainConfigurability>>>>
	integration: WalletIntegration
	addressResolution: VariantFeature<Nullable<WithRef<AddressResolution>>>
	chainAbstraction: VariantFeature<Nullable<ChainAbstraction>>
	appConnectionSupport: VariantFeature<AppConnectionSupport>
}

export type CanonicalWalletFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & Partial<WalletFeatures['security']>
	privacy: WalletBaseFeatures['privacy'] & Partial<WalletFeatures['privacy']>
	selfSovereignty: WalletBaseFeatures['selfSovereignty'] &
		Partial<WalletFeatures['selfSovereignty']>
	transparency: WalletBaseFeatures['transparency'] & Partial<WalletFeatures['transparency']>
} & Partial<
		Pick<
			WalletFeatures,
			| 'ecosystem'
			| 'chainConfigurability'
			| 'integration'
			| 'addressResolution'
			| 'chainAbstraction'
			| 'appConnectionSupport'
		>
	>

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
		permissionsManagement: VariantFeature<Support<PermissionsManagementSupport>>
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

/**
 * Type predicate for WalletHardwareFeatures.
 */
export function isWalletHardwareFeatures(
	baseFeatures: WalletBaseFeatures,
): baseFeatures is WalletHardwareFeatures {
	return Object.hasOwn(baseFeatures.security, 'firmware')
}

/**
 * Type predicate for WalletEmbeddedFeatures.
 */
export function isWalletEmbeddedFeatures(
	baseFeatures: WalletBaseFeatures,
): baseFeatures is WalletEmbeddedFeatures {
	return (
		!isWalletSoftwareFeatures(baseFeatures) &&
		!isWalletHardwareFeatures(baseFeatures) &&
		Object.hasOwn(baseFeatures.security, 'passkeyVerification')
	)
}
/**
 * A set of features for any embedded wallet.
 *
 * None of the fields in this type should be marked as possibly `undefined`.
 * If you want to add a new field, you need to add it to all existing wallets,
 * even if unrated (i.e. `null`).
 */
export type WalletEmbeddedFeatures = WalletBaseFeatures & {
	security: WalletBaseFeatures['security'] & {
		passkeyVerification: VariantFeature<Support<PasskeyVerificationImplementation>>
	}
}

export function completeWalletFeatures(features: WalletBaseFeatures): WalletFeatures {
	const softwareFeatures = isWalletSoftwareFeatures(features) ? features : null
	const hardwareFeatures = isWalletHardwareFeatures(features) ? features : null

	return {
		...features,
		security: {
			...features.security,
			scamAlerts: softwareFeatures?.security.scamAlerts ?? null,
			hardwareWalletSupport: softwareFeatures?.security.hardwareWalletSupport ?? null,
			passkeyVerification: softwareFeatures?.security.passkeyVerification ?? null,
			firmware: hardwareFeatures?.security.firmware ?? null,
			supplyChainDIY: hardwareFeatures?.security.supplyChainDIY ?? null,
			supplyChainFactory: hardwareFeatures?.security.supplyChainFactory ?? null,
			userSafety: hardwareFeatures?.security.userSafety ?? null,
			secureElement: hardwareFeatures?.security.secureElement ?? null,
		},
		privacy: {
			...features.privacy,
			appIsolation: softwareFeatures?.privacy.appIsolation ?? null,
			hardwarePrivacy: hardwareFeatures?.privacy.hardwarePrivacy ?? null,
		},
		selfSovereignty: {
			transactionSubmission: softwareFeatures?.selfSovereignty.transactionSubmission ?? null,
			permissionsManagement: softwareFeatures?.selfSovereignty.permissionsManagement ?? null,
			interoperability: hardwareFeatures?.selfSovereignty.interoperability ?? null,
		},
		transparency: {
			...features.transparency,
			reputation: hardwareFeatures?.transparency.reputation ?? null,
			maintenance: hardwareFeatures?.transparency.maintenance ?? null,
		},
		ecosystem: softwareFeatures?.ecosystem ?? {
			delegation: null,
		},
		chainConfigurability: softwareFeatures?.chainConfigurability ?? null,
		integration: softwareFeatures?.integration ?? notApplicableWalletIntegration,
		addressResolution: softwareFeatures?.addressResolution ?? null,
		chainAbstraction: softwareFeatures?.chainAbstraction ?? null,
		appConnectionSupport: hardwareFeatures?.appConnectionSupport ?? null,
	}
}

/**
 * A set of features about a specific wallet variant.
 * All features are resolved to a single variant here.
 */
export interface ResolvedFeatures {
	/**
	 * The wallet variant which was used to resolve the feature tree.
	 */
	variant: Variant

	/**
	 * The type of the wallet.
	 * This is a shorthand for `variantToWalletType(variant)`, meant to be used
	 * for easy filtering in attribute evaluation code.
	 */
	type: WalletType

	/** The profile of the wallet. */
	profile: WalletProfile

	security: {
		scamAlerts: ResolvedFeature<ScamAlerts>
		publicSecurityAudits: SecurityAudit[] | null
		lightClient: {
			ethereumL1: ResolvedFeature<Support<WithRef<EthereumL1LightClientSupport>>>
		}
		hardwareWalletSupport: ResolvedFeature<HardwareWalletSupport>
		transactionLegibility: ResolvedFeature<
			HardwareTransactionLegibilityImplementation | SoftwareTransactionLegibilityImplementation
		>
		passkeyVerification: ResolvedFeature<Support<PasskeyVerificationImplementation>>
		bugBountyProgram: ResolvedFeature<Support<BugBountyProgramImplementation>>
		firmware: ResolvedFeature<FirmwareSupport>
		keysHandling: ResolvedFeature<WithRef<KeysHandlingSupport>>
		supplyChainDIY: ResolvedFeature<SupplyChainDIYSupport>
		supplyChainFactory: ResolvedFeature<SupplyChainFactorySupport>
		userSafety: ResolvedFeature<UserSafetySupport>
		accountRecovery: ResolvedFeature<AccountRecovery>
		duressResistance: ResolvedFeature<DuressResistance>
	}
	privacy: {
		analytics: {
			usage: ResolvedFeature<Support<WalletAnalytics>>
			crashReports: ResolvedFeature<Support<WalletAnalytics>>
		}
		dataCollection: ResolvedFeature<DataCollection>
		privacyPolicy: ResolvedFeature<string>
		hardwarePrivacy: ResolvedFeature<HardwarePrivacySupport>
		transactionPrivacy: ResolvedFeature<TransactionPrivacy>
		appIsolation: ResolvedFeature<AppIsolation>
	}
	selfSovereignty: {
		transactionSubmission: ResolvedFeature<TransactionSubmission>
		interoperability: ResolvedFeature<InteroperabilitySupport>
		permissionsManagement: ResolvedFeature<Support<PermissionsManagementSupport>>
	}
	transparency: {
		operationFees: ResolvedFeature<BasicOperationFees>
		reputation: ResolvedFeature<ReputationSupport>
		maintenance: ResolvedFeature<MaintenanceSupport>
	}
	chainAbstraction: ResolvedFeature<ChainAbstraction>
	chainConfigurability: ResolvedFeature<Support<WithRef<ChainConfigurability>>>
	accountSupport: ResolvedFeature<AccountSupport>
	multiAddress: ResolvedFeature<Support>
	integration: ResolvedWalletIntegration
	addressResolution: ResolvedFeature<WithRef<AddressResolution>>
	licensing: ResolvedWalletLicensing
	monetization: ResolvedFeature<Monetization>
	appConnectionSupport: ResolvedFeature<AppConnectionSupport>
}

/** Resolve a set of features according to the given variant. */
export function resolveFeatures(
	features: WalletBaseFeatures,
	expectedVariants: AtLeastOneTrueVariant,
	variant: Variant,
): ResolvedFeatures {
	const completeFeatures = completeWalletFeatures(features)
	const resolveFeat = <F>(
		featureName: string,
		feature: VariantFeature<F>,
		expectedVariants: AtLeastOneTrueVariant,
		variant: Variant,
	): ResolvedFeature<F> => {
		try {
			return resolveFeature<F>(feature, expectedVariants, variant)
		} catch (e) {
			throw prefixError(`Feature ${featureName}`, e)
		}
	}
	const nullable = <F extends NullableObject>(
		obj: ResolvedFeature<Nullable<F>>,
	): ResolvedFeature<F> => {
		return isNonNull<F>(obj) ? obj : null
	}
	const baseFeat = <F>(
		featureName: string,
		featureFn: (baseFeatures: WalletFeatures) => VariantFeature<F>,
	): ResolvedFeature<F> =>
		resolveFeat<F>(featureName, featureFn(completeFeatures), expectedVariants, variant)

	return {
		variant,
		type: variantToWalletType(variant),
		profile: completeFeatures.profile,
		security: {
			scamAlerts: nullable(
				baseFeat('security.scamAlerts', features => features.security.scamAlerts),
			),
			publicSecurityAudits:
				completeFeatures.security.publicSecurityAudits === null
					? null
					: completeFeatures.security.publicSecurityAudits.filter(
							audit =>
								audit.variantsScope === 'ALL_VARIANTS' || audit.variantsScope[variant] === true,
						),
			lightClient: {
				ethereumL1: baseFeat(
					'security.lightClient.ethereumL1',
					features => features.security.lightClient.ethereumL1,
				),
			},
			hardwareWalletSupport: baseFeat(
				'security.hardwareWalletSupport',
				features => features.security.hardwareWalletSupport,
			),
			transactionLegibility: baseFeat(
				'security.transactionLegibility',
				features => features.security.transactionLegibility,
			),
			passkeyVerification: baseFeat(
				'security.passkeyVerification',
				features => features.security.passkeyVerification,
			),
			bugBountyProgram: baseFeat(
				'bugBountyProgram',
				features => features.security.bugBountyProgram,
			),
			firmware: baseFeat('security.firmware', features => features.security.firmware),
			keysHandling: baseFeat('security.keysHandling', features => features.security.keysHandling),
			supplyChainDIY: baseFeat(
				'security.supplyChainDIY',
				features => features.security.supplyChainDIY,
			),
			supplyChainFactory: baseFeat(
				'security.supplyChainFactory',
				features => features.security.supplyChainFactory,
			),
			userSafety: baseFeat('security.userSafety', features => features.security.userSafety),
			accountRecovery: baseFeat(
				'security.accountRecovery',
				features => features.security.accountRecovery,
			),
			duressResistance: baseFeat(
				'security.duressResistance',
				features => features.security.duressResistance,
			),
		},
		privacy: {
			analytics: {
				usage: baseFeat('privacy.analytics.usage', features => features.privacy.analytics.usage),
				crashReports: baseFeat(
					'privacy.analytics.crashReports',
					features => features.privacy.analytics.crashReports,
				),
			},
			dataCollection: baseFeat(
				'privacy.dataCollection',
				features => features.privacy.dataCollection,
			),
			privacyPolicy: baseFeat('privacy.privacyPolicy', features => features.privacy.privacyPolicy),
			hardwarePrivacy: baseFeat(
				'privacy.hardwarePrivacy',
				features => features.privacy.hardwarePrivacy,
			),
			transactionPrivacy: baseFeat(
				'privacy.transactionPrivacy',
				features => features.privacy.transactionPrivacy,
			),
			appIsolation: nullable(
				baseFeat('privacy.appIsolation', features => features.privacy.appIsolation),
			),
		},
		selfSovereignty: {
			transactionSubmission: nullable(
				baseFeat(
					'selfSovereignty.transactionSubmission',
					features => features.selfSovereignty.transactionSubmission,
				),
			),
			permissionsManagement: baseFeat(
				'selfSovereignty.permissionsManagement',
				features => features.selfSovereignty.permissionsManagement,
			),
			interoperability: baseFeat(
				'selfSovereignty.interoperability',
				features => features.selfSovereignty.interoperability,
			),
		},
		transparency: {
			operationFees: nullable(
				baseFeat('transparency.operationFees', features => features.transparency.operationFees),
			),
			reputation: baseFeat('transparency.reputation', features => features.transparency.reputation),
			maintenance: baseFeat(
				'transparency.maintenance',
				features => features.transparency.maintenance,
			),
		},
		chainAbstraction: nullable(baseFeat('chainAbstraction', features => features.chainAbstraction)),
		chainConfigurability: nullable<Support<WithRef<ChainConfigurability>>>(
			baseFeat('chainConfigurability', features => features.chainConfigurability),
		),
		accountSupport: baseFeat('accountSupport', features => features.accountSupport),
		multiAddress: baseFeat('multiAddress', features => features.multiAddress),
		integration: resolveWalletIntegrationFeatures(
			completeFeatures.integration,
			expectedVariants,
			variant,
		),
		addressResolution: nullable(
			baseFeat('addressResolution', features => features.addressResolution),
		),
		licensing: resolveWalletLicense(completeFeatures.licensing, expectedVariants, variant),
		monetization: baseFeat('monetization', features => features.monetization),
		appConnectionSupport: baseFeat(
			'appConnectionSupport',
			features => features.appConnectionSupport,
		),
	}
}
