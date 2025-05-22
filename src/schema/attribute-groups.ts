import { sentence } from '@/types/content';
import type { Dict } from '@/types/utils/dict';
import {
	isNonEmptyArray,
	nonEmptyGet,
	type NonEmptyRecord,
	nonEmptyRemap,
	nonEmptyValues,
} from '@/types/utils/non-empty';

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
} from './attributes';
import {
	accountAbstraction,
	type AccountAbstractionValue,
} from './attributes/ecosystem/account-abstraction';
import {
	addressResolution,
	type AddressResolutionValue,
} from './attributes/ecosystem/address-resolution';
import {
	browserIntegration,
	type BrowserIntegrationValue,
} from './attributes/ecosystem/browser-integration';
import {
	addressCorrelation,
	type AddressCorrelationValue,
} from './attributes/privacy/address-correlation';
import { hardwarePrivacy, type HardwarePrivacyValue } from './attributes/privacy/hardware-privacy';
import {
	multiAddressCorrelation,
	type MultiAddressCorrelationValue,
} from './attributes/privacy/multi-address-correlation';
import {
	bugBountyProgram,
	type BugBountyProgramValue,
} from './attributes/security/bug-bounty-program';
import {
	chainVerification,
	type ChainVerificationValue,
} from './attributes/security/chain-verification';
import { firmware, type FirmwareValue } from './attributes/security/firmware';
import {
	hardwareWalletDappSigning,
	type HardwareWalletDappSigningValue,
} from './attributes/security/hardware-wallet-dapp-signing';
import {
	hardwareWalletSupport,
	type HardwareWalletSupportValue,
} from './attributes/security/hardware-wallet-support';
import { keysHandling, type KeysHandlingValue } from './attributes/security/keys-handling';
import {
	passkeyImplementation,
	type PasskeyImplementationValue,
} from './attributes/security/passkey-implementation';
import { scamPrevention, type ScamPreventionValue } from './attributes/security/scam-prevention';
import { securityAudits, type SecurityAuditsValue } from './attributes/security/security-audits';
import {
	softwareHWIntegration,
	type SoftwareHWIntegrationValue,
} from './attributes/security/software-hw-integration';
import { supplyChainDIY, type SupplyChainDIYValue } from './attributes/security/supply-chain-diy';
import {
	supplyChainFactory,
	type SupplyChainFactoryValue,
} from './attributes/security/supply-chain-factory';
import { userSafety, type UserSafetyValue } from './attributes/security/user-safety';
import {
	accountPortability,
	type AccountPortabilityValue,
} from './attributes/self-sovereignty/account-portability';
import {
	interoperability,
	type InteroperabilityValue,
} from './attributes/self-sovereignty/interoperability';
import {
	selfHostedNode,
	type SelfHostedNodeValue,
} from './attributes/self-sovereignty/self-hosted-node';
import {
	transactionInclusion,
	type TransactionInclusionValue,
} from './attributes/self-sovereignty/transaction-inclusion';
import {
	feeTransparency,
	type FeeTransparencyValue,
} from './attributes/transparency/fee-transparency';
import { funding, type FundingValue } from './attributes/transparency/funding';
import { maintenance, type MaintenanceValue } from './attributes/transparency/maintenance';
import { openSource, type OpenSourceValue } from './attributes/transparency/open-source';
import { reputation, type ReputationValue } from './attributes/transparency/reputation';
import {
	sourceVisibility,
	type SourceVisibilityValue,
} from './attributes/transparency/source-visibility';
import type { ResolvedFeatures } from './features';
import { type MaybeUnratedScore, type WeightedScore, weightedScore } from './score';
import type { AtLeastOneVariant, Variant } from './variants';
import type { WalletMetadata } from './wallet';

/** A ValueSet for security Values. */
type SecurityValues = Dict<{
	securityAudits: SecurityAuditsValue;
	scamPrevention: ScamPreventionValue;
	chainVerification: ChainVerificationValue;
	hardwareWalletDappSigning: HardwareWalletDappSigningValue;
	hardwareWalletSupport: HardwareWalletSupportValue;
	softwareHWIntegration: SoftwareHWIntegrationValue;
	passkeyImplementation: PasskeyImplementationValue;
	bugBountyProgram: BugBountyProgramValue;
	supplyChainDIY: SupplyChainDIYValue;
	supplyChainFactory: SupplyChainFactoryValue;
	firmware: FirmwareValue;
	keysHandling: KeysHandlingValue;
	userSafety: UserSafetyValue;
}>;

