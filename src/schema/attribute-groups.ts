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
	addressCorrelation,
	type AddressCorrelationValue,
} from './attributes/privacy/address-correlation'
import { hardwarePrivacy, type HardwarePrivacyValue } from './attributes/privacy/hardware-privacy'
import {
	multiAddressCorrelation,
	type MultiAddressCorrelationValue,
} from './attributes/privacy/multi-address-correlation'
import {
	privateTransfers,
	type PrivateTransfersValue,
} from './attributes/privacy/private-transfers'
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
	hardwareWalletDappSigning,
	type HardwareWalletDappSigningValue,
} from './attributes/security/hardware-wallet-dapp-signing'
import {
	hardwareWalletSupport,
	type HardwareWalletSupportValue,
} from './attributes/security/hardware-wallet-support'
import { keysHandling, type KeysHandlingValue } from './attributes/security/keys-handling'
import {
	passkeyImplementation,
	type PasskeyImplementationValue,
} from './attributes/security/passkey-implementation'
import { scamPrevention, type ScamPreventionValue } from './attributes/security/scam-prevention'
import { securityAudits, type SecurityAuditsValue } from './attributes/security/security-audits'
import {
	softwareHWIntegration,
	type SoftwareHWIntegrationValue,
} from './attributes/security/software-hw-integration'
import { supplyChainDIY, type SupplyChainDIYValue } from './attributes/security/supply-chain-diy'
import {
	supplyChainFactory,
	type SupplyChainFactoryValue,
} from './attributes/security/supply-chain-factory'
import { userSafety, type UserSafetyValue } from './attributes/security/user-safety'
import {
	accountPortability,
	type AccountPortabilityValue,
} from './attributes/self-sovereignty/account-portability'
import {
	interoperability,
	type InteroperabilityValue,
} from './attributes/self-sovereignty/interoperability'
import {
	selfHostedNode,
	type SelfHostedNodeValue,
} from './attributes/self-sovereignty/self-hosted-node'
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
import { type MaybeUnratedScore, type WeightedScore, weightedScore } from './score'
import type { AtLeastOneVariant, Variant } from './variants'
import type { WalletMetadata } from './wallet'

/** A ValueSet for security Values. */
type SecurityValues = Dict<{
	securityAudits: SecurityAuditsValue
	scamPrevention: ScamPreventionValue
	chainVerification: ChainVerificationValue
	hardwareWalletDappSigning: HardwareWalletDappSigningValue
	hardwareWalletSupport: HardwareWalletSupportValue
	softwareHWIntegration: SoftwareHWIntegrationValue
	passkeyImplementation: PasskeyImplementationValue
	bugBountyProgram: BugBountyProgramValue
	supplyChainDIY: SupplyChainDIYValue
	supplyChainFactory: SupplyChainFactoryValue
	firmware: FirmwareValue
	keysHandling: KeysHandlingValue
	userSafety: UserSafetyValue
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
		hardwareWalletDappSigning,
		hardwareWalletSupport,
		softwareHWIntegration,
		passkeyImplementation,
		bugBountyProgram,
		supplyChainDIY,
		supplyChainFactory,
		firmware,
		keysHandling,
		userSafety,
	},
	attributeWeights: {
		securityAudits: 1.0,
		scamPrevention: 1.0,
		chainVerification: 1.0,
		hardwareWalletDappSigning: 1.0,
		hardwareWalletSupport: 1.0,
		softwareHWIntegration: 1.0,
		passkeyImplementation: 1.0,
		bugBountyProgram: 1.0,
		supplyChainDIY: 1.0,
		supplyChainFactory: 1.0,
		firmware: 1.0,
		keysHandling: 1.0,
		userSafety: 1.0,
	},
}

/** A ValueSet for privacy Values. */
type PrivacyValues = Dict<{
	addressCorrelation: AddressCorrelationValue
	multiAddressCorrelation: MultiAddressCorrelationValue
	privateTransfers: PrivateTransfersValue
	hardwarePrivacy: HardwarePrivacyValue
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
	},
	attributeWeights: {
		addressCorrelation: 1.0,
		multiAddressCorrelation: 1.0,
		privateTransfers: 1.0,
		hardwarePrivacy: 1.0,
	},
}

