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
	Rating,
	type Value,
	type ValueSet,
} from './attributes'
import {
	addressCorrelation,
	type AddressCorrelationValue,
} from './attributes/privacy/address-correlation'
import { openSource, type OpenSourceValue } from './attributes/transparency/open-source'
import {
	sourceVisibility,
	type SourceVisibilityValue,
} from './attributes/transparency/source-visibility'
import {
	feeTransparency,
	type FeeTransparencyValue,
} from './attributes/transparency/fee-transparency'
import type { ResolvedFeatures } from './features'
import type { AtLeastOneVariant } from './variants'
import { Variant } from './variants'
import type { Dict } from '@/types/utils/dict'
import { funding, type FundingValue } from './attributes/transparency/funding'
import {
	multiAddressCorrelation,
	type MultiAddressCorrelationValue,
} from './attributes/privacy/multi-address-correlation'
import { type MaybeUnratedScore, type WeightedScore, weightedScore } from './score'
import { sentence } from '@/types/content'
import type { WalletMetadata } from './wallet'
import {
	chainVerification,
	type ChainVerificationValue,
} from './attributes/security/chain-verification'
import {
	selfHostedNode,
	type SelfHostedNodeValue,
} from './attributes/self-sovereignty/self-hosted-node'
import {
	browserIntegration,
	type BrowserIntegrationValue,
} from './attributes/ecosystem/browser-integration'
import {
	addressResolution,
	type AddressResolutionValue,
} from './attributes/ecosystem/address-resolution'
import { securityAudits, type SecurityAuditsValue } from './attributes/security/security-audits'
import {
	hardwareWalletClearSigning,
	type HardwareWalletClearSigningValue,
} from './attributes/security/hardware-wallet-clear-signing'
import {
	hardwareWalletSupport,
	type HardwareWalletSupportValue,
} from './attributes/security/hardware-wallet-support'
import {
	transactionInclusion,
	type TransactionInclusionValue,
} from './attributes/self-sovereignty/transaction-inclusion'
import {
	accountAbstraction,
	type AccountAbstractionValue,
} from './attributes/ecosystem/account-abstraction'
import {
	accountPortability,
	type AccountPortabilityValue,
} from './attributes/self-sovereignty/account-portability'
import {
	passkeyImplementation,
	type PasskeyImplementationValue,
} from './attributes/security/passkey-implementation'
import {
	softwareHWIntegration,
	type SoftwareHWIntegrationValue,
} from './attributes/security/software-hw-integration'
import {
	bugBountyProgram,
	type BugBountyProgramValue,
} from './attributes/security/bug-bounty-program'
import { scamPrevention, type ScamPreventionValue } from './attributes/security/scam-prevention'
import { maintenance, type MaintenanceValue } from './attributes/transparency/maintenance'
import { reputation, type ReputationValue } from './attributes/transparency/reputation'
import {
	ecosystemAlignment,
	type EcosystemAlignmentValue,
} from './attributes/ecosystem/ecosystem-alignment'
import {
	interoperability,
	type InteroperabilityValue,
} from './attributes/self-sovereignty/interoperability'
import { hardwarePrivacy, type HardwarePrivacyValue } from './attributes/privacy/hardware-privacy'
import { supplyChainDIY, type SupplyChainDIYValue } from './attributes/security/supply-chain-diy'
import {
	supplyChainFactory,
	type SupplyChainFactoryValue,
} from './attributes/security/supply-chain-factory'
import { firmware, type FirmwareValue } from './attributes/security/firmware'
import { keysHandling, type KeysHandlingValue } from './attributes/security/keys-handling'
import { userSafety, type UserSafetyValue } from './attributes/security/user-safety'
import { exempt } from './attributes/common'
import { HardwareWalletManufactureType } from './features/profile'
import { SupplyChainDIYType } from './features/security/supply-chain-diy'
import { SupplyChainFactoryType } from './features/security/supply-chain-factory'

