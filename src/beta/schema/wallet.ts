import { resolveFeatures, type ResolvedFeatures, type WalletFeatures } from './features';
import { type AtLeastOneVariant, Variant } from './variants';
import {
  aggregateAttributes,
  evaluateAttributes,
  mapAttributesGetter,
  type EvaluationTree,
} from './attribute-groups';
import { type NonEmptyArray, nonEmptyEntries, nonEmptyRemap } from '@/beta/types/utils/non-empty';
import type { Paragraph, Renderable, RenderableTypography } from '@/beta/types/content';
import type { Url } from './url';
import { Rating, type Attribute, type EvaluatedAttribute, type Value } from './attributes';
import type { Dict } from '../types/utils/dict';
import type { CalendarDate } from '../types/date';

/** A contributor to walletbeat. */
export interface Contributor {
  name: string;
  url?: Url;
}

/** Basic wallet metadata. */
export interface WalletMetadata {
  /**
   * ID of the wallet.
   * It is expected that a wallet image exists at
   * `/public/images/wallets/${id}.${iconExtension}`.
   */
  id: string;

  /** Human-readable name of the wallet. */
  displayName: string;

  /** Extension of the wallet icon image at
   * `/public/images/wallets/${id}.${iconExtension}`.
   * Wallet icons should be cropped to touch all edges, then minimal margins
   * added to make the image aspect ratio be 1:1 (square).
   */
  iconExtension: 'png' | 'svg';

  /**
   * A short (two or three sentences) description about the wallet.
   * This is shown under the wallet's name in expanded view.
   */
  blurb: Paragraph;

  /**
   * If the wallet has a built-in username scheme, this should refer to
   * a human-friendly way to refer to this scheme.
   * For example, for Coinbase Wallet which offers "cb.id" usernames,
   * this should be "cb.id handle" or similar.
   */
  pseudonymType?: {
    singular: string;
    plural: string;
  };

  /** External link to the wallet's website. */
  url: Url;

  /** Link to the wallet's source code repository, if public. */
  repoUrl: Url | null;

  /** The last date the wallet information was updated. */
  lastUpdated: CalendarDate;

  /** List of people who contributed to the information for this wallet. */
  contributors: NonEmptyArray<Contributor>;
}

/** Per-wallet, per-attribute override. */
export interface AttributeOverride {
  /**
   * Contextual notes about why the wallet has this rating, or clarifications
   * about its rating.
   */
  note?: Renderable<{ wallet: RatedWallet }>;

  /**
   * What the wallet should do to improve its rating on this attribute.
   * Overrides the eponymous field in `Evaluation`.
   */
  howToImprove?: RenderableTypography<{ wallet: RatedWallet }>;
}

/** Per-wallet overrides for attributes. */
export interface WalletOverrides {
  attributes: Dict<{
    [attrGroup in keyof EvaluationTree]?: {
      [_ in keyof EvaluationTree[attrGroup]]?: AttributeOverride;
    };
  }>;
}

/**
 * The interface used to describe wallets.
 */
export interface Wallet {
  /** Wallet metadata (name, URL, icon, etc.) */
  metadata: WalletMetadata;

  /** Set of variants for which the wallet has an implementation. */
  variants: Record<Variant, boolean>;

  /** All wallet features. */
  features: WalletFeatures;

  /** Overrides for specific attributes. */
  overrides?: WalletOverrides;
}

export interface ResolvedWallet {
  /** Wallet metadata (name, URL, icon, etc.) */
  metadata: WalletMetadata;

  /** The variant for which all features were resolved to. */
  variant: Variant;

  /** All wallet features. */
  features: ResolvedFeatures;

  /** Attribute tree for the wallet variant. */
  attributes: EvaluationTree;
}

/** Whether a Value is specific to a variant within the same wallet. */
export enum VariantSpecificity {
  /**
   * The value for this attribute is not assessed for this variant.
   */
  EXEMPT_FOR_THIS_VARIANT = 'EXEMPT_FOR_THIS_VARIANT',