/** A ValueSet for self-sovereignty Values. */
type SelfSovereigntyValues = Dict<{
	selfHostedNode: SelfHostedNodeValue
	accountPortability: AccountPortabilityValue
	transactionInclusion: TransactionInclusionValue
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
		selfHostedNode,
		accountPortability,
		transactionInclusion,
	},
	attributeWeights: {
		selfHostedNode: 1.0,
		accountPortability: 1.0,
		transactionInclusion: 1.0,
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
	interoperability: InteroperabilityValue
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
		interoperability,
	},
	attributeWeights: {
		accountAbstraction: 1.0,
		addressResolution: 1.0,
		browserIntegration: 1.0,
		chainAbstraction: 1.0,
		interoperability: 1.0,
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
	securityAudits: EvaluatedAttribute<SecurityAuditsValue>
	scamPrevention: EvaluatedAttribute<ScamPreventionValue>
	chainVerification: EvaluatedAttribute<ChainVerificationValue>
	hardwareWalletDappSigning: EvaluatedAttribute<HardwareWalletDappSigningValue>
	hardwareWalletSupport: EvaluatedAttribute<HardwareWalletSupportValue>
	softwareHWIntegration: EvaluatedAttribute<SoftwareHWIntegrationValue>
	passkeyImplementation: EvaluatedAttribute<PasskeyImplementationValue>
	bugBountyProgram: EvaluatedAttribute<BugBountyProgramValue>
	supplyChainDIY: EvaluatedAttribute<SupplyChainDIYValue>
	supplyChainFactory: EvaluatedAttribute<SupplyChainFactoryValue>
	firmware: EvaluatedAttribute<FirmwareValue>
	keysHandling: EvaluatedAttribute<KeysHandlingValue>
	userSafety: EvaluatedAttribute<UserSafetyValue>
}

/** Evaluated privacy attributes for a single wallet. */
export interface PrivacyEvaluations extends EvaluatedGroup<PrivacyValues> {
	addressCorrelation: EvaluatedAttribute<AddressCorrelationValue>
	multiAddressCorrelation: EvaluatedAttribute<MultiAddressCorrelationValue>
	privateTransfers: EvaluatedAttribute<PrivateTransfersValue>
}

/** Evaluated self-sovereignty attributes for a single wallet. */
export interface SelfSovereigntyEvaluations extends EvaluatedGroup<SelfSovereigntyValues> {
	selfHostedNode: EvaluatedAttribute<SelfHostedNodeValue>
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
export interface EvaluationTree
	extends NonEmptyRecord<
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
			hardwareWalletDappSigning: evalAttr(hardwareWalletDappSigning),
			hardwareWalletSupport: evalAttr(hardwareWalletSupport),
			softwareHWIntegration: evalAttr(softwareHWIntegration),
			passkeyImplementation: evalAttr(passkeyImplementation),
			bugBountyProgram: evalAttr(bugBountyProgram),
			supplyChainDIY: evalAttr(supplyChainDIY),
			supplyChainFactory: evalAttr(supplyChainFactory),
			firmware: evalAttr(firmware),
			keysHandling: evalAttr(keysHandling),
			userSafety: evalAttr(userSafety),
		},
		privacy: {
			addressCorrelation: evalAttr(addressCorrelation),
			multiAddressCorrelation: evalAttr(multiAddressCorrelation),
			privateTransfers: evalAttr(privateTransfers),
			hardwarePrivacy: evalAttr(hardwarePrivacy),
		},
		selfSovereignty: {
			selfHostedNode: evalAttr(selfHostedNode),
			accountPortability: evalAttr(accountPortability),
			transactionInclusion: evalAttr(transactionInclusion),
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
			interoperability: evalAttr(interoperability),
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
			hardwareWalletDappSigning: attr(tree => tree.security.hardwareWalletDappSigning),
			hardwareWalletSupport: attr(tree => tree.security.hardwareWalletSupport),
			softwareHWIntegration: attr(tree => tree.security.softwareHWIntegration),
			passkeyImplementation: attr(tree => tree.security.passkeyImplementation),
			bugBountyProgram: attr(tree => tree.security.bugBountyProgram),
			supplyChainDIY: attr(tree => tree.security.supplyChainDIY),
			supplyChainFactory: attr(tree => tree.security.supplyChainFactory),
			firmware: attr(tree => tree.security.firmware),
			keysHandling: attr(tree => tree.security.keysHandling),
			userSafety: attr(tree => tree.security.userSafety),
		},
		privacy: {
			addressCorrelation: attr(tree => tree.privacy.addressCorrelation),
			multiAddressCorrelation: attr(tree => tree.privacy.multiAddressCorrelation),
			privateTransfers: attr(tree => tree.privacy.privateTransfers),
			hardwarePrivacy: attr(tree => tree.privacy.hardwarePrivacy),
		},
		selfSovereignty: {
			selfHostedNode: attr(tree => tree.selfSovereignty.selfHostedNode),
			accountPortability: attr(tree => tree.selfSovereignty.accountPortability),
			transactionInclusion: attr(tree => tree.selfSovereignty.transactionInclusion),
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
			interoperability: attr(tree => tree.ecosystem.interoperability),
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
	const subScores: WeightedScore[] = nonEmptyValues<keyof Vs, WeightedScore | null>(
		nonEmptyRemap(weights, (key: keyof Vs, weight: number): WeightedScore | null => {
			const { value } = evaluations[key].evaluation
			const score = value.score ?? defaultRatingScore(value.rating)

			return score === null
				? null
				: {
						score,
						weight,
					}
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
