import { sentence } from '@/types/content'
import type { Dict } from '@/types/utils/dict'
import {
	isNonEmptyArray,
	nonEmptyGet,
	type NonEmptyRecord,
	nonEmptyRemap,
	nonEmptyValues,
} from '@/types/utils/non-empty'

import {
	type Attribute,
	type AttributeGroup,
	defaultRatingScore,
	type EvaluatedAttribute,
	evaluatedAttributes,
	type EvaluatedGroup,
	EvaluationContext,
	isExempt,
	type OutcomeMetadata,
	Rating,
	type ValueSet,
} from './attributes'
import { accountAbstraction } from './attributes/ecosystem/account-abstraction'
import {
	addressResolution,
	type AddressResolutionMetadata,
} from './attributes/ecosystem/address-resolution'
import {
	browserIntegration,
	type BrowserIntegrationMetadata,
} from './attributes/ecosystem/browser-integration'
import { chainAbstraction } from './attributes/ecosystem/chain-abstraction'
import {
	hardwareWalletInteroperability,
	type HardwareWalletInteroperabilityMetadata,
} from './attributes/ecosystem/hardware-wallet-interoperability'
import { appConnectionSupport } from './attributes/ecosystem/hw-app-connection-support'
import { transactionBatching } from './attributes/ecosystem/transaction-batching'
import {
	addressCorrelation,
	type AddressCorrelationMetadata,
} from './attributes/privacy/address-correlation'
import { appIsolation } from './attributes/privacy/app-isolation'
import {
	hardwarePrivacy,
	type HardwarePrivacyMetadata,
} from './attributes/privacy/hardware-privacy'
import { multiAddressCorrelation } from './attributes/privacy/multi-address-correlation'
import { privacyHygiene } from './attributes/privacy/privacy-hygiene'
import {
	privateTransfers,
	type PrivateTransfersMetadata,
} from './attributes/privacy/private-transfers'
import {
	accountRecovery,
	type AccountRecoveryMetadata,
} from './attributes/security/account-recovery'
import { bugBountyProgram } from './attributes/security/bug-bounty-program'
import { chainVerification } from './attributes/security/chain-verification'
import { duressResistance } from './attributes/security/duress-resistance'
import { firmware, type FirmwareMetadata } from './attributes/security/firmware'
import {
	hardwareWalletSupport,
	type HardwareWalletSupportMetadata,
} from './attributes/security/hardware-wallet-support'
import { scamPrevention, type ScamPreventionMetadata } from './attributes/security/scam-prevention'
import { securityAudits, type SecurityAuditsMetadata } from './attributes/security/security-audits'
import {
	securityBestPractices,
	type SecurityBestPracticesValue,
} from './attributes/security/security-best-practices'
import { supplyChainDIY, type SupplyChainDIYMetadata } from './attributes/security/supply-chain-diy'
import {
	supplyChainFactory,
	type SupplyChainFactoryMetadata,
} from './attributes/security/supply-chain-factory'
import { transactionLegibility } from './attributes/security/transaction-legibility'
import { userSafety, type UserSafetyMetadata } from './attributes/security/user-safety'
import { accountPortability } from './attributes/self-sovereignty/account-portability'
import {
	accountUnruggability,
	type AccountUnruggabilityMetadata,
} from './attributes/self-sovereignty/account-unruggability'
import {
	interoperability,
	type InteroperabilityMetadata,
} from './attributes/self-sovereignty/interoperability'
import { l1ProviderIndependence } from './attributes/self-sovereignty/l1-provider-independence'
import { permissionsManagement } from './attributes/self-sovereignty/permissions-management'
import { transactionInclusion } from './attributes/self-sovereignty/transaction-inclusion'
import {
	feeTransparency,
	type FeeTransparencyMetadata,
} from './attributes/transparency/fee-transparency'
import { funding } from './attributes/transparency/funding'
import { maintenance, type MaintenanceMetadata } from './attributes/transparency/maintenance'
import { openSource } from './attributes/transparency/open-source'
import { releaseProcess } from './attributes/transparency/release-process'
import { reputation, type ReputationMetadata } from './attributes/transparency/reputation'
import { sourceVisibility } from './attributes/transparency/source-visibility'
import type { ResolvedFeatures } from './features'
import { type MaybeUnratedScore, type Score, type WeightedScore, weightedScore } from './score'
import type { AtLeastOneVariant, Variant } from './variants'
import type { WalletMetadata } from './wallet'

