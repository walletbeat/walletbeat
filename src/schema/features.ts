import type { DataCollection } from './features/privacy/data-collection'
import type { LicenseWithRef } from './features/transparency/license'
import { type ResolvedFeature, resolveFeature, type Variant, type VariantFeature } from './variants'
import type { Monetization } from './features/transparency/monetization'
import type { WithRef } from './reference'
import type { EthereumL1LightClientSupport } from './features/security/light-client'
import type { ChainConfigurability } from './features/self-sovereignty/chain-configurability'
import type { WalletProfile } from './features/profile'
import type { WalletIntegration } from './features/ecosystem/integration'
import type { AddressResolution } from './features/privacy/address-resolution'
import type { SecurityAudit } from './features/security/security-audits'
import type { TransactionSubmission } from './features/self-sovereignty/transaction-submission'
import type { AccountSupport } from './features/account-support'
import type { Support } from './features/support'
import type { ScamAlerts } from './features/security/scam-alerts'
import type { HardwareWalletSupport } from './features/security/hardware-wallet-support'
import type { HardwareWalletClearSigningSupport } from './features/security/hardware-wallet-clear-signing'
import type { FeeTransparencySupport } from './features/transparency/fee-transparency'
import type { PasskeyVerificationImplementation } from './features/security/passkey-verification'
import { type BugBountyProgramImplementation } from './features/security/bug-bounty-program'
import type { MaintenanceSupport } from './features/transparency/maintenance'
import type { ReputationSupport } from './features/transparency/reputation'
import type { HardwarePrivacySupport } from './features/privacy/hardware-privacy'
import type { EcosystemAlignmentSupport } from './features/ecosystem/ecosystem-alignment'
import type { FirmwareSupport } from './features/security/firmware'
import type { KeysHandlingSupport } from './features/security/keys-handling'
import type { SupplyChainDIYSupport } from './features/security/supply-chain-diy'
import type { SupplyChainFactorySupport } from './features/security/supply-chain-factory'
import type { InteroperabilitySupport } from './features/self-sovereignty/interoperability'

/**
 * A set of features about a wallet, each of which may or may not depend on
 * the wallet variant.
 */
export interface WalletFeatures {
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
		/** Support for alerting the user about potential scams. */
		scamAlerts: VariantFeature<ScamAlerts>

		/**
		 * Public security audits the wallet has gone through.
		 * If never audited, this should be an empty array, as 'null' represents
		 * the fact that we haven't checked whether there have been any audit.
		 */
		publicSecurityAudits: SecurityAudit[] | null

		/** Light clients. */
		lightClient: {
			/** Light client used for Ethereum L1. */
			ethereumL1: VariantFeature<Support<WithRef<EthereumL1LightClientSupport>>>
		}

		/** Hardware wallet support */
		hardwareWalletSupport: VariantFeature<HardwareWalletSupport>

		/** Hardware wallet clear signing support */
		hardwareWalletClearSigning: VariantFeature<HardwareWalletClearSigningSupport>

		/** Passkey verification implementation */
		passkeyVerification: VariantFeature<PasskeyVerificationImplementation>

		/** Bug bounty program implementation (for hardware wallets) */
		bugBountyProgram?: VariantFeature<BugBountyProgramImplementation>