/** A ValueSet for security Values. */
type SecurityValues = Dict<{
	securityAudits: SecurityAuditsValue
	scamPrevention: ScamPreventionValue
	chainVerification: ChainVerificationValue
	hardwareWalletClearSigning: HardwareWalletClearSigningValue
	hardwareWalletSupport: HardwareWalletSupportValue
	softwareHWIntegration: SoftwareHWIntegrationValue
	passkeyImplementation: PasskeyImplementationValue
	bugBountyProgram: BugBountyProgramValue
	supply_chain_diy: SupplyChainDIYValue
	supply_chain_factory: SupplyChainFactoryValue
	firmware: FirmwareValue
	keysHandling: KeysHandlingValue
	userSafety: UserSafetyValue
}>

/** Security attributes. */
export const securityAttributeGroup: AttributeGroup<SecurityValues> = {
	id: 'security',
	icon: '\u{1f512}', // Lock
	displayName: 'Security',
	perWalletQuestion: sentence<WalletMetadata>(
		(walletMetadata: WalletMetadata): string => `How secure is ${walletMetadata.displayName}?`,
	),
	attributes: {
		securityAudits,
		scamPrevention,
		chainVerification,
		hardwareWalletClearSigning,
		hardwareWalletSupport,
		softwareHWIntegration,
		passkeyImplementation,
		bugBountyProgram,
		supply_chain_diy: supplyChainDIY,
		supply_chain_factory: supplyChainFactory,
		firmware,
		keysHandling,
		userSafety,
	},
	score: scoreGroup<SecurityValues>({
		securityAudits: 1.0,
		scamPrevention: 1.0,
		chainVerification: 1.0,
		hardwareWalletClearSigning: 1.0,
		hardwareWalletSupport: 1.0,
		softwareHWIntegration: 1.0,
		passkeyImplementation: 1.0,
		bugBountyProgram: 1.0,
		supply_chain_diy: 1.0,
		supply_chain_factory: 1.0,
		firmware: 1.0,
		keysHandling: 1.0,
		userSafety: 1.0,
	}),
}

/** A ValueSet for privacy Values. */
type PrivacyValues = Dict<{
	addressCorrelation: AddressCorrelationValue
	multiAddressCorrelation: MultiAddressCorrelationValue
	hardwarePrivacy: HardwarePrivacyValue
}>

/** Privacy attributes. */
export const privacyAttributeGroup: AttributeGroup<PrivacyValues> = {
	id: 'privacy',
	icon: '\u{1f575}', // Detective
	displayName: 'Privacy',
	perWalletQuestion: sentence<WalletMetadata>(
		(walletMetadata: WalletMetadata): string =>
			`How well does ${walletMetadata.displayName} protect your privacy?`,
	),
	attributes: {
		addressCorrelation,
		multiAddressCorrelation,
		hardwarePrivacy,
	},
	score: scoreGroup<PrivacyValues>({
		addressCorrelation: 1.0,
		multiAddressCorrelation: 1.0,
		hardwarePrivacy: 1.0,
	}),
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
	perWalletQuestion: sentence<WalletMetadata>(
		(walletMetadata: WalletMetadata): string =>
			`How much control and ownership over your wallet does ${walletMetadata.displayName} give you?`,
	),
	attributes: {
		selfHostedNode,
		accountPortability,
		transactionInclusion,
	},
	score: scoreGroup<SelfSovereigntyValues>({
		selfHostedNode: 1.0,
		accountPortability: 1.0,
		transactionInclusion: 1.0,
	}),
}

/** A ValueSet for transparency Values. */
type TransparencyValues = Dict<{
	openSource: OpenSourceValue
	sourceVisibility: SourceVisibilityValue
	funding: FundingValue
	feeTransparency: FeeTransparencyValue
	reputation: ReputationValue
	maintenance: MaintenanceValue
}>