/** A ValueSet for security Values. */
type SecurityValues = Dict<{
	securityAudits: SecurityAuditsMetadata
	scamPrevention: ScamPreventionMetadata
	chainVerification: null
	transactionLegibility: null
	hardwareWalletSupport: HardwareWalletSupportMetadata
	securityBestPractices: SecurityBestPracticesValue
	bugBountyProgram: null
	supplyChainDIY: SupplyChainDIYMetadata
	supplyChainFactory: SupplyChainFactoryMetadata
	firmware: FirmwareMetadata
	userSafety: UserSafetyMetadata
	accountRecovery: AccountRecoveryMetadata
	duressResistance: null
}>

/** Security attributes. */
export const securityAttributeGroup: AttributeGroup<SecurityValues> = {
	id: 'security',
	icon: 'security',
	displayName: 'Security',
	perWalletQuestion: sentence('How secure is {{WALLET_NAME}}?'),
	attributes: {
		securityAudits,
		scamPrevention,
		chainVerification,
		transactionLegibility,
		hardwareWalletSupport,
		securityBestPractices,
		bugBountyProgram,
		supplyChainDIY,
		supplyChainFactory,
		firmware,
		userSafety,
		accountRecovery,
		duressResistance,
	},
	attributeWeights: {
		securityAudits: 1.0,
		scamPrevention: 1.0,
		chainVerification: 1.0,
		transactionLegibility: 1.0,
		hardwareWalletSupport: 1.0,
		securityBestPractices: 1.0,
		bugBountyProgram: 1.0,
		supplyChainDIY: 1.0,
		supplyChainFactory: 1.0,
		firmware: 1.0,
		userSafety: 1.0,
		accountRecovery: 1.0,
		duressResistance: 1.0,
	},
}

/** A ValueSet for privacy Values. */
type PrivacyValues = Dict<{
	addressCorrelation: AddressCorrelationMetadata
	multiAddressCorrelation: null
	privateTransfers: PrivateTransfersMetadata
	hardwarePrivacy: HardwarePrivacyMetadata
	appIsolation: null
	privacyHygiene: null
}>

/** Privacy attributes. */
export const privacyAttributeGroup: AttributeGroup<PrivacyValues> = {
	id: 'privacy',
	icon: 'privacy',
	displayName: 'Privacy',
	perWalletQuestion: sentence('How well does {{WALLET_NAME}} protect your privacy?'),
	attributes: {
		addressCorrelation,
		multiAddressCorrelation,
		privateTransfers,
		hardwarePrivacy,
		appIsolation,
		privacyHygiene,
	},
	attributeWeights: {
		addressCorrelation: 1.0,
		multiAddressCorrelation: 1.0,
		privateTransfers: 1.0,
		hardwarePrivacy: 1.0,
		appIsolation: 1.0,
		privacyHygiene: 1.0,
	},
}

/** A ValueSet for self-sovereignty Values. */
type SelfSovereigntyValues = Dict<{
	l1ProviderIndependence: null
	accountPortability: null
	permissionsManagement: null
	transactionInclusion: null
	accountUnruggability: AccountUnruggabilityMetadata
}>

/** Self-sovereignty attributes. */
export const selfSovereigntyAttributeGroup: AttributeGroup<SelfSovereigntyValues> = {
	id: 'selfSovereignty',
	icon: 'self_sovereignty',
	displayName: 'Self-sovereignty',
	perWalletQuestion: sentence(
		'How much control and ownership over your account does {{WALLET_NAME}} give you?',
	),
	attributes: {
		l1ProviderIndependence,
		accountPortability,
		transactionInclusion,
		accountUnruggability,
		permissionsManagement,
	},
	attributeWeights: {
		l1ProviderIndependence: 1.0,
		accountPortability: 1.0,
		transactionInclusion: 1.0,
		accountUnruggability: 1.0,
		permissionsManagement: 1.0,
	},
}

