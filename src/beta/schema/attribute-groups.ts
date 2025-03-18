import {
  isNonEmptyArray,
  nonEmptyGet,
  type NonEmptyRecord,
  nonEmptyRemap,
  nonEmptyValues,
} from '@/beta/types/utils/non-empty';
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
} from './attributes';
import {
  addressCorrelation,
  type AddressCorrelationValue,
} from './attributes/privacy/address-correlation';
import { openSource, type OpenSourceValue } from './attributes/transparency/open-source';
import {
  sourceVisibility,
  type SourceVisibilityValue,
} from './attributes/transparency/source-visibility';
import type { ResolvedFeatures } from './features';
import type { AtLeastOneVariant, Variant } from './variants';
import type { Dict } from '@/beta/types/utils/dict';
import { funding, type FundingValue } from './attributes/transparency/funding';
import {
  multiAddressCorrelation,
  type MultiAddressCorrelationValue,
} from './attributes/privacy/multi-address-correlation';
import { type MaybeUnratedScore, type WeightedScore, weightedScore } from './score';
import { sentence } from '@/beta/types/content';
import type { WalletMetadata } from './wallet';
import {
  chainVerification,
  type ChainVerificationValue,
} from './attributes/security/chain-verification';
import {
  selfHostedNode,
  type SelfHostedNodeValue,
} from './attributes/self-sovereignty/self-hosted-node';
import {
  browserIntegration,
  type BrowserIntegrationValue,
} from './attributes/ecosystem/browser-integration';
import {
  addressResolution,
  type AddressResolutionValue,
} from './attributes/ecosystem/address-resolution';

/** A ValueSet for security Values. */
type SecurityValues = Dict<{
  chainVerification: ChainVerificationValue;
}>;

/** Security attributes. */
export const securityAttributeGroup: AttributeGroup<SecurityValues> = {
  id: 'security',
  icon: '\u{1f512}', // Lock
  displayName: 'Security',
  perWalletQuestion: sentence<WalletMetadata>(
    (walletMetadata: WalletMetadata): string => `How secure is ${walletMetadata.displayName}?`
  ),
  attributes: {
    chainVerification,
  },
  score: scoreGroup<SecurityValues>({
    chainVerification: 1.0,
  }),
};

/** A ValueSet for privacy Values. */
type PrivacyValues = Dict<{
  addressCorrelation: AddressCorrelationValue;
  multiAddressCorrelation: MultiAddressCorrelationValue;
}>;

/** Privacy attributes. */
export const privacyAttributeGroup: AttributeGroup<PrivacyValues> = {
  id: 'privacy',
  icon: '\u{1f575}', // Detective
  displayName: 'Privacy',
  perWalletQuestion: sentence<WalletMetadata>(
    (walletMetadata: WalletMetadata): string =>
      `How well does ${walletMetadata.displayName} protect your privacy?`
  ),
  attributes: {
    addressCorrelation,
    multiAddressCorrelation,
  },
  score: scoreGroup<PrivacyValues>({
    addressCorrelation: 1.0,
    multiAddressCorrelation: 1.0,
  }),
};

/** A ValueSet for self-sovereignty Values. */
type SelfSovereigntyValues = Dict<{
  selfHostedNode: SelfHostedNodeValue;
}>;

/** Self-sovereignty attributes. */
export const selfSovereigntyAttributeGroup: AttributeGroup<SelfSovereigntyValues> = {
  id: 'selfSovereignty',
  icon: '\u{1f3f0}', // Castle
  displayName: 'Self-sovereignty',
  perWalletQuestion: sentence<WalletMetadata>(
    (walletMetadata: WalletMetadata): string =>
      `How much control and ownership over your wallet does ${walletMetadata.displayName} give you?`
  ),
  attributes: {
    selfHostedNode,
  },
  score: scoreGroup<SelfSovereigntyValues>({
    selfHostedNode: 1.0,
  }),
};

/** A ValueSet for transparency Values. */
type TransparencyValues = Dict<{
  openSource: OpenSourceValue;
  sourceVisibility: SourceVisibilityValue;
  funding: FundingValue;
}>;