/** Security attributes. */
export const securityAttributeGroup: AttributeGroup<SecurityValues> = {
	id: 'security',
	icon: '\u{1f512}', // Lock
	displayName: 'Security',
	perWalletQuestion: sentence<Pick<WalletMetadata, 'displayName'>>(
		(walletMetadata: Pick<WalletMetadata, 'displayName'>): string =>
			`How secure is ${walletMetadata.displayName}?`,
	),
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
	score: scoreGroup<SecurityValues>({
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
	}),
};

/** A ValueSet for privacy Values. */
type PrivacyValues = Dict<{
	addressCorrelation: AddressCorrelationValue;
	multiAddressCorrelation: MultiAddressCorrelationValue;
	hardware_privacy: HardwarePrivacyValue;
}>;

/** Privacy attributes. */
export const privacyAttributeGroup: AttributeGroup<PrivacyValues> = {
	id: 'privacy',
	icon: '\u{1f575}', // Detective
	displayName: 'Privacy',
	perWalletQuestion: sentence<Pick<WalletMetadata, 'displayName'>>(
		(walletMetadata: Pick<WalletMetadata, 'displayName'>): string =>
			`How well does ${walletMetadata.displayName} protect your privacy?`,
	),
	attributes: {
		addressCorrelation,
		multiAddressCorrelation,
		hardware_privacy: hardwarePrivacy,
	},
	score: scoreGroup<PrivacyValues>({
		addressCorrelation: 1.0,
		multiAddressCorrelation: 1.0,
		hardware_privacy: 1.0,
	}),
};

/** A ValueSet for self-sovereignty Values. */
type SelfSovereigntyValues = Dict<{
	selfHostedNode: SelfHostedNodeValue;
	accountPortability: AccountPortabilityValue;
	transactionInclusion: TransactionInclusionValue;
}>;