/** A ValueSet for transparency Values. */
type TransparencyValues = Dict<{
	openSource: null
	sourceVisibility: null
	funding: null
	feeTransparency: FeeTransparencyMetadata
	releaseProcess: null
	reputation: ReputationMetadata
}>

/** Transparency attributes. */
export const transparencyAttributeGroup: AttributeGroup<TransparencyValues> = {
	id: 'transparency',
	icon: 'transparency',
	displayName: 'Transparency',
	perWalletQuestion: sentence(
		"How transparent and sustainable is {{WALLET_NAME}}'s development model?",
	),
	attributes: {
		openSource,
		sourceVisibility,
		funding,
		feeTransparency,
		releaseProcess,
		reputation,
	},
	attributeWeights: {
		openSource: 1.0,
		sourceVisibility: 1.0,
		funding: 1.0,
		feeTransparency: 1.0,
		releaseProcess: 1.0,
		reputation: 1.0,
	},
}

/** A ValueSet for ecosystem Values. */
type EcosystemValues = Dict<{
	accountAbstraction: null
	addressResolution: AddressResolutionMetadata
	browserIntegration: BrowserIntegrationMetadata
	chainAbstraction: null
	transactionBatching: null
	hardwareWalletInteroperability: HardwareWalletInteroperabilityMetadata
	interoperability: InteroperabilityMetadata
	appConnectionSupport: null
}>

/** Ecosystem attributes. */
export const ecosystemAttributeGroup: AttributeGroup<EcosystemValues> = {
	id: 'ecosystem',
	icon: 'ecosystem',
	displayName: 'Ecosystem',
	perWalletQuestion: sentence('How well does {{WALLET_NAME}} align with the ecosystem?'),
	attributes: {
		accountAbstraction,
		addressResolution,
		browserIntegration,
		chainAbstraction,
		transactionBatching,
		hardwareWalletInteroperability,
		interoperability,
		appConnectionSupport,
	},
	attributeWeights: {
		accountAbstraction: 1.0,
		addressResolution: 1.0,
		browserIntegration: 1.0,
		chainAbstraction: 1.0,
		transactionBatching: 1.0,
		hardwareWalletInteroperability: 1.0,
		interoperability: 1.0,
		appConnectionSupport: 1.0,
	},
}

/** A ValueSet for maintenance Values. */
type MaintenanceValues = Dict<{
	maintenance: MaintenanceMetadata
}>

/** Maintenance attributes. */
export const maintenanceAttributeGroup: AttributeGroup<MaintenanceValues> = {
	id: 'maintenance',
	icon: 'transparency',
	displayName: 'Maintenance',
	perWalletQuestion: sentence('How well-maintained is {{WALLET_NAME}}?'),
	attributes: {
		maintenance,
	},
	attributeWeights: {
		maintenance: 1.0,
	},
}

/** The set of attribute groups that make up wallet attributes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary to allow any Attribute implementation.
export const attributeTree: NonEmptyRecord<string, AttributeGroup<any>> = {
	security: securityAttributeGroup,
	privacy: privacyAttributeGroup,
	selfSovereignty: selfSovereigntyAttributeGroup,
	transparency: transparencyAttributeGroup,
	ecosystem: ecosystemAttributeGroup,
	maintenance: maintenanceAttributeGroup,
}

/** Literal union of attribute group IDs in `attributeTree`. */
export type AttributeGroupId =
	| 'security'
	| 'privacy'
	| 'selfSovereignty'
	| 'transparency'
	| 'ecosystem'
	| 'maintenance'

/** Software summary tables omit the maintenance group. */
export type SoftwareWalletAttributeGroupId = Exclude<AttributeGroupId, 'maintenance'>

export type HardwareWalletAttributeGroupId = AttributeGroupId

export type EmbeddedWalletAttributeGroupId = AttributeGroupId

