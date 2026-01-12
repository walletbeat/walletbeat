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
	isExempt,
	Rating,
	type Value,
	type ValueSet,
} from './attributes'
import {
	accountAbstraction,
	type AccountAbstractionValue,
} from './attributes/ecosystem/account-abstraction'
import {
	addressResolution,
	type AddressResolutionValue,
} from './attributes/ecosystem/address-resolution'
import {
	browserIntegration,
	type BrowserIntegrationValue,
} from './attributes/ecosystem/browser-integration'
import {
	chainAbstraction,
	type ChainAbstractionValue,
} from './attributes/ecosystem/chain-abstraction'
import {
	hardwareWalletInteroperability,
	type HardwareWalletInteroperabilityValue,
} from './attributes/ecosystem/hardware-wallet-interoperability'
import {
	appConnectionSupport,
	type AppConnectionSupportValue,
} from './attributes/ecosystem/hw-app-connection-support'
import {
	transactionBatching,
	type TransactionBatchingValue,
} from './attributes/ecosystem/transaction-batching'
import {
	addressCorrelation,
	type AddressCorrelationValue,
} from './attributes/privacy/address-correlation'
import { appIsolation, type AppIsolationValue } from './attributes/privacy/app-isolation'
import { hardwarePrivacy, type HardwarePrivacyValue } from './attributes/privacy/hardware-privacy'
import {
	multiAddressCorrelation,
	type MultiAddressCorrelationValue,
} from './attributes/privacy/multi-address-correlation'
import {
	privateTransfers,
	type PrivateTransfersValue,
} from './attributes/privacy/private-transfers'
import { accountRecovery, type AccountRecoveryValue } from './attributes/security/account-recovery'
import {
	bugBountyProgram,
	type BugBountyProgramValue,
} from './attributes/security/bug-bounty-program'
import {
	chainVerification,
	type ChainVerificationValue,
} from './attributes/security/chain-verification'
import { firmware, type FirmwareValue } from './attributes/security/firmware'
import {
	hardwareWalletSupport,
	type HardwareWalletSupportValue,
} from './attributes/security/hardware-wallet-support'
import {
	passkeyImplementation,
	type PasskeyImplementationValue,
} from './attributes/security/passkey-implementation'
import { scamPrevention, type ScamPreventionValue } from './attributes/security/scam-prevention'
import { securityAudits, type SecurityAuditsValue } from './attributes/security/security-audits'
import { supplyChainDIY, type SupplyChainDIYValue } from './attributes/security/supply-chain-diy'
import {
	supplyChainFactory,
	type SupplyChainFactoryValue,
} from './attributes/security/supply-chain-factory'
import {
	transactionLegibility,
	type TransactionLegibilityValue,
} from './attributes/security/transaction-legibility'
import { userSafety, type UserSafetyValue } from './attributes/security/user-safety'
import {
	accountPortability,
	type AccountPortabilityValue,
} from './attributes/self-sovereignty/account-portability'
import {
	accountUnruggability,
	type AccountUnruggabilityValue,
} from './attributes/self-sovereignty/account-unruggability'
import {
	interoperability,
	type InteroperabilityValue,
} from './attributes/self-sovereignty/interoperability'
import {
	type L1ProviderIndependence,
	l1ProviderIndependence,
} from './attributes/self-sovereignty/l1-provider-independence'
import {
	transactionInclusion,
	type TransactionInclusionValue,
} from './attributes/self-sovereignty/transaction-inclusion'
import {
	feeTransparency,
	type FeeTransparencyValue,
} from './attributes/transparency/fee-transparency'
import { funding, type FundingValue } from './attributes/transparency/funding'
import { maintenance, type MaintenanceValue } from './attributes/transparency/maintenance'
import { openSource, type OpenSourceValue } from './attributes/transparency/open-source'
import { reputation, type ReputationValue } from './attributes/transparency/reputation'
import {
	sourceVisibility,
	type SourceVisibilityValue,
} from './attributes/transparency/source-visibility'
import type { ResolvedFeatures } from './features'
import { type MaybeUnratedScore, type Score, type WeightedScore, weightedScore } from './score'
import type { AtLeastOneVariant, Variant } from './variants'
import type { WalletMetadata } from './wallet'