/** Self-sovereignty attributes. */
export const selfSovereigntyAttributeGroup: AttributeGroup<SelfSovereigntyValues> = {
	id: 'selfSovereignty',
	icon: '\u{1f3f0}', // Castle
	displayName: 'Self-sovereignty',
	perWalletQuestion: sentence<Pick<WalletMetadata, 'displayName'>>(
		(walletMetadata: Pick<WalletMetadata, 'displayName'>): string =>
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
};

/** A ValueSet for transparency Values. */
type TransparencyValues = Dict<{
	openSource: OpenSourceValue;
	sourceVisibility: SourceVisibilityValue;
	funding: FundingValue;
	feeTransparency: FeeTransparencyValue;
	reputation: ReputationValue;
}>;

/** Transparency attributes. */
export const transparencyAttributeGroup: AttributeGroup<TransparencyValues> = {
	id: 'transparency',
	icon: '\u{1f50d}', // Looking glass
	displayName: 'Transparency',
	perWalletQuestion: sentence<Pick<WalletMetadata, 'displayName'>>(
		(walletMetadata: Pick<WalletMetadata, 'displayName'>): string =>
			`How transparent and sustainable is ${walletMetadata.displayName}'s development model?`,
	),
	attributes: {
		openSource,
		sourceVisibility,
		funding,
		feeTransparency,
		reputation,
	},
	score: scoreGroup<TransparencyValues>({
		openSource: 1.0,
		sourceVisibility: 1.0,
		funding: 1.0,
		feeTransparency: 1.0,
		reputation: 1.0,
	}),
};

/** A ValueSet for ecosystem Values. */
type EcosystemValues = Dict<{
	accountAbstraction: AccountAbstractionValue;
	addressResolution: AddressResolutionValue;
	browserIntegration: BrowserIntegrationValue;
	interoperability: InteroperabilityValue;
}>;

/** Ecosystem attributes. */
export const ecosystemAttributeGroup: AttributeGroup<EcosystemValues> = {
	id: 'ecosystem',
	icon: '🌐',
	displayName: 'Ecosystem',
	perWalletQuestion: sentence<Pick<WalletMetadata, 'displayName'>>(
		(walletMetadata: Pick<WalletMetadata, 'displayName'>): string =>
			`How well does ${walletMetadata.displayName} align with the ecosystem?`,
	),
	attributes: {
		accountAbstraction,
		addressResolution,
		browserIntegration,
		interoperability,
	},
	score: scoreGroup<EcosystemValues>({
		accountAbstraction: 1.0,
		addressResolution: 1.0,
		browserIntegration: 1.0,
		interoperability: 1.0,
	}),
};

/** A ValueSet for maintenance Values. */
type MaintenanceValues = Dict<{
	maintenance: MaintenanceValue;
}>;

/** Maintenance attributes. */
export const maintenanceAttributeGroup: AttributeGroup<MaintenanceValues> = {
	id: 'maintenance',
	icon: '🛠️',
	displayName: 'Maintenance',
	perWalletQuestion: sentence<Pick<WalletMetadata, 'displayName'>>(
		(walletMetadata: Pick<WalletMetadata, 'displayName'>): string =>
			`How well-maintained is ${walletMetadata.displayName}?`,
	),
	attributes: {
		maintenance,
	},
	score: scoreGroup<MaintenanceValues>({
		maintenance: 1.0,
	}),
};

/** The set of attribute groups that make up wallet attributes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary to allow any Attribute implementation.
export const attributeTree: NonEmptyRecord<string, AttributeGroup<any>> = {
	security: securityAttributeGroup,
	privacy: privacyAttributeGroup,
	selfSovereignty: selfSovereigntyAttributeGroup,
	transparency: transparencyAttributeGroup,
	ecosystem: ecosystemAttributeGroup,
	maintenance: maintenanceAttributeGroup,
};

/** Evaluated security attributes for a single wallet. */
export interface SecurityEvaluations extends EvaluatedGroup<SecurityValues> {
	securityAudits: EvaluatedAttribute<SecurityAuditsValue>;
	scamPrevention: EvaluatedAttribute<ScamPreventionValue>;
	chainVerification: EvaluatedAttribute<ChainVerificationValue>;
	hardwareWalletDappSigning: EvaluatedAttribute<HardwareWalletDappSigningValue>;
	hardwareWalletSupport: EvaluatedAttribute<HardwareWalletSupportValue>;
	softwareHWIntegration: EvaluatedAttribute<SoftwareHWIntegrationValue>;
	passkeyImplementation: EvaluatedAttribute<PasskeyImplementationValue>;
	bugBountyProgram: EvaluatedAttribute<BugBountyProgramValue>;
	supplyChainDIY: EvaluatedAttribute<SupplyChainDIYValue>;
	supplyChainFactory: EvaluatedAttribute<SupplyChainFactoryValue>;
	firmware: EvaluatedAttribute<FirmwareValue>;
	keysHandling: EvaluatedAttribute<KeysHandlingValue>;
	userSafety: EvaluatedAttribute<UserSafetyValue>;
}

/** Evaluated privacy attributes for a single wallet. */
export interface PrivacyEvaluations extends EvaluatedGroup<PrivacyValues> {
	addressCorrelation: EvaluatedAttribute<AddressCorrelationValue>;
	multiAddressCorrelation: EvaluatedAttribute<MultiAddressCorrelationValue>;
}

/** Evaluated self-sovereignty attributes for a single wallet. */
export interface SelfSovereigntyEvaluations extends EvaluatedGroup<SelfSovereigntyValues> {
	selfHostedNode: EvaluatedAttribute<SelfHostedNodeValue>;
	accountPortability: EvaluatedAttribute<AccountPortabilityValue>;
	transactionInclusion: EvaluatedAttribute<TransactionInclusionValue>;
}

/** Evaluated transparency attributes for a single wallet. */
export interface TransparencyEvaluations extends EvaluatedGroup<TransparencyValues> {
	openSource: EvaluatedAttribute<OpenSourceValue>;
	sourceVisibility: EvaluatedAttribute<SourceVisibilityValue>;
	funding: EvaluatedAttribute<FundingValue>;
	feeTransparency: EvaluatedAttribute<FeeTransparencyValue>;
}

/** Evaluated ecosystem attributes for a single wallet. */
export interface EcosystemEvaluations extends EvaluatedGroup<EcosystemValues> {
	accountAbstraction: EvaluatedAttribute<AccountAbstractionValue>;
	addressResolution: EvaluatedAttribute<AddressResolutionValue>;
	browserIntegration: EvaluatedAttribute<BrowserIntegrationValue>;
	interoperability: EvaluatedAttribute<InteroperabilityValue>;
}

/** Evaluated maintenance attributes for a single wallet. */
export interface MaintenanceEvaluations extends EvaluatedGroup<MaintenanceValues> {
	maintenance: EvaluatedAttribute<MaintenanceValue>;
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
	security: SecurityEvaluations;
	privacy: PrivacyEvaluations;
	selfSovereignty: SelfSovereigntyEvaluations;
	transparency: TransparencyEvaluations;
	ecosystem: EcosystemEvaluations;
	maintenance: MaintenanceEvaluations;
}

/** Rate a wallet's attributes based on its features and metadata. */
export function evaluateAttributes(
	features: ResolvedFeatures,
	walletMetadata: WalletMetadata,
): EvaluationTree {
	const evalAttr = <V extends Value>(attr: Attribute<V>): EvaluatedAttribute<V> => {
		if (attr.exempted !== undefined) {
			const maybeExempt = attr.exempted(features, walletMetadata);
			if (maybeExempt !== null) {
				if (!isExempt(maybeExempt)) {
					throw new Error(
						`Attribute ${attr.id}'s exemption rating function returned a non-exempt rating`,
					);
				}
				return {
					attribute: attr,
					evaluation: maybeExempt,
				};
			}
		}
		return {
			attribute: attr,
			evaluation: attr.evaluate(features),
		};
	};
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
			hardware_privacy: evalAttr(hardwarePrivacy),
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
			interoperability: evalAttr(interoperability),
		},
		maintenance: {
			maintenance: evalAttr(maintenance),
		},
	};
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
		).attribute;
		const evaluations = nonEmptyRemap(
			perVariant,
			(_, tree: EvaluationTree) => getter(tree).evaluation,
		);
		return {
			attribute,
			evaluation: attribute.aggregate(evaluations),
		};
	};
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
			hardware_privacy: attr(tree => tree.privacy.hardware_privacy),
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
			interoperability: attr(tree => tree.ecosystem.interoperability),
		},
		maintenance: {
			maintenance: attr(tree => tree.maintenance.maintenance),
		},
	};
}