/** Evaluated security attributes for a single wallet. */
export interface SecurityEvaluations extends EvaluatedGroup<SecurityValues> {
	transactionLegibility: EvaluatedAttribute
	securityAudits: EvaluatedAttribute<SecurityAuditsMetadata>
	scamPrevention: EvaluatedAttribute<ScamPreventionMetadata>
	chainVerification: EvaluatedAttribute
	hardwareWalletSupport: EvaluatedAttribute<HardwareWalletSupportMetadata>
	bugBountyProgram: EvaluatedAttribute
	supplyChainDIY: EvaluatedAttribute<SupplyChainDIYMetadata>
	supplyChainFactory: EvaluatedAttribute<SupplyChainFactoryMetadata>
	firmware: EvaluatedAttribute<FirmwareMetadata>
	userSafety: EvaluatedAttribute<UserSafetyMetadata>
	accountRecovery: EvaluatedAttribute<AccountRecoveryMetadata>
	duressResistance: EvaluatedAttribute
	securityBestPractices: EvaluatedAttribute<SecurityBestPracticesValue>
}

/** Evaluated privacy attributes for a single wallet. */
export interface PrivacyEvaluations extends EvaluatedGroup<PrivacyValues> {
	addressCorrelation: EvaluatedAttribute<AddressCorrelationMetadata>
	multiAddressCorrelation: EvaluatedAttribute
	privateTransfers: EvaluatedAttribute<PrivateTransfersMetadata>
	hardwarePrivacy: EvaluatedAttribute<HardwarePrivacyMetadata>
	appIsolation: EvaluatedAttribute
	privacyHygiene: EvaluatedAttribute
}

/** Evaluated self-sovereignty attributes for a single wallet. */
export interface SelfSovereigntyEvaluations extends EvaluatedGroup<SelfSovereigntyValues> {
	l1ProviderIndependence: EvaluatedAttribute
	accountPortability: EvaluatedAttribute
	transactionInclusion: EvaluatedAttribute
}

/** Evaluated transparency attributes for a single wallet. */
export interface TransparencyEvaluations extends EvaluatedGroup<TransparencyValues> {
	openSource: EvaluatedAttribute
	sourceVisibility: EvaluatedAttribute
	funding: EvaluatedAttribute
	feeTransparency: EvaluatedAttribute<FeeTransparencyMetadata>
	releaseProcess: EvaluatedAttribute
}

/** Evaluated ecosystem attributes for a single wallet. */
export interface EcosystemEvaluations extends EvaluatedGroup<EcosystemValues> {
	accountAbstraction: EvaluatedAttribute
	addressResolution: EvaluatedAttribute<AddressResolutionMetadata>
	browserIntegration: EvaluatedAttribute<BrowserIntegrationMetadata>
	chainAbstraction: EvaluatedAttribute
	transactionBatching: EvaluatedAttribute
	hardwareWalletInteroperability: EvaluatedAttribute<HardwareWalletInteroperabilityMetadata>
	interoperability: EvaluatedAttribute<InteroperabilityMetadata>
	appConnectionSupport: EvaluatedAttribute
}

/** Evaluated maintenance attributes for a single wallet. */
export interface MaintenanceEvaluations extends EvaluatedGroup<MaintenanceValues> {
	maintenance: EvaluatedAttribute<MaintenanceMetadata>
}

/** Evaluated attributes for a single wallet. */
export interface EvaluationTree extends NonEmptyRecord<
	string,
	EvaluatedGroup<
		| SecurityValues
		| PrivacyValues
		| SelfSovereigntyValues
		| TransparencyValues
		| EcosystemValues
		| MaintenanceValues
	>
> {
	security: SecurityEvaluations
	privacy: PrivacyEvaluations
	selfSovereignty: SelfSovereigntyEvaluations
	transparency: TransparencyEvaluations
	ecosystem: EcosystemEvaluations
	maintenance: MaintenanceEvaluations
}