/** Transparency attributes. */
export const transparencyAttributeGroup: AttributeGroup<TransparencyValues> = {
	id: 'transparency',
	icon: '\u{1f50d}', // Looking glass
	displayName: 'Transparency',
	perWalletQuestion: sentence<WalletMetadata>(
		(walletMetadata: WalletMetadata): string =>
			`How transparent and sustainable is ${walletMetadata.displayName}'s development model?`,
	),
	attributes: {
		openSource,
		sourceVisibility,
		funding,
		feeTransparency,
		reputation,
		maintenance,
	},
	score: scoreGroup<TransparencyValues>({
		openSource: 1.0,
		sourceVisibility: 1.0,
		funding: 1.0,
		feeTransparency: 1.0,
		reputation: 1.0,
		maintenance: 1.0,
	}),
}

/** A ValueSet for ecosystem Values. */
type EcosystemValues = Dict<{
	accountAbstraction: AccountAbstractionValue
	addressResolution: AddressResolutionValue
	browserIntegration: BrowserIntegrationValue
	ecosystemAlignment: EcosystemAlignmentValue
	interoperability: InteroperabilityValue
}>

/** Ecosystem attributes. */
export const ecosystemAttributeGroup: AttributeGroup<EcosystemValues> = {
	id: 'ecosystem',
	icon: '🌐',
	displayName: 'Ecosystem',
	perWalletQuestion: sentence<WalletMetadata>(
		(walletMetadata: WalletMetadata): string =>
			`How well does ${walletMetadata.displayName} align with the ecosystem?`,
	),
	attributes: {
		accountAbstraction,
		addressResolution,
		browserIntegration,
		ecosystemAlignment,
		interoperability,
	},
	score: scoreGroup<EcosystemValues>({
		accountAbstraction: 1.0,
		addressResolution: 1.0,
		browserIntegration: 1.0,
		ecosystemAlignment: 1.0,
		interoperability: 1.0,
	}),
}

/** Maintenance attributes. */
export const maintenanceAttributeGroup: AttributeGroup<{ maintenance: MaintenanceValue }> = {
	id: 'maintenance',
	icon: '🛠️',
	displayName: 'Maintenance',
	perWalletQuestion: sentence<WalletMetadata>(
		(walletMetadata: WalletMetadata): string =>
			`How well-maintained is ${walletMetadata.displayName}?`,
	),
	attributes: {
		maintenance,
	},
	score: scoreGroup({
		maintenance: 1.0,
	}),
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
	hardwareWalletClearSigning: EvaluatedAttribute<HardwareWalletClearSigningValue>
	hardwareWalletSupport: EvaluatedAttribute<HardwareWalletSupportValue>
	softwareHWIntegration: EvaluatedAttribute<SoftwareHWIntegrationValue>
	passkeyImplementation: EvaluatedAttribute<PasskeyImplementationValue>
	bugBountyProgram: EvaluatedAttribute<BugBountyProgramValue>
	supply_chain_diy: EvaluatedAttribute<SupplyChainDIYValue>
	supply_chain_factory: EvaluatedAttribute<SupplyChainFactoryValue>
	firmware: EvaluatedAttribute<FirmwareValue>
	keysHandling: EvaluatedAttribute<KeysHandlingValue>
	userSafety: EvaluatedAttribute<UserSafetyValue>
}

/** Evaluated privacy attributes for a single wallet. */
export interface PrivacyEvaluations extends EvaluatedGroup<PrivacyValues> {
	addressCorrelation: EvaluatedAttribute<AddressCorrelationValue>
	multiAddressCorrelation: EvaluatedAttribute<MultiAddressCorrelationValue>
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
	ecosystemAlignment: EvaluatedAttribute<EcosystemAlignmentValue>
}

/** Evaluated attributes for a single wallet. */
export interface EvaluationTree
	extends NonEmptyRecord<
		string,
		EvaluatedGroup<
			SecurityValues | PrivacyValues | SelfSovereigntyValues | TransparencyValues | EcosystemValues
		>
	> {
	security: SecurityEvaluations
	privacy: PrivacyEvaluations
	selfSovereignty: SelfSovereigntyEvaluations
	transparency: TransparencyEvaluations
	ecosystem: EcosystemEvaluations
}