		firmware?: VariantFeature<FirmwareSupport>
		keysHandling?: VariantFeature<KeysHandlingSupport>
		supplyChainDIY?: VariantFeature<SupplyChainDIYSupport>
		supplyChainFactory?: VariantFeature<SupplyChainFactorySupport>
	}

	/** Privacy features. */
	privacy: {
		/** Data collection information. */
		dataCollection: VariantFeature<DataCollection>

		/** Privacy policy URL of the wallet. */
		privacyPolicy: VariantFeature<string>

		hardwarePrivacy?: VariantFeature<HardwarePrivacySupport>
	}

	/** Self-sovereignty features. */
	selfSovereignty: {
		/** Describes the set of options for submitting transactions. */
		transactionSubmission: VariantFeature<TransactionSubmission>

		interoperability?: VariantFeature<InteroperabilitySupport>
	}

	/** Transparency features. */
	transparency: {
		/** Fee transparency information. */
		feeTransparency: VariantFeature<FeeTransparencySupport>

		reputation?: VariantFeature<ReputationSupport>
		maintenance?: VariantFeature<MaintenanceSupport>
	}

	/** Level of configurability for chains. */
	chainConfigurability: VariantFeature<ChainConfigurability>

	/** Which types of accounts the wallet supports. */
	accountSupport: VariantFeature<AccountSupport>

	/** Does the wallet support more than one Ethereum address? */
	multiAddress: VariantFeature<Support>

	/** Integration inside browsers, mobile phones, etc. */
	integration: WalletIntegration

	/** How the wallet resolves Ethereum addresses. */
	addressResolution: VariantFeature<WithRef<AddressResolution>>

	/** License of the wallet. */
	license: VariantFeature<LicenseWithRef>

	/** The monetization model of the wallet. */
	monetization: VariantFeature<Monetization>

	ecosystem?: {
		ecosystemAlignment?: VariantFeature<EcosystemAlignmentSupport>
	}
}

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
		scamAlerts: ResolvedFeature<ScamAlerts> | null
		publicSecurityAudits: SecurityAudit[] | null
		lightClient: {
			ethereumL1: ResolvedFeature<Support<WithRef<EthereumL1LightClientSupport>>>
		}
		hardwareWalletSupport: ResolvedFeature<HardwareWalletSupport>
		hardwareWalletClearSigning: ResolvedFeature<HardwareWalletClearSigningSupport>
		passkeyVerification: ResolvedFeature<PasskeyVerificationImplementation>
		bugBountyProgram?: ResolvedFeature<BugBountyProgramImplementation>
		firmware: ResolvedFeature<FirmwareSupport> | null
		keysHandling: ResolvedFeature<KeysHandlingSupport> | null
		supplyChainDIY: ResolvedFeature<SupplyChainDIYSupport> | null
		supplyChainFactory: ResolvedFeature<SupplyChainFactorySupport> | null
	}
	privacy: {
		dataCollection: ResolvedFeature<DataCollection>
		privacyPolicy: ResolvedFeature<string>
		hardwarePrivacy: ResolvedFeature<HardwarePrivacySupport> | null
	}
	selfSovereignty: {
		transactionSubmission: ResolvedFeature<TransactionSubmission>
		interoperability: ResolvedFeature<InteroperabilitySupport> | null
	}
	transparency: {
		feeTransparency: ResolvedFeature<FeeTransparencySupport>
		reputation: ResolvedFeature<ReputationSupport> | null
		maintenance: ResolvedFeature<MaintenanceSupport> | null
	}
	ecosystem: {
		ecosystemAlignment: ResolvedFeature<EcosystemAlignmentSupport> | null
	}
	chainConfigurability: ResolvedFeature<ChainConfigurability>
	accountSupport: ResolvedFeature<AccountSupport>
	multiAddress: ResolvedFeature<Support>
	integration: WalletIntegration
	addressResolution: ResolvedFeature<WithRef<AddressResolution>>
	license: ResolvedFeature<LicenseWithRef>
	monetization: ResolvedFeature<Monetization>
}

/** Resolve a set of features according to the given variant. */
export function resolveFeatures(features: WalletFeatures, variant: Variant): ResolvedFeatures {
	const feat = <F>(feature: VariantFeature<F>): ResolvedFeature<F> =>
		resolveFeature<F>(feature, variant)

	return {
		variant,
		profile: features.profile,
		security: {
			scamAlerts: feat(features.security.scamAlerts),
			publicSecurityAudits:
				features.security.publicSecurityAudits === null
					? null
					: features.security.publicSecurityAudits.filter(
							audit =>
								audit.variantsScope === 'ALL_VARIANTS' || audit.variantsScope[variant] === true,
						),
			lightClient: {
				ethereumL1: feat(features.security.lightClient.ethereumL1),
			},
			hardwareWalletSupport: feat(features.security.hardwareWalletSupport),
			hardwareWalletClearSigning: feat(features.security.hardwareWalletClearSigning),
			passkeyVerification: feat(features.security.passkeyVerification),
			bugBountyProgram: features.security.bugBountyProgram
				? feat(features.security.bugBountyProgram)
				: undefined,
			firmware: features.security.firmware ? feat(features.security.firmware) : null,
			keysHandling: features.security.keysHandling ? feat(features.security.keysHandling) : null,
			supplyChainDIY: features.security.supplyChainDIY
				? feat(features.security.supplyChainDIY)
				: null,
			supplyChainFactory: features.security.supplyChainFactory
				? feat(features.security.supplyChainFactory)
				: null,
		},
		privacy: {
			dataCollection: feat(features.privacy.dataCollection),
			privacyPolicy: feat(features.privacy.privacyPolicy),
			hardwarePrivacy: features.privacy.hardwarePrivacy
				? feat(features.privacy.hardwarePrivacy)
				: null,
		},
		selfSovereignty: {
			transactionSubmission: feat(features.selfSovereignty.transactionSubmission),
			interoperability: features.selfSovereignty.interoperability
				? feat(features.selfSovereignty.interoperability)
				: null,
		},
		transparency: {
			feeTransparency: feat(features.transparency.feeTransparency),
			reputation: features.transparency.reputation ? feat(features.transparency.reputation) : null,
			maintenance: features.transparency.maintenance
				? feat(features.transparency.maintenance)
				: null,
		},
		ecosystem: {
			ecosystemAlignment: features.ecosystem?.ecosystemAlignment
				? feat(features.ecosystem.ecosystemAlignment)
				: null,
		},
		chainConfigurability: feat(features.chainConfigurability),
		accountSupport: feat(features.accountSupport),
		multiAddress: feat(features.multiAddress),
		integration: features.integration,
		addressResolution: feat(features.addressResolution),
		license: feat(features.license),
		monetization: feat(features.monetization),
	}
}