  /**
   * The value for this attribute is only assessed for this variant.
   * This can happen either because the wallet only has one variant,
   * or because the values for this attribute on all other variants
   * are EXEMPT.
   */
  ONLY_ASSESSED_FOR_THIS_VARIANT = 'ONLY_ASSESSED_FOR_THIS_VARIANT',

  /**
   * The value is not specific to a variant. All variants of the wallet have
   * the same value (or EXEMPT) for this attribute.
   */
  ALL_SAME = 'ALL_SAME',

  /**
   * The value is specific to this variant.
   * This implies that the wallet has other non-EXEMPT variants, and all such
   * other variants have a value different from the one for the current
   * variant.
   */
  UNIQUE_TO_VARIANT = 'UNIQUE_TO_VARIANT',

  /**
   * The value is shared with at least one other variant, but not all.
   * This implies that the wallet has other non-EXEMPT variants, and that at
   * least one of them shares the same value, and that at least another one
   * of them does not.
   */
  NOT_UNIVERSAL = 'NOT_UNIVERSAL',
}

/** A fully-rated wallet ready for display. */
export interface RatedWallet {
  /** Wallet metadata. */
  metadata: WalletMetadata;

  /** Per-variant evaluation. */
  variants: AtLeastOneVariant<ResolvedWallet>;

  /** For each variant, map attribute IDs to whether they are variant-specific. */
  variantSpecificity: AtLeastOneVariant<Map<string, VariantSpecificity>>;

  /** Aggregate evaluation across all variants. */
  overall: EvaluationTree;

  /** Overrides for specific attributes. */
  overrides: WalletOverrides;
}

function resolveVariant(wallet: Wallet, variant: Variant): ResolvedWallet | null {
  if (!wallet.variants[variant]) {
    return null;
  }
  const resolvedFeatures = resolveFeatures(wallet.features, variant);
  return {
    metadata: wallet.metadata,
    variant,
    features: resolvedFeatures,
    attributes: evaluateAttributes(resolvedFeatures),
  };
}

export function rateWallet(wallet: Wallet): RatedWallet {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because each feature must already have at least one variant populated.
  const perVariantWallets: AtLeastOneVariant<ResolvedWallet> = Object.fromEntries(
    Object.entries({
      browser: resolveVariant(wallet, Variant.BROWSER),
      mobile: resolveVariant(wallet, Variant.MOBILE),
      desktop: resolveVariant(wallet, Variant.DESKTOP),
    }).filter(([_, val]) => val !== null)
  ) as AtLeastOneVariant<ResolvedWallet>;
  const perVariantTree: AtLeastOneVariant<EvaluationTree> = nonEmptyRemap(
    perVariantWallets,
    (_: Variant, wallet: ResolvedWallet) => wallet.attributes
  );
  const hasMultipleVariants = Object.values(perVariantTree).length > 1;
  const variantSpecificity = nonEmptyRemap(
    perVariantTree,
    (variant: Variant, evalTree: EvaluationTree): Map<string, VariantSpecificity> => {
      const variantSpecificityMap = new Map<string, VariantSpecificity>();
      mapAttributesGetter(
        evalTree,
        <V extends Value>(getter: (tree: EvaluationTree) => EvaluatedAttribute<V> | undefined) => {
          const currentVariantEval = getter(evalTree);
          if (currentVariantEval === undefined) {
            return;
          }
          if (currentVariantEval.evaluation.value.rating === Rating.EXEMPT) {
            variantSpecificityMap.set(
              currentVariantEval.attribute.id,
              VariantSpecificity.EXEMPT_FOR_THIS_VARIANT
            );
            return;
          }
          if (!hasMultipleVariants) {
            variantSpecificityMap.set(
              currentVariantEval.attribute.id,
              VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT
            );
            return;
          }
          const currentVariantEvalId = currentVariantEval.evaluation.value.id;
          let allOthersExempt = true;
          let foundDifferentValue = false;
          let foundSameValue = false;
          for (const [versusVariant, versusTree] of nonEmptyEntries<Variant, EvaluationTree>(
            perVariantTree
          )) {
            if (versusVariant === variant) {
              continue;
            }
            const versusEval = getter(versusTree);
            if (versusEval === undefined) {
              continue;
            }
            if (versusEval.evaluation.value.rating === Rating.EXEMPT) {
              continue;
            }
            allOthersExempt = false;
            if (versusEval.evaluation.value.id === currentVariantEvalId) {
              foundSameValue = true;
            } else {
              foundDifferentValue = true;
            }
          }
          if (allOthersExempt) {
            variantSpecificityMap.set(
              currentVariantEval.attribute.id,
              VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT
            );
          } else if (foundDifferentValue && foundSameValue) {
            variantSpecificityMap.set(
              currentVariantEval.attribute.id,
              VariantSpecificity.NOT_UNIVERSAL
            );
          } else if (foundDifferentValue && !foundSameValue) {
            variantSpecificityMap.set(
              currentVariantEval.attribute.id,
              VariantSpecificity.UNIQUE_TO_VARIANT
            );
          } else if (!foundDifferentValue && foundSameValue) {
            variantSpecificityMap.set(currentVariantEval.attribute.id, VariantSpecificity.ALL_SAME);
          } else {
            throw new Error('Logic error in rateWallet variant specificity computation');
          }
        }
      );
      return variantSpecificityMap;
    }
  );
  return {
    metadata: wallet.metadata,
    variants: perVariantWallets,
    variantSpecificity,
    overall: aggregateAttributes(perVariantTree),
    overrides: wallet.overrides ?? { attributes: {} },
  };
}