/** Rate a wallet's attributes based on its features and metadata. */
export function evaluateAttributes(
	features: ResolvedFeatures,
	walletMetadata: WalletMetadata,
): EvaluationTree {
	const evalAttr = <_OutcomeMetadata extends OutcomeMetadata>(
		attr: Attribute<_OutcomeMetadata>,
	): EvaluatedAttribute<_OutcomeMetadata> => {
		const ctx = EvaluationContext.create<_OutcomeMetadata>(attr, features)

		if (attr.exempted !== undefined) {
			const maybeExempt = attr.exempted(ctx, walletMetadata)

			if (maybeExempt !== null) {
				if (!isExempt(maybeExempt)) {
					throw new Error(
						`Attribute ${attr.id}'s exemption rating function returned a non-exempt rating`,
					)
				}

				return {
					attribute: attr,
					evaluation: maybeExempt,
				}
			}
		}

		return {
			attribute: attr,
			evaluation: attr.evaluate(ctx),
		}
	}

	return {
		security: {
			securityAudits: evalAttr(securityAudits),
			scamPrevention: evalAttr(scamPrevention),
			chainVerification: evalAttr(chainVerification),
			transactionLegibility: evalAttr(transactionLegibility),
			hardwareWalletSupport: evalAttr(hardwareWalletSupport),
			securityBestPractices: evalAttr(securityBestPractices),
			bugBountyProgram: evalAttr(bugBountyProgram),
			supplyChainDIY: evalAttr(supplyChainDIY),
			supplyChainFactory: evalAttr(supplyChainFactory),
			firmware: evalAttr(firmware),
			userSafety: evalAttr(userSafety),
			accountRecovery: evalAttr(accountRecovery),
			duressResistance: evalAttr(duressResistance),
		},
		privacy: {
			addressCorrelation: evalAttr(addressCorrelation),
			multiAddressCorrelation: evalAttr(multiAddressCorrelation),
			privateTransfers: evalAttr(privateTransfers),
			hardwarePrivacy: evalAttr(hardwarePrivacy),
			appIsolation: evalAttr(appIsolation),
			privacyHygiene: evalAttr(privacyHygiene),
		},
		selfSovereignty: {
			l1ProviderIndependence: evalAttr(l1ProviderIndependence),
			accountPortability: evalAttr(accountPortability),
			transactionInclusion: evalAttr(transactionInclusion),
			accountUnruggability: evalAttr(accountUnruggability),
			permissionsManagement: evalAttr(permissionsManagement),
		},
		transparency: {
			openSource: evalAttr(openSource),
			sourceVisibility: evalAttr(sourceVisibility),
			funding: evalAttr(funding),
			feeTransparency: evalAttr(feeTransparency),
			releaseProcess: evalAttr(releaseProcess),
			reputation: evalAttr(reputation),
		},
		ecosystem: {
			accountAbstraction: evalAttr(accountAbstraction),
			addressResolution: evalAttr(addressResolution),
			browserIntegration: evalAttr(browserIntegration),
			chainAbstraction: evalAttr(chainAbstraction),
			transactionBatching: evalAttr(transactionBatching),
			hardwareWalletInteroperability: evalAttr(hardwareWalletInteroperability),
			interoperability: evalAttr(interoperability),
			appConnectionSupport: evalAttr(appConnectionSupport),
		},
		maintenance: {
			maintenance: evalAttr(maintenance),
		},
	}
}

/**
 * Aggregate per-variant evaluated attributes into
 * a single non-per-variant tree of evaluated attributes.
 */