/**
 * Get a specific evaluated attribute group from an evaluation tree.
 */
export function getAttributeGroupInTree<Vs extends ValueSet>(
	tree: EvaluationTree,
	attrGroup: AttributeGroup<Vs>,
): EvaluatedGroup<Vs> {
	return tree[attrGroup.id] as EvaluatedGroup<Vs>;
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
		);
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
		.map(fn);
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
	).length;
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
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- We know that `evalTree[groupName]` has `attrName` as property, due to how we iterated to get here.
					(evalTree[groupName] as any)[attrName] as EvaluatedAttribute<V>,
			);
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
				return evalGroup[evalAttr.attribute.id] as unknown as EvaluatedAttribute<V>;
			}
			return undefined;
		},
	).find(v => v !== undefined);
	if (otherEvalAttr === undefined) {
		throw new Error(
			`Incomplete evaluation tree; did not found evaluation for attribute ${evalAttr.attribute.id}`,
		);
	}
	return otherEvalAttr;
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
				const value = evaluations[key].evaluation.value;
				const score = value.score ?? defaultRatingScore(value.rating);
				return score === null
					? null
					: {
							score,
							weight,
						};
			}),
		).filter(score => score !== null);
		if (isNonEmptyArray(subScores)) {
			let hasUnratedComponent = false;
			for (const evalAttr of evaluatedAttributes(evaluations)) {
				hasUnratedComponent ||= evalAttr.evaluation.value.rating === Rating.UNRATED;
			}
			return { score: weightedScore(subScores), hasUnratedComponent };
		}
		return null;
	};
}

/**
 * Look up an attribute group by ID, verifying that it exists and is not
 * entirely exempt from the given EvaluationTree.
 */
export function getAttributeGroupById(
	id: string,
	tree: EvaluationTree,
): AttributeGroup<ValueSet> | null {
	const attrGroup = attributeTree[id] as AttributeGroup<ValueSet> | undefined;
	if (attrGroup === undefined) {
		return null;
	}
	if (
		!mapNonExemptAttributeGroupsInTree(
			tree,
			attrGroupInTree => attrGroup.id === attrGroupInTree.id,
		).some(val => val)
	) {
		return null;
	}
	return attrGroup;
}