/** Rate a wallet's attributes based on its features and metadata. */
export function evaluateAttributes(
	features: ResolvedFeatures,
	metadata: WalletMetadata,
): EvaluationTree {
	const evalAttr = <V extends Value>(attr: Attribute<V>): EvaluatedAttribute<V> => ({
		attribute: attr,
		evaluation: attr.evaluate(features),
	})

	// Helper for exempt evaluation
	const createExemptEvaluation = <V extends Value>(
		attr: Attribute<V>,
		reason: string,
		defaultValue: Omit<V, keyof Value | '__brand'>,
	): EvaluatedAttribute<V> => ({
		attribute: attr,
		evaluation: exempt(attr, sentence(reason), `attributes.${attr.id}` as any, defaultValue),
	})

	// Determine if DIY/Factory attributes should be exempt
	const isHardware = features.variant === Variant.HARDWARE
	const isDIY =
		isHardware && metadata.hardwareWalletManufactureType === HardwareWalletManufactureType.DIY
	const isFactory =
		isHardware &&
		metadata.hardwareWalletManufactureType === HardwareWalletManufactureType.FACTORY_MADE

	const supplyChainDIYEvaluation =
		!isDIY && isHardware // Exempt if Hardware but not DIY
			? createExemptEvaluation(supplyChainDIY, 'Attribute only applies to DIY hardware wallets.', {
					diyNoNda: SupplyChainDIYType.FAIL,
					componentSourcingComplexity: SupplyChainDIYType.FAIL,
				})
			: evalAttr(supplyChainDIY)

	const supplyChainFactoryEvaluation = isDIY // Exempt if DIY
		? createExemptEvaluation(
				supplyChainFactory,
				'Attribute only applies to Factory-Made hardware wallets.',
				{
					factoryOpsecDocs: SupplyChainFactoryType.FAIL,
					factoryOpsecAudit: SupplyChainFactoryType.FAIL,
					tamperEvidence: SupplyChainFactoryType.FAIL,
					hardwareVerification: SupplyChainFactoryType.FAIL,
					tamperResistance: SupplyChainFactoryType.FAIL,
					genuineCheck: SupplyChainFactoryType.FAIL,
				},
			)
		: evalAttr(supplyChainFactory)

	return {
		security: {
			securityAudits: evalAttr(securityAudits),
			scamPrevention: evalAttr(scamPrevention),
			chainVerification: evalAttr(chainVerification),
			hardwareWalletClearSigning: evalAttr(hardwareWalletClearSigning),
			hardwareWalletSupport: evalAttr(hardwareWalletSupport),
			softwareHWIntegration: evalAttr(softwareHWIntegration),
			passkeyImplementation: evalAttr(passkeyImplementation),
			bugBountyProgram: evalAttr(bugBountyProgram),
			supply_chain_diy: supplyChainDIYEvaluation,
			supply_chain_factory: supplyChainFactoryEvaluation,
			firmware: evalAttr(firmware),
			keysHandling: evalAttr(keysHandling),
			userSafety: evalAttr(userSafety),
		},
		privacy: {
			addressCorrelation: evalAttr(addressCorrelation),
			multiAddressCorrelation: evalAttr(multiAddressCorrelation),
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
			maintenance: evalAttr(maintenance),
		},
		ecosystem: {
			accountAbstraction: evalAttr(accountAbstraction),
			addressResolution: evalAttr(addressResolution),
			browserIntegration: evalAttr(browserIntegration),
			ecosystemAlignment: evalAttr(ecosystemAlignment),
			interoperability: evalAttr(interoperability),
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
			hardwareWalletClearSigning: attr(tree => tree.security.hardwareWalletClearSigning),
			hardwareWalletSupport: attr(tree => tree.security.hardwareWalletSupport),
			softwareHWIntegration: attr(tree => tree.security.softwareHWIntegration),
			passkeyImplementation: attr(tree => tree.security.passkeyImplementation),
			bugBountyProgram: attr(tree => tree.security.bugBountyProgram),
			supply_chain_diy: attr(tree => tree.security.supply_chain_diy),
			supply_chain_factory: attr(tree => tree.security.supply_chain_factory),
			firmware: attr(tree => tree.security.firmware),
			keysHandling: attr(tree => tree.security.keysHandling),
			userSafety: attr(tree => tree.security.userSafety),
		},
		privacy: {
			addressCorrelation: attr(tree => tree.privacy.addressCorrelation),
			multiAddressCorrelation: attr(tree => tree.privacy.multiAddressCorrelation),
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
			maintenance: attr(tree => tree.transparency.maintenance),
		},
		ecosystem: {
			accountAbstraction: attr(tree => tree.ecosystem.accountAbstraction),
			addressResolution: attr(tree => tree.ecosystem.addressResolution),
			browserIntegration: attr(tree => tree.ecosystem.browserIntegration),
			ecosystemAlignment: attr(tree => tree.ecosystem.ecosystemAlignment),
			interoperability: attr(tree => tree.ecosystem.interoperability),
		},
	}
}