export function aggregateAttributes(perVariant: AtLeastOneVariant<EvaluationTree>): EvaluationTree {
	const attr = <_OutcomeMetadata extends OutcomeMetadata>(
		getter: (tree: EvaluationTree) => EvaluatedAttribute<_OutcomeMetadata>,
	): EvaluatedAttribute<_OutcomeMetadata> => {
		const attribute = getter(
			nonEmptyGet(nonEmptyValues<Variant, EvaluationTree>(perVariant)),
		).attribute
		const evaluations = nonEmptyRemap(
			perVariant,
			(_: Variant, tree: EvaluationTree) => getter(tree).evaluation,
		)

		return {
			attribute,
			evaluation: attribute.aggregate(evaluations),
		}
	}

	return {
		security: {
			securityAudits: attr(tree => tree.security.securityAudits),
			scamPrevention: attr(tree => tree.security.scamPrevention),
			chainVerification: attr(tree => tree.security.chainVerification),
			transactionLegibility: attr(tree => tree.security.transactionLegibility),
			hardwareWalletSupport: attr(tree => tree.security.hardwareWalletSupport),
			securityBestPractices: attr(tree => tree.security.securityBestPractices),
			bugBountyProgram: attr(tree => tree.security.bugBountyProgram),
			supplyChainDIY: attr(tree => tree.security.supplyChainDIY),
			supplyChainFactory: attr(tree => tree.security.supplyChainFactory),
			firmware: attr(tree => tree.security.firmware),
			userSafety: attr(tree => tree.security.userSafety),
			accountRecovery: attr(tree => tree.security.accountRecovery),
			duressResistance: attr(tree => tree.security.duressResistance),
		},
		privacy: {
			addressCorrelation: attr(tree => tree.privacy.addressCorrelation),
			multiAddressCorrelation: attr(tree => tree.privacy.multiAddressCorrelation),
			privateTransfers: attr(tree => tree.privacy.privateTransfers),
			hardwarePrivacy: attr(tree => tree.privacy.hardwarePrivacy),
			appIsolation: attr(tree => tree.privacy.appIsolation),
			privacyHygiene: attr(tree => tree.privacy.privacyHygiene),
		},
		selfSovereignty: {
			l1ProviderIndependence: attr(tree => tree.selfSovereignty.l1ProviderIndependence),
			accountPortability: attr(tree => tree.selfSovereignty.accountPortability),
			transactionInclusion: attr(tree => tree.selfSovereignty.transactionInclusion),
			accountUnruggability: attr(tree => tree.selfSovereignty.accountUnruggability),
			permissionsManagement: attr(tree => tree.selfSovereignty.permissionsManagement),
		},
		transparency: {
			openSource: attr(tree => tree.transparency.openSource),
			sourceVisibility: attr(tree => tree.transparency.sourceVisibility),
			funding: attr(tree => tree.transparency.funding),
			feeTransparency: attr(tree => tree.transparency.feeTransparency),
			releaseProcess: attr(tree => tree.transparency.releaseProcess),
			reputation: attr(tree => tree.transparency.reputation),
		},
		ecosystem: {
			accountAbstraction: attr(tree => tree.ecosystem.accountAbstraction),
			addressResolution: attr(tree => tree.ecosystem.addressResolution),
			browserIntegration: attr(tree => tree.ecosystem.browserIntegration),
			chainAbstraction: attr(tree => tree.ecosystem.chainAbstraction),
			transactionBatching: attr(tree => tree.ecosystem.transactionBatching),
			hardwareWalletInteroperability: attr(tree => tree.ecosystem.hardwareWalletInteroperability),
			interoperability: attr(tree => tree.ecosystem.interoperability),
			appConnectionSupport: attr(tree => tree.ecosystem.appConnectionSupport),
		},
		maintenance: {
			maintenance: attr(tree => tree.maintenance.maintenance),
		},
	}
}

/**
 * Get a specific evaluated attribute group from an evaluation tree.
 */
export function getAttributeGroupInTree<Vs extends ValueSet>(
	tree: EvaluationTree,
	attrGroup: AttributeGroup<Vs>,
): EvaluatedGroup<Vs> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because each attribute group's ID maps to an evaluated group of its own ValueSet subtype.
	return tree[attrGroup.id] as EvaluatedGroup<Vs>
}

/**
 * Iterate over all non-exempt attribute groups in a tree, calling `fn` with each group.
 */
export function mapNonExemptAttributeGroupsInTree<T>(
	tree: EvaluationTree,
	fn: <Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>, evalGroup: EvaluatedGroup<Vs>) => T,
): T[] {
	return Object.values(attributeTree)
		.filter(
			<Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>): boolean =>
				numNonExemptGroupAttributes<Vs>(getAttributeGroupInTree(tree, attrGroup)) > 0,
		)
		.map(
			<Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>): T =>
				fn(attrGroup, getAttributeGroupInTree(tree, attrGroup)),
		)
}

/**
 * Iterate over all non-exempt attributes in an evaluated attribute group,
 * calling `fn` with each attribute.
 */