/** A ValueSet for security Values. */
type SecurityValues = Dict<{
	securityAudits: SecurityAuditsValue
	scamPrevention: ScamPreventionValue
	chainVerification: ChainVerificationValue
	transactionLegibility: TransactionLegibilityValue
	hardwareWalletSupport: HardwareWalletSupportValue
	passkeyImplementation: PasskeyImplementationValue
	bugBountyProgram: BugBountyProgramValue
	supplyChainDIY: SupplyChainDIYValue
	supplyChainFactory: SupplyChainFactoryValue
	firmware: FirmwareValue
	userSafety: UserSafetyValue
	accountRecovery: AccountRecoveryValue
}>

/** Security attributes. */
export const securityAttributeGroup: AttributeGroup<SecurityValues> = {
	id: 'security',
	icon: '\u{1f512}', // Lock
	displayName: 'Security',
	perWalletQuestion: sentence<{ WALLET_NAME: string }>('How secure is {{WALLET_NAME}}?'),
	attributes: {
		securityAudits,
		scamPrevention,
		chainVerification,
		transactionLegibility,
		hardwareWalletSupport,
		passkeyImplementation,
		bugBountyProgram,
		supplyChainDIY,
		supplyChainFactory,
		firmware,
		userSafety,
		accountRecovery,
	},
	attributeWeights: {
		securityAudits: 1.0,
		scamPrevention: 1.0,
		chainVerification: 1.0,
		transactionLegibility: 1.0,
		hardwareWalletSupport: 1.0,
		passkeyImplementation: 1.0,
		bugBountyProgram: 1.0,
		supplyChainDIY: 1.0,
		supplyChainFactory: 1.0,
		firmware: 1.0,
		userSafety: 1.0,
		accountRecovery: 1.0,
	},
}

/** A ValueSet for privacy Values. */
type PrivacyValues = Dict<{
	addressCorrelation: AddressCorrelationValue
	multiAddressCorrelation: MultiAddressCorrelationValue
	privateTransfers: PrivateTransfersValue
	hardwarePrivacy: HardwarePrivacyValue
	appIsolation: AppIsolationValue
}>

/** Privacy attributes. */
export const privacyAttributeGroup: AttributeGroup<PrivacyValues> = {
	id: 'privacy',
	icon: '\u{1f575}', // Detective
	displayName: 'Privacy',
	perWalletQuestion: sentence<{ WALLET_NAME: string }>(
		'How well does {{WALLET_NAME}} protect your privacy?',
	),
	attributes: {
		addressCorrelation,
		multiAddressCorrelation,
		privateTransfers,
		hardwarePrivacy,
		appIsolation,
	},
	attributeWeights: {
		addressCorrelation: 1.0,
		multiAddressCorrelation: 1.0,
		privateTransfers: 1.0,
		hardwarePrivacy: 1.0,
		appIsolation: 1.0,
	},
}

/** A ValueSet for self-sovereignty Values. */
type SelfSovereigntyValues = Dict<{
	l1ProviderIndependence: L1ProviderIndependence
	accountPortability: AccountPortabilityValue
	transactionInclusion: TransactionInclusionValue
	accountUnruggability: AccountUnruggabilityValue
}>

/** Self-sovereignty attributes. */
export const selfSovereigntyAttributeGroup: AttributeGroup<SelfSovereigntyValues> = {
	id: 'selfSovereignty',
	icon: '\u{1f3f0}', // Castle
	displayName: 'Self-sovereignty',
	perWalletQuestion: sentence<{ WALLET_NAME: string }>(
		'How much control and ownership over your account does {{WALLET_NAME}} give you?',
	),
	attributes: {
		l1ProviderIndependence,
		accountPortability,
		transactionInclusion,
		accountUnruggability,
	},
	attributeWeights: {
		l1ProviderIndependence: 1.0,
		accountPortability: 1.0,
		transactionInclusion: 1.0,
		accountUnruggability: 1.0,
	},
}