/**
 * Iterate over all attribute groups in a tree, calling `fn` with each group.
 */
export function mapAttributeGroups<T>(
	tree: EvaluationTree | undefined | null,
	fn: <Vs extends ValueSet>(
		attrGroup: AttributeGroup<Vs>,
		evalGroup: EvaluatedGroup<Vs> | undefined,
	) => T,
): T[] {
	// If tree is null/undefined, return empty array
	if (!tree) {
		console.warn('mapAttributeGroups called with null or undefined tree. Returning empty array.')
		return []
	}

	return Object.entries(attributeTree).map(([groupName, attrGroup]) => {
		// Check if the group exists in the tree
		const evalGroup = tree[groupName]
		return fn(attrGroup, evalGroup)
	})
}

/**
 * Iterate over all attributes in an attribute group, calling `fn` with each
 * attribute and its corresponding key in the group.
 */
export function mapGroupAttributes<T, Vs extends ValueSet>(
	evalGroup: EvaluatedGroup<Vs> | undefined | null,
	fn: <V extends Value>(evalAttr: EvaluatedAttribute<V>, attributeKey: keyof Vs) => T,
): T[] {
	// If evalGroup is null/undefined, return empty array
	if (!evalGroup) {
		console.warn(
			'mapGroupAttributes called with null or undefined evalGroup. Returning empty array.',
		)
		return []
	}

	// Use Object.entries to get both key and value
	return Object.entries(evalGroup).map(([key, evalAttr]) =>
		fn(evalAttr as EvaluatedAttribute<Value>, key as keyof Vs),
	)
}

/**
 * Given an evaluation tree as template, call `fn` with a getter function
 * that can return that attribute for any given tree.
 * Useful to compare multiple trees of attributes, by calling `getter` on
 * various trees.
 */