export function mapNonExemptGroupAttributes<T, Vs extends ValueSet>(
	evalGroup: EvaluatedGroup<Vs>,
	fn: <_OutcomeMetadata extends OutcomeMetadata>(
		evalAttr: EvaluatedAttribute<_OutcomeMetadata>,
		index: number,
	) => T,
): T[] {
	return Object.values(evalGroup)
		.filter(
			<_OutcomeMetadata extends OutcomeMetadata>(
				evalAttr: EvaluatedAttribute<_OutcomeMetadata>,
			): boolean => evalAttr.evaluation.outcome.rating !== Rating.EXEMPT,
		)
		.map(fn)
}

/**
 * Return the number of non-exempt attributes in an evaluated attribute group.
 */
export function numNonExemptGroupAttributes<Vs extends ValueSet>(
	evalGroup: EvaluatedGroup<Vs>,
): number {
	return Object.values(evalGroup).filter(
		<_OutcomeMetadata extends OutcomeMetadata>(
			evalAttr: EvaluatedAttribute<_OutcomeMetadata>,
		): boolean => evalAttr.evaluation.outcome.rating !== Rating.EXEMPT,
	).length
}

/**
 * Given an evaluation tree as template, call `fn` with a getter function
 * that can return that attribute for any given tree.
 * Useful to compare multiple trees of attributes, by calling `getter` on
 * various trees.
 */
export function mapAttributesGetter(
	templateTree: EvaluationTree,
	fn: <_OutcomeMetadata extends OutcomeMetadata>(
		getter: (evalTree: EvaluationTree) => EvaluatedAttribute<_OutcomeMetadata> | undefined,
	) => void,
): void {
	for (const groupName of Object.keys(templateTree)) {
		for (const attrName of Object.keys(templateTree[groupName])) {
			fn(
				<_OutcomeMetadata extends OutcomeMetadata>(
					evalTree: EvaluationTree,
				): EvaluatedAttribute<_OutcomeMetadata> | undefined =>
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- We know that `evalTree[groupName]` has `attrName` as property, due to how we iterated to get here.
					(evalTree[groupName] as any)[attrName] as EvaluatedAttribute<_OutcomeMetadata>,
			)
		}
	}
}

/**
 * Given an attribute evaluation from any template EvaluationTree,
 * get the same evaluated attribute from a different EvaluationTree.
 * Useful when needing to look up the same evaluation from a different tree
 * such as from a different Variant.
 */
export function getEvaluationFromOtherTree<_OutcomeMetadata extends OutcomeMetadata>(
	evalAttr: EvaluatedAttribute<_OutcomeMetadata>,
	otherTree: EvaluationTree,
): EvaluatedAttribute<_OutcomeMetadata> {
	const otherEvalAttr = mapNonExemptAttributeGroupsInTree(
		otherTree,
		<Vs extends ValueSet>(
			_: AttributeGroup<Vs>,
			evalGroup: EvaluatedGroup<Vs>,
		): EvaluatedAttribute<_OutcomeMetadata> | undefined => {
			if (Object.hasOwn(evalGroup, evalAttr.attribute.id)) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Evaluated attributes with the same ID have the same OutcomeMetadata type.
				return evalGroup[evalAttr.attribute.id] as unknown as EvaluatedAttribute<_OutcomeMetadata>
			}

			return undefined
		},
	).find(v => v !== undefined)

	if (otherEvalAttr === undefined) {
		throw new Error(
			`Incomplete evaluation tree; did not found evaluation for attribute ${evalAttr.attribute.id}`,
		)
	}

	return otherEvalAttr
}

/**
 * Calculate a score for an attribute group based on its weights and evaluations.
 * @param weights The weights for each attribute in the group.
 * @param evaluations The evaluations to score.
 * @returns A score between 0.0 (lowest) and 1.0 (highest) or null if exempt.
 */
export function calculateAttributeGroupScore<Vs extends ValueSet>(
	weights: AttributeGroup<Vs>['attributeWeights'],
	evaluations: EvaluatedGroup<Vs>,
): MaybeUnratedScore {
	const subScores = nonEmptyValues<keyof Vs, WeightedScore | null>(
		nonEmptyRemap(weights, (key: keyof Vs, weight: number): WeightedScore | null => {
			const { outcome } = evaluations[key].evaluation
			const score = outcome.score ?? defaultRatingScore(outcome)

			return score === null
				? null
				: ({
						score,
						weight,
					} as WeightedScore)
		}),
	).filter(score => score !== null)

	if (isNonEmptyArray(subScores)) {
		let hasUnratedComponent = false

		for (const evalAttr of evaluatedAttributes(evaluations)) {
			hasUnratedComponent ||= evalAttr.evaluation.outcome.rating === Rating.UNRATED
		}

		return { score: weightedScore(subScores), hasUnratedComponent }
	}

	return null
}