/** A ValueSet for transparency Values. */
type TransparencyValues = Dict<{
	openSource: OpenSourceValue
	sourceVisibility: SourceVisibilityValue
	funding: FundingValue
	feeTransparency: FeeTransparencyValue
	reputation: ReputationValue
}>

/** Transparency attributes. */
export const transparencyAttributeGroup: AttributeGroup<TransparencyValues> = {
	id: 'transparency',
	icon: '\u{1f50d}', // Looking glass
	displayName: 'Transparency',
	perWalletQuestion: sentence<{ WALLET_NAME: string }>(
		"How transparent and sustainable is {{WALLET_NAME}}'s development model?",
	),
	attributes: {
		openSource,
		sourceVisibility,
		funding,
		feeTransparency,
		reputation,
	},
	attributeWeights: {
		openSource: 1.0,
		sourceVisibility: 1.0,
		funding: 1.0,
		feeTransparency: 1.0,
		reputation: 1.0,
	},
}

/** A ValueSet for ecosystem Values. */
type EcosystemValues = Dict<{
	accountAbstraction: AccountAbstractionValue
	addressResolution: AddressResolutionValue
	browserIntegration: BrowserIntegrationValue
	chainAbstraction: ChainAbstractionValue
	transactionBatching: TransactionBatchingValue
	hardwareWalletInteroperability: HardwareWalletInteroperabilityValue
	interoperability: InteroperabilityValue
	appConnectionSupport: AppConnectionSupportValue
}>

/** Ecosystem attributes. */
export const ecosystemAttributeGroup: AttributeGroup<EcosystemValues> = {
	id: 'ecosystem',
	icon: '🌐',
	displayName: 'Ecosystem',
	perWalletQuestion: sentence<{ WALLET_NAME: string }>(
		'How well does {{WALLET_NAME}} align with the ecosystem?',
	),
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
	maintenance: MaintenanceValue
}>