export function mapAttributesGetter(
	templateTree: EvaluationTree | any, // Allow any type for robust check
	fn: <V extends Value>(
		getter: (evalTree: EvaluationTree) => EvaluatedAttribute<V> | undefined,
	) => void,
): void {
	// <<< MORE ROBUST CHECK HERE >>>
	if (typeof templateTree !== 'object' || templateTree === null) {
		console.error(
			'mapAttributesGetter called with invalid templateTree (not an object or null). Skipping. Value:',
			templateTree,
		)
		return // Exit early if templateTree is not a valid object
	}
	// <<< END CHECK >>>

	// Now we know templateTree is a non-null object, proceed with caution
	try {
		console.log(
			'[mapAttributesGetter] Inspecting templateTree right before Object.keys:',
			JSON.stringify(templateTree, null, 2),
		)
		for (const groupName of Object.keys(templateTree)) {
			const group = templateTree[groupName]
			if (typeof group !== 'object' || group === null) {
				console.warn(
					`mapAttributesGetter: Skipping invalid group '${groupName}' (not an object or null) in templateTree. Value:`,
					group,
				)
				continue // Skip to the next group if this one is invalid
			}
			for (const attrName of Object.keys(group)) {
				// Ensure the getter function exists and is callable
				if (typeof fn === 'function') {
					fn(<V extends Value>(evalTree: EvaluationTree): EvaluatedAttribute<V> | undefined => {
						// Add checks inside the getter callback as well
						if (typeof evalTree !== 'object' || evalTree === null || !evalTree[groupName]) {
							return undefined
						}
						const evalGroup = evalTree[groupName] as any
						return evalGroup[attrName] as EvaluatedAttribute<V>
					})
				} else {
					console.error('mapAttributesGetter: Provided fn is not a function.')
					break // Exit inner loop if fn is invalid
				}
			}
		}
	} catch (error) {
		console.error(
			'Error during mapAttributesGetter execution:',
			error,
			'TemplateTree:',
			templateTree,
		)
		// Optionally re-throw or handle error further
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
	const otherEvalAttr = mapAttributeGroups(
		otherTree,
		(_, evalGroup): EvaluatedAttribute<V> | undefined => {
			// Add check here: If evalGroup is undefined, return undefined immediately
			if (!evalGroup) {
				return undefined
			}
			// Now it's safe to use Object.hasOwn
			if (Object.hasOwn(evalGroup, evalAttr.attribute.id)) {
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
 * Generic function for scoring a group of evaluations.
 * @param weights A map from attribute name to its relative weight.
 * @returns A function to score the group of evaluations.
 */
function scoreGroup<Vs extends ValueSet>(weights: { [k in keyof Vs]: number }): (
	evaluations: EvaluatedGroup<Vs>,
) => MaybeUnratedScore {
	return (evaluations: EvaluatedGroup<Vs>): MaybeUnratedScore => {
		const subScores: WeightedScore[] = nonEmptyValues<keyof Vs, WeightedScore | null>(
			nonEmptyRemap(weights, (key: keyof Vs, weight: number): WeightedScore | null => {
				const value = evaluations[key].evaluation.value
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
}

// Hardware-only attribute IDs for each group
const hardwareOnlySecurity = [
	'supply_chain_diy',
	'supply_chain_factory',
	'firmware',
	'keysHandling',
	'userSafety',
]
const hardwareOnlyPrivacy = ['hardwarePrivacy']
const hardwareOnlyTransparency = ['reputation', 'maintenance']
const hardwareOnlyEcosystem = ['ecosystemAlignment', 'interoperability']

/**
 * Returns attribute groups relevant for the wallet.
 * NOTE: This function currently returns all defined groups, but could be used for filtering later.
 */
export function getAttributeGroupsForWallet(features: ResolvedFeatures | undefined) {
	// TODO: Add logic here if we ever need to return different *sets* of groups
	// based on features. For now, just return the main attribute tree.
	// Remove the previous filtering logic that was causing double-filtering.
	return {
		security: securityAttributeGroup,
		privacy: privacyAttributeGroup,
		selfSovereignty: selfSovereigntyAttributeGroup,
		transparency: transparencyAttributeGroup,
		ecosystem: ecosystemAttributeGroup,
		maintenance: maintenanceAttributeGroup, // Assuming maintenance is always relevant
	}
}

/**
 * Returns only the attributes relevant for the wallet (filters out hardwareOnly attributes for non-hardware wallets).
 */
export function getVisibleAttributesForWallet(
	attrGroup: AttributeGroup<any>,
	features: any,
	isHardwareWallet: boolean,
) {
	let hardwareOnly: string[] = []
	switch (attrGroup.id) {
		case 'security':
			hardwareOnly = hardwareOnlySecurity
			break
		case 'privacy':
			hardwareOnly = hardwareOnlyPrivacy
			break
		case 'transparency':
			hardwareOnly = hardwareOnlyTransparency
			break
		case 'ecosystem':
			hardwareOnly = hardwareOnlyEcosystem
			break
		default:
			hardwareOnly = []
	}
	return Object.entries(attrGroup.attributes).filter(
		([id, _attr]) => isHardwareWallet || !hardwareOnly.includes(id),
	)
}