/**
 * Calculate the overall wallet score by averaging all attribute group scores.
 * @param evaluationTree The evaluation tree to score.
 * @param attrGroupPredicate A predicate determining whether the given attribute group should be scored.
 * @returns The overall score between 0.0 (lowest) and 1.0 (highest), or null if no scores.
 */
export const calculateOverallScore = (
	evaluationTree: EvaluationTree,
	attrGroupPredicate: <Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>) => boolean,
): MaybeUnratedScore => {
	const scores = mapNonExemptAttributeGroupsInTree(
		evaluationTree,
		<Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>, evalGroup: EvaluatedGroup<Vs>) => {
			if (!attrGroupPredicate<Vs>(attrGroup)) {
				return null
			}

			return calculateAttributeGroupScore<Vs>(attrGroup.attributeWeights, evalGroup)
		},
	).filter((score): score is { score: Score; hasUnratedComponent: boolean } => score !== null)

	if (!isNonEmptyArray(scores)) {
		return null
	}

	return {
		score:
			scores.reduce((sum, { score }) => (score === null ? sum : sum + score), 0) / scores.length,
		hasUnratedComponent: scores.some(score => score.hasUnratedComponent),
	}
}

/**
 * Format title text for an attribute group.
 * @param attrGroup The attribute group to format.
 * @param groupScore The score for the group, or null if not available.
 * @param showScores Whether to show scores in the title.
 * @returns Formatted title text showing icon and score (if enabled) or just display name.
 */
export const formatAttributeGroupTitleText = <Vs extends ValueSet>(
	attrGroup: AttributeGroup<Vs>,
	groupScore: MaybeUnratedScore,
	showScores: boolean,
) =>
	`${attrGroup.icon} ${attrGroup.displayName}${
		showScores
			? `\n\n${
					groupScore !== null && groupScore.score !== null
						? `${(groupScore.score * 100).toFixed(0)}%${groupScore.hasUnratedComponent ? ' (has unrated components)' : ''}`
						: 'N/A'
				}`
			: ''
	}`

/**
 * Look up an attribute group by ID, verifying that it exists and is not
 * entirely exempt from the given EvaluationTree.
 */
export function getAttributeGroupById(
	id: string,
	tree: EvaluationTree,
): AttributeGroup<ValueSet> | null {
	const attrGroup = attributeTree[id] as AttributeGroup<ValueSet> | undefined

	if (attrGroup === undefined) {
		return null
	}

	if (
		!mapNonExemptAttributeGroupsInTree(
			tree,
			attrGroupInTree => attrGroup.id === attrGroupInTree.id,
		).some(val => val)
	) {
		return null
	}

	return attrGroup
}

export function getAttributeFromTree<_OutcomeMetadata extends OutcomeMetadata>(
	tree: EvaluationTree,
	attribute: Attribute<_OutcomeMetadata>,
): EvaluatedAttribute<_OutcomeMetadata> | null {
	const evalAttrs = mapNonExemptAttributeGroupsInTree(
		tree,
		<Vs extends ValueSet>(
			_: AttributeGroup<Vs>,
			evalGroup: EvaluatedGroup<Vs>,
		): EvaluatedAttribute<_OutcomeMetadata> | null => {
			for (const evalAttr of evaluatedAttributes(evalGroup)) {
				if (evalAttr.attribute.id === attribute.id) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we checked the attributes match by ID.
					return evalAttr as unknown as EvaluatedAttribute<_OutcomeMetadata>
				}
			}

			return null
		},
	).filter(v => v !== null)

	switch (evalAttrs.length) {
		case 0:
			return null
		case 1:
			return evalAttrs[0]
		default:
			throw new Error(`Found multiple attributes with the same ID ${attribute.id}`)
	}
}