/**
 * Returns how specific an attribute's evaluation is within a wallet.
 *
 * For example, for a wallet that is licensed as MIT license for its desktop
 * and web version, but proprietary for its mobile version, this function will
 * return VariantSpecific.VARIANT_SPECIFIC for the mobile variant only.
 *
 * @param ratedWallet The wallet from which the evaluation is taken.
 * @param variant The variant for which the attribute evaluation may be unique.
 * @param attribute The attribute for which the evaluation may be unique.
 * @returns Whether the evaluation of the given attribute is unique to the
 *          given variant within the given wallet.
 */
export function attributeVariantSpecificity<V extends Value>(
  ratedWallet: RatedWallet,
  variant: Variant,
  attribute: Attribute<V>
): VariantSpecificity {
  const variantSpecificityMap = ratedWallet.variantSpecificity[variant];
  if (variantSpecificityMap === undefined) {
    throw new Error(`Wallet ${ratedWallet.metadata.id} does not have variant ${variant}`);
  }
  const specificity = variantSpecificityMap.get(attribute.id);
  if (specificity === undefined) {
    throw new Error(`Invalid attribute ID: ${attribute.id}`);
  }
  return specificity;
}

/**
 * Get the override for an attribute in a given wallet.
 */
export function getAttributeOverride(
  ratedWallet: RatedWallet,
  attrGroup: string,
  attrId: string
): AttributeOverride | null {
  if (!Object.hasOwn(ratedWallet.overall, attrGroup)) {
    throw new Error(`Invalid attribute group name: ${attrGroup}`);
  }
  if (!Object.hasOwn(ratedWallet.overall[attrGroup], attrId)) {
    throw new Error(`Invalid attribute name ${attrId} in attribute group ${attrGroup}`);
  }
  if (!Object.hasOwn(ratedWallet.overrides.attributes, attrGroup)) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-member-access -- Safe because we just checked the property exists.
  const attributeGroup = (ratedWallet.overrides.attributes as any)[attrGroup] as
    | Record<string, AttributeOverride | undefined> // Safe because all attribute group overrides are structured this way.
    | undefined;
  if (attributeGroup === undefined || !Object.hasOwn(attributeGroup, attrId)) {
    return null;
  }
  const override = attributeGroup[attrId];
  return override ?? null;
}