/** Maintenance attributes. */
export const maintenanceAttributeGroup: AttributeGroup<MaintenanceValues> = {
	id: 'maintenance',
	icon: '🛠️',
	displayName: 'Maintenance',
	perWalletQuestion: sentence<{ WALLET_NAME: string }>('How well-maintained is {{WALLET_NAME}}?'),
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

/** Evaluated security attributes for a single wallet. */
export interface SecurityEvaluations extends EvaluatedGroup<SecurityValues> {
	transactionLegibility: EvaluatedAttribute<TransactionLegibilityValue>
	securityAudits: EvaluatedAttribute<SecurityAuditsValue>
	scamPrevention: EvaluatedAttribute<ScamPreventionValue>
	chainVerification: EvaluatedAttribute<ChainVerificationValue>
	hardwareWalletSupport: EvaluatedAttribute<HardwareWalletSupportValue>
	passkeyImplementation: EvaluatedAttribute<PasskeyImplementationValue>
	bugBountyProgram: EvaluatedAttribute<BugBountyProgramValue>
	supplyChainDIY: EvaluatedAttribute<SupplyChainDIYValue>
	supplyChainFactory: EvaluatedAttribute<SupplyChainFactoryValue>
	firmware: EvaluatedAttribute<FirmwareValue>
	userSafety: EvaluatedAttribute<UserSafetyValue>
	accountRecovery: EvaluatedAttribute<AccountRecoveryValue>
}

/** Evaluated privacy attributes for a single wallet. */
export interface PrivacyEvaluations extends EvaluatedGroup<PrivacyValues> {
	addressCorrelation: EvaluatedAttribute<AddressCorrelationValue>
	multiAddressCorrelation: EvaluatedAttribute<MultiAddressCorrelationValue>
	privateTransfers: EvaluatedAttribute<PrivateTransfersValue>
}

/** Evaluated self-sovereignty attributes for a single wallet. */
export interface SelfSovereigntyEvaluations extends EvaluatedGroup<SelfSovereigntyValues> {
	l1ProviderIndependence: EvaluatedAttribute<L1ProviderIndependence>
	accountPortability: EvaluatedAttribute<AccountPortabilityValue>
	transactionInclusion: EvaluatedAttribute<TransactionInclusionValue>
}

/** Evaluated transparency attributes for a single wallet. */
export interface TransparencyEvaluations extends EvaluatedGroup<TransparencyValues> {
	openSource: EvaluatedAttribute<OpenSourceValue>
	sourceVisibility: EvaluatedAttribute<SourceVisibilityValue>
	funding: EvaluatedAttribute<FundingValue>
	feeTransparency: EvaluatedAttribute<FeeTransparencyValue>
}

/** Evaluated ecosystem attributes for a single wallet. */
export interface EcosystemEvaluations extends EvaluatedGroup<EcosystemValues> {
	accountAbstraction: EvaluatedAttribute<AccountAbstractionValue>
	addressResolution: EvaluatedAttribute<AddressResolutionValue>
	browserIntegration: EvaluatedAttribute<BrowserIntegrationValue>
	chainAbstraction: EvaluatedAttribute<ChainAbstractionValue>
	interoperability: EvaluatedAttribute<InteroperabilityValue>
}

/** Evaluated maintenance attributes for a single wallet. */
export interface MaintenanceEvaluations extends EvaluatedGroup<MaintenanceValues> {
	maintenance: EvaluatedAttribute<MaintenanceValue>
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
	const evalAttr = <V extends Value>(attr: Attribute<V>): EvaluatedAttribute<V> => {
		if (attr.exempted !== undefined) {
			const maybeExempt = attr.exempted(features, walletMetadata)

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
			evaluation: attr.evaluate(features),
		}
	}

	return {
		security: {
			securityAudits: evalAttr(securityAudits),
			scamPrevention: evalAttr(scamPrevention),
			chainVerification: evalAttr(chainVerification),
			transactionLegibility: evalAttr(transactionLegibility),
			hardwareWalletSupport: evalAttr(hardwareWalletSupport),
			passkeyImplementation: evalAttr(passkeyImplementation),
			bugBountyProgram: evalAttr(bugBountyProgram),
			supplyChainDIY: evalAttr(supplyChainDIY),
			supplyChainFactory: evalAttr(supplyChainFactory),
			firmware: evalAttr(firmware),
			userSafety: evalAttr(userSafety),
			accountRecovery: evalAttr(accountRecovery),
		},
		privacy: {
			addressCorrelation: evalAttr(addressCorrelation),
			multiAddressCorrelation: evalAttr(multiAddressCorrelation),
			privateTransfers: evalAttr(privateTransfers),
			hardwarePrivacy: evalAttr(hardwarePrivacy),
			appIsolation: evalAttr(appIsolation),
		},
		selfSovereignty: {
			l1ProviderIndependence: evalAttr(l1ProviderIndependence),
			accountPortability: evalAttr(accountPortability),
			transactionInclusion: evalAttr(transactionInclusion),
			accountUnruggability: evalAttr(accountUnruggability),
		},
		transparency: {
			openSource: evalAttr(openSource),
			sourceVisibility: evalAttr(sourceVisibility),
			funding: evalAttr(funding),
			feeTransparency: evalAttr(feeTransparency),
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
	const attr = <V extends Value>(
		getter: (tree: EvaluationTree) => EvaluatedAttribute<V>,
	): EvaluatedAttribute<V> => {
		const attribute = getter(
			nonEmptyGet(nonEmptyValues<Variant, EvaluationTree>(perVariant)),
		).attribute
		const evaluations = nonEmptyRemap(
			perVariant,
			(_, tree: EvaluationTree) => getter(tree).evaluation,
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
			passkeyImplementation: attr(tree => tree.security.passkeyImplementation),
			bugBountyProgram: attr(tree => tree.security.bugBountyProgram),
			supplyChainDIY: attr(tree => tree.security.supplyChainDIY),
			supplyChainFactory: attr(tree => tree.security.supplyChainFactory),
			firmware: attr(tree => tree.security.firmware),
			userSafety: attr(tree => tree.security.userSafety),
			accountRecovery: attr(tree => tree.security.accountRecovery),
		},
		privacy: {
			addressCorrelation: attr(tree => tree.privacy.addressCorrelation),
			multiAddressCorrelation: attr(tree => tree.privacy.multiAddressCorrelation),
			privateTransfers: attr(tree => tree.privacy.privateTransfers),
			hardwarePrivacy: attr(tree => tree.privacy.hardwarePrivacy),
			appIsolation: attr(tree => tree.privacy.appIsolation),
		},
		selfSovereignty: {
			l1ProviderIndependence: attr(tree => tree.selfSovereignty.l1ProviderIndependence),
			accountPortability: attr(tree => tree.selfSovereignty.accountPortability),
			transactionInclusion: attr(tree => tree.selfSovereignty.transactionInclusion),
			accountUnruggability: attr(tree => tree.selfSovereignty.accountUnruggability),
		},
		transparency: {
			openSource: attr(tree => tree.transparency.openSource),
			sourceVisibility: attr(tree => tree.transparency.sourceVisibility),
			funding: attr(tree => tree.transparency.funding),
			feeTransparency: attr(tree => tree.transparency.feeTransparency),
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
	fn: <V extends Value>(evalAttr: EvaluatedAttribute<V>, index: number) => T,
): T[] {
	return Object.values(evalGroup)
		.filter(
			<V extends Value>(evalAttr: EvaluatedAttribute<V>): boolean =>
				evalAttr.evaluation.value.rating !== Rating.EXEMPT,
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
		<V extends Value>(evalAttr: EvaluatedAttribute<V>): boolean =>
			evalAttr.evaluation.value.rating !== Rating.EXEMPT,
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
	fn: <V extends Value>(
		getter: (evalTree: EvaluationTree) => EvaluatedAttribute<V> | undefined,
	) => void,
): void {
	for (const groupName of Object.keys(templateTree)) {
		for (const attrName of Object.keys(templateTree[groupName])) {
			fn(
				<V extends Value>(evalTree: EvaluationTree): EvaluatedAttribute<V> | undefined =>
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- We know that `evalTree[groupName]` has `attrName` as property, due to how we iterated to get here.
					(evalTree[groupName] as any)[attrName] as EvaluatedAttribute<V>,
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
export function getEvaluationFromOtherTree<V extends Value>(
	evalAttr: EvaluatedAttribute<V>,
	otherTree: EvaluationTree,
): EvaluatedAttribute<V> {
	const otherEvalAttr = mapNonExemptAttributeGroupsInTree(
		otherTree,
		(_, evalGroup): EvaluatedAttribute<V> | undefined => {
			if (Object.hasOwn(evalGroup, evalAttr.attribute.id)) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Evaluated attributes with the same ID have the same Value type.
				return evalGroup[evalAttr.attribute.id] as unknown as EvaluatedAttribute<V>
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
			const { value } = evaluations[key].evaluation
			const score = value.score ?? defaultRatingScore(value.rating)

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
			hasUnratedComponent ||= evalAttr.evaluation.value.rating === Rating.UNRATED
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

export function getAttributeFromTree<V extends Value>(
	tree: EvaluationTree,
	attribute: Attribute<V>,
): EvaluatedAttribute<V> | null {
	const evalAttrs = mapNonExemptAttributeGroupsInTree(
		tree,
		<Vs extends ValueSet>(
			_: AttributeGroup<Vs>,
			evalGroup: EvaluatedGroup<Vs>,
		): EvaluatedAttribute<V> | null => {
			for (const evalAttr of evaluatedAttributes(evalGroup)) {
				if (evalAttr.attribute.id === attribute.id) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we checked the attributes match by ID.
					return evalAttr as unknown as EvaluatedAttribute<V>
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