/** Transparency attributes. */
export const transparencyAttributeGroup: AttributeGroup<TransparencyValues> = {
  id: 'transparency',
  icon: '\u{1f50d}', // Looking glass
  displayName: 'Transparency',
  perWalletQuestion: sentence<WalletMetadata>(
    (walletMetadata: WalletMetadata): string =>
      `How transparent and sustainable is ${walletMetadata.displayName}'s development model?`
  ),
  attributes: {
    openSource,
    sourceVisibility,
    funding,
  },
  score: scoreGroup<TransparencyValues>({
    openSource: 1.0,
    sourceVisibility: 1.0,
    funding: 1.0,
  }),
};

/** A ValueSet for ecosystem Values. */
type EcosystemValues = Dict<{
  addressResolution: AddressResolutionValue;
  browserIntegration: BrowserIntegrationValue;
}>;

/** Ecosystem attributes. */
export const ecosystemAttributeGroup: AttributeGroup<EcosystemValues> = {
  id: 'ecosystem',
  icon: '\u{1f331}', // Seedling
  displayName: 'Ecosystem',
  perWalletQuestion: sentence<WalletMetadata>(
    (walletMetadata: WalletMetadata): string =>
      `Does ${walletMetadata.displayName} follow the Ethereum ecosystem's standards and direction?`
  ),
  attributes: {
    addressResolution,
    browserIntegration,
  },
  score: scoreGroup<EcosystemValues>({
    addressResolution: 1.0,
    browserIntegration: 1.0,
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
};

/** Evaluated security attributes for a single wallet. */
export interface SecurityEvaluations extends EvaluatedGroup<SecurityValues> {
  chainVerification: EvaluatedAttribute<ChainVerificationValue>;
}

/** Evaluated privacy attributes for a single wallet. */
export interface PrivacyEvaluations extends EvaluatedGroup<PrivacyValues> {
  addressCorrelation: EvaluatedAttribute<AddressCorrelationValue>;
  multiAddressCorrelation: EvaluatedAttribute<MultiAddressCorrelationValue>;
}

/** Evaluated self-sovereignty attributes for a single wallet. */
export interface SelfSovereigntyEvaluations extends EvaluatedGroup<SelfSovereigntyValues> {
  selfHostedNode: EvaluatedAttribute<SelfHostedNodeValue>;
}

/** Evaluated transparency attributes for a single wallet. */
export interface TransparencyEvaluations extends EvaluatedGroup<TransparencyValues> {
  openSource: EvaluatedAttribute<OpenSourceValue>;
  sourceVisibility: EvaluatedAttribute<SourceVisibilityValue>;
}

/** Evaluated ecosystem attributes for a single wallet. */
export interface EcosystemEvaluations extends EvaluatedGroup<EcosystemValues> {
  addressResolution: EvaluatedAttribute<AddressResolutionValue>;
  browserIntegration: EvaluatedAttribute<BrowserIntegrationValue>;
}

/** Evaluated attributes for a single wallet. */
export interface EvaluationTree
  extends NonEmptyRecord<
    string,
    EvaluatedGroup<
      SecurityValues | PrivacyValues | SelfSovereigntyValues | TransparencyValues | EcosystemValues
    >
  > {
  security: SecurityEvaluations;
  privacy: PrivacyEvaluations;
  selfSovereignty: SelfSovereigntyEvaluations;
  transparency: TransparencyEvaluations;
  ecosystem: EcosystemEvaluations;
}

/** Rate a wallet's attributes based on its features. */
export function evaluateAttributes(features: ResolvedFeatures): EvaluationTree {
  const evalAttr = <V extends Value>(attr: Attribute<V>): EvaluatedAttribute<V> => ({
    attribute: attr,
    evaluation: attr.evaluate(features),
  });
  return {
    security: {
      chainVerification: evalAttr(chainVerification),
    },
    privacy: {
      addressCorrelation: evalAttr(addressCorrelation),
      multiAddressCorrelation: evalAttr(multiAddressCorrelation),
    },
    selfSovereignty: {
      selfHostedNode: evalAttr(selfHostedNode),
    },
    transparency: {
      openSource: evalAttr(openSource),
      sourceVisibility: evalAttr(sourceVisibility),
      funding: evalAttr(funding),
    },
    ecosystem: {
      addressResolution: evalAttr(addressResolution),
      browserIntegration: evalAttr(browserIntegration),
    },
  };
}

/**
 * Aggregate per-variant evaluated attributes into
 * a single non-per-variant tree of evaluated attributes.
 */
export function aggregateAttributes(perVariant: AtLeastOneVariant<EvaluationTree>): EvaluationTree {
  const attr = <V extends Value>(
    getter: (tree: EvaluationTree) => EvaluatedAttribute<V>
  ): EvaluatedAttribute<V> => {
    const attribute = getter(
      nonEmptyGet(nonEmptyValues<Variant, EvaluationTree>(perVariant))
    ).attribute;
    const evaluations = nonEmptyRemap(
      perVariant,
      (_: Variant, tree: EvaluationTree) => getter(tree).evaluation
    );
    return {
      attribute,
      evaluation: attribute.aggregate(evaluations),
    };
  };
  return {
    security: {
      chainVerification: attr(tree => tree.security.chainVerification),
    },
    privacy: {
      addressCorrelation: attr(tree => tree.privacy.addressCorrelation),
      multiAddressCorrelation: attr(tree => tree.privacy.multiAddressCorrelation),
    },
    selfSovereignty: {
      selfHostedNode: attr(tree => tree.selfSovereignty.selfHostedNode),
    },
    transparency: {
      openSource: attr(tree => tree.transparency.openSource),
      sourceVisibility: attr(tree => tree.transparency.sourceVisibility),
      funding: attr(tree => tree.transparency.funding),
    },
    ecosystem: {
      addressResolution: attr(tree => tree.ecosystem.addressResolution),
      browserIntegration: attr(tree => tree.ecosystem.browserIntegration),
    },
  };
}

/**
 * Iterate over all attribute groups in a tree, calling `fn` with each group.
 */
export function mapAttributeGroups<T>(
  tree: EvaluationTree,
  fn: <Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>, evalGroup: EvaluatedGroup<Vs>) => T
): T[] {
  return Object.entries(attributeTree).map(([groupName, attrGroup]) =>
    fn(attrGroup, tree[groupName])
  );
}

/**
 * Iterate over all attributes in an attribute group, calling `fn` with each
 * attribute.
 */
export function mapGroupAttributes<T, Vs extends ValueSet>(
  evalGroup: EvaluatedGroup<Vs>,
  fn: <V extends Value>(evalAttr: EvaluatedAttribute<V>) => T
): T[] {
  return Object.values(evalGroup).map(fn);
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
    getter: (evalTree: EvaluationTree) => EvaluatedAttribute<V> | undefined
  ) => void
): void {
  for (const groupName of Object.keys(templateTree)) {
    for (const attrName of Object.keys(templateTree[groupName])) {
      fn(
        <V extends Value>(evalTree: EvaluationTree): EvaluatedAttribute<V> | undefined =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- We know that `evalTree[groupName]` has `attrName` as property, due to how we iterated to get here.
          (evalTree[groupName] as any)[attrName] as EvaluatedAttribute<V>
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
  otherTree: EvaluationTree
): EvaluatedAttribute<V> {
  const otherEvalAttr = mapAttributeGroups(
    otherTree,
    (_, evalGroup): EvaluatedAttribute<V> | undefined => {
      if (Object.hasOwn(evalGroup, evalAttr.attribute.id)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Evaluated attributes with the same ID have the same Value type.
        return evalGroup[evalAttr.attribute.id] as unknown as EvaluatedAttribute<V>;
      }
      return undefined;
    }
  ).find(v => v !== undefined);
  if (otherEvalAttr === undefined) {
    throw new Error(
      `Incomplete evaluation tree; did not found evaluation for attribute ${evalAttr.attribute.id}`
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
  evaluations: EvaluatedGroup<Vs>
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
      })
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
