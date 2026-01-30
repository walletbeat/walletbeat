import type { MarkdownParagraph, Paragraph, TypographicContent } from '@/types/content'
import type { CalendarDate } from '@/types/date'
import { prefixError } from '@/types/errors'
import type { Dict } from '@/types/utils/dict'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyEntries,
	nonEmptyRemap,
	type NonEmptySet,
	setItems,
	setUnion,
} from '@/types/utils/non-empty'

import {
	aggregateAttributes,
	evaluateAttributes,
	type EvaluationTree,
	mapAttributesGetter,
} from './attribute-groups'
import {
	type Attribute,
	type EvaluatedAttribute,
	Rating,
	type Value,
	type WalletNameAndPseudonymStrings,
	type WalletNameStrings,
} from './attributes'
import type { WalletDeveloper } from './entity'
import {
	type ResolvedFeatures,
	resolveFeatures,
	type WalletBaseFeatures,
	type WalletEmbeddedFeatures,
	type WalletHardwareFeatures,
	type WalletSoftwareFeatures,
} from './features'
import { type AccountType, supportedAccountTypes } from './features/account-support'
import type { HardwareWalletManufactureType, HardwareWalletModel } from './features/profile'
import { ladders, type WalletLadderType } from './ladders'
import {
	evaluateWalletOnLadder,
	type StageEvaluatableWallet,
	type WalletLadderEvaluation,
} from './stages'
import type { DomainUrl, LabeledUrl, Url } from './url'
import {
	type AtLeastOneTrueVariant,
	type AtLeastOneVariant,
	getVariants,
	hasVariant,
	Variant,
} from './variants'
import { type WalletType, walletTypes } from './wallet-types'

/** A contributor to walletbeat. */
export interface Contributor {
	name: string
	url?: Url

	/** The contributor's affiliation with wallet development organizations. */
	affiliation:
		| Array<{
				/**
				 * The wallet development organization that the contributor works for.
				 */
				developer: WalletDeveloper

				/**
				 * Role at the organization that the contributor works for.
				 */
				role: 'EMPLOYEE' | 'FOUNDER' | 'CONSULTANT'

				/**
				 * Whether the contributor has non-zero equity ownership of the company.
				 */
				hasEquity: boolean
		  }>
		| 'NO_AFFILIATION'
}

/** Basic wallet metadata. */
export interface WalletMetadata {
	/**
	 * ID of the wallet.
	 * It is expected that a wallet image exists at
	 * `/public/images/wallets/${id}.${iconExtension}`.
	 */
	id: string

	/**
	 * Human-readable name of the wallet, when written in a sentence.
	 * For example, `Users of ${displayName} are happy with their experience`
	 * should make sense.
	 */
	displayName: string

	/**
	 * Human-readable name of the wallet, when written standalone in the
	 * comparison table.
	 */
	tableName: string

	/** Extension of the wallet icon image at
	 * `/public/images/wallets/${id}.${iconExtension}`.
	 * Wallet icons should be cropped to touch all edges, then minimal margins
	 * added to make the image aspect ratio be 1:1 (square).
	 */
	iconExtension: 'png' | 'svg'

	/**
	 * A short (two or three sentences) description about the wallet.
	 * This is shown under the wallet's name in expanded view.
	 */
	blurb: Paragraph<WalletNameStrings>

	/**
	 * If the wallet has a built-in username scheme, this should refer to
	 * a human-friendly way to refer to this scheme.
	 * For example, for Coinbase Wallet which offers "cb.id" usernames,
	 * this should be "cb.id handle" or similar.
	 */
	pseudonymType?: {
		singular: string
		plural: string
	}

	/** URLs associated with the wallet, organized by category. */
	urls?: WalletUrls

	/** The last date the wallet information was updated. */
	lastUpdated: CalendarDate

	/** List of people who contributed to the information for this wallet. */
	contributors: NonEmptyArray<Contributor>

	/**
	 * For hardware wallets, indicates whether it's factory-made or DIY
	 */
	hardwareWalletManufactureType?: HardwareWalletManufactureType

	/**
	 * For hardware wallets, list of available models/devices
	 */
	hardwareWalletModels?: HardwareWalletModel[]
}

export interface WalletUrls {
	/** Website URL(s) for the wallet. At least one is required. */
	websites: NonEmptyArray<Url>
	/** Documentation URL(s), if available. */
	docs?: Url[]
	/** Repository URL(s) for source code, if public. */
	repositories?: Url[]
	/** Extension URLs associated with the wallet, if available. */
	extensions?: Url[]
	/** Web App URLs, if available. */
	webapps?: Url[]
	/** Play Store URL, if available. */
	playstore?: Url
	/** App Store URL, if available. */
	appstore?: Url
	/** Social media URLs associated with the wallet, if available. */

	socials?: SocialUrls

	/** Other relevant URL(s), if any. */
	others?: LabeledUrl[]
}
export interface SocialUrls extends Record<string, Url | undefined> {
	/** X (formerly Twitter) URL, if available. */
	x?: DomainUrl<'x.com'>
	/** LinkedIn URL, if available. */
	linkedin?: DomainUrl<'linkedin.com'>
	/** Farcaster URL, if available. */
	farcaster?: DomainUrl<'warpcast.com' | 'farcaster.xyz'>
	/** Discord URL, if available. */
	discord?: DomainUrl<'discord.com' | 'discord.gg'>
	/** Telegram URL, if available. */
	telegram?: DomainUrl<'t.me' | 'telegram.org' | 'telegram.me'>
	/** Youtube URL, if available. */
	youtube?: DomainUrl<'youtube.com'>
	/** Reddit URL, if available. */
	reddit?: DomainUrl<'reddit.com' | 'www.reddit.com'>
	/** Instagram URL, if available. */
	instagram?: DomainUrl<'instagram.com' | 'www.instagram.com'>
	/** TikTok URL, if available. */
	tiktok?: DomainUrl<'tiktok.com' | 'www.tiktok.com'>
	/** Facebook URL, if available. */
	facebook?: DomainUrl<'facebook.com' | 'www.facebook.com' | 'web.facebook.com'>
}
/** Per-wallet, per-attribute override. */
export interface AttributeOverride {
	/**
	 * Contextual notes about why the wallet has this rating, or clarifications
	 * about its rating.
	 */
	note?: MarkdownParagraph<WalletNameStrings>

	/**
	 * What the wallet should do to improve its rating on this attribute.
	 * Overrides the eponymous field in `Evaluation`.
	 */
	howToImprove?: TypographicContent<WalletNameAndPseudonymStrings>
}

/** Per-wallet overrides for attributes. */
export interface WalletOverrides {
	attributes: Dict<{
		[attrGroup in keyof EvaluationTree]?: {
			[_ in keyof EvaluationTree[attrGroup]]?: AttributeOverride
		}
	}>
}

/**
 * The interface used to describe wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export interface BaseWallet {
	/** Wallet metadata (name, URL, icon, etc.) */
	metadata: WalletMetadata

	/** Set of variants for which the wallet has an implementation. */
	variants: AtLeastOneTrueVariant

	/** All wallet features. */
	features: WalletBaseFeatures

	/** Overrides for specific attributes. */
	overrides?: WalletOverrides
}

/**
 * The interface used to describe software wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export type SoftwareWallet = BaseWallet & {
	features: WalletSoftwareFeatures
	variants:
		| {
				[Variant.BROWSER]: true
		  }
		| {
				[Variant.DESKTOP]: true
		  }
		| {
				[Variant.MOBILE]: true
		  }
}

/**
 * The interface used to describe hardware wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export type HardwareWallet = BaseWallet & {
	features: WalletHardwareFeatures
	variants: {
		[Variant.HARDWARE]: true
	}
}

/**
 * The interface used to describe embedded wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export type EmbeddedWallet = BaseWallet & {
	features: WalletEmbeddedFeatures
	variants: {
		[Variant.EMBEDDED]: true
	}
}

export interface ResolvedWallet {
	/** Wallet metadata (name, URL, icon, etc.) */
	metadata: WalletMetadata

	/** The variant for which all features were resolved to. */
	variant: Variant

	/** All wallet features. */
	features: ResolvedFeatures

	/** Attribute tree for the wallet variant. */
	attributes: EvaluationTree
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
	metadata: WalletMetadata

	/** The types of the wallet. */
	types: NonEmptySet<WalletType>

	/** Per-variant evaluation. */
	variants: AtLeastOneVariant<ResolvedWallet>

	/** For each variant, map attribute IDs to whether they are variant-specific. */
	variantSpecificity: AtLeastOneVariant<Map<string, VariantSpecificity>>

	/** Aggregate evaluation across all variants. */
	overall: EvaluationTree

	/**
	 * Stage rating on wallet ladders.
	 *
	 * Given that a single wallet may be of multiple `WalletType`s, a single
	 * wallet may consequently qualify on more than one ladder.
	 * When displayed on the interface, it is expected that the interface code
	 * will select the evaluation on the ladder(s) that makes sense to display.
	 */
	ladders: Record<WalletLadderType, WalletLadderEvaluation>

	/** Overrides for specific attributes. */
	overrides: WalletOverrides
}

function resolveVariant(wallet: BaseWallet, variant: Variant): ResolvedWallet | null {
	if (!wallet.variants[variant]) {
		return null
	}

	try {
		const resolvedFeatures = resolveFeatures(wallet.features, wallet.variants, variant)

		return {
			metadata: wallet.metadata,
			variant,
			features: resolvedFeatures,
			attributes: evaluateAttributes(resolvedFeatures, wallet.metadata),
		}
	} catch (e) {
		throw prefixError(`Wallet ${wallet.metadata.id}`, e)
	}
}

export function rateWallet(wallet: BaseWallet): RatedWallet {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because each feature must already have at least one variant populated.
	const perVariantWallets: AtLeastOneVariant<ResolvedWallet> = Object.fromEntries(
		Object.entries({
			embedded: resolveVariant(wallet, Variant.EMBEDDED),
			desktop: resolveVariant(wallet, Variant.DESKTOP),
			browser: resolveVariant(wallet, Variant.BROWSER),
			mobile: resolveVariant(wallet, Variant.MOBILE),
			hardware: resolveVariant(wallet, Variant.HARDWARE),
		}).filter(([_, val]) => val !== null),
	) as AtLeastOneVariant<ResolvedWallet>
	const perVariantTree: AtLeastOneVariant<EvaluationTree> = nonEmptyRemap(
		perVariantWallets,
		(_: Variant, wallet: ResolvedWallet) => wallet.attributes,
	)
	const hasMultipleVariants = Object.values(perVariantTree).length > 1
	const variantSpecificity = nonEmptyRemap(
		perVariantTree,
		(variant: Variant, evalTree: EvaluationTree): Map<string, VariantSpecificity> => {
			const variantSpecificityMap = new Map<string, VariantSpecificity>()

			mapAttributesGetter(
				evalTree,
				<V extends Value>(getter: (tree: EvaluationTree) => EvaluatedAttribute<V> | undefined) => {
					const currentVariantEval = getter(evalTree)

					if (currentVariantEval === undefined) {
						return
					}

					if (currentVariantEval.evaluation.value.rating === Rating.EXEMPT) {
						variantSpecificityMap.set(
							currentVariantEval.attribute.id,
							VariantSpecificity.EXEMPT_FOR_THIS_VARIANT,
						)

						return
					}

					if (!hasMultipleVariants) {
						variantSpecificityMap.set(
							currentVariantEval.attribute.id,
							VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT,
						)

						return
					}

					const currentVariantEvalId = currentVariantEval.evaluation.value.id
					let allOthersExempt = true
					let foundDifferentValue = false
					let foundSameValue = false

					for (const [versusVariant, versusTree] of nonEmptyEntries<Variant, EvaluationTree>(
						perVariantTree,
					)) {
						if (versusVariant === variant) {
							continue
						}

						const versusEval = getter(versusTree)

						if (versusEval === undefined) {
							continue
						}

						if (versusEval.evaluation.value.rating === Rating.EXEMPT) {
							continue
						}

						allOthersExempt = false

						if (versusEval.evaluation.value.id === currentVariantEvalId) {
							foundSameValue = true
						} else {
							foundDifferentValue = true
						}
					}

					if (allOthersExempt) {
						variantSpecificityMap.set(
							currentVariantEval.attribute.id,
							VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT,
						)
					} else if (foundDifferentValue && foundSameValue) {
						variantSpecificityMap.set(
							currentVariantEval.attribute.id,
							VariantSpecificity.NOT_UNIVERSAL,
						)
					} else if (foundDifferentValue && !foundSameValue) {
						variantSpecificityMap.set(
							currentVariantEval.attribute.id,
							VariantSpecificity.UNIQUE_TO_VARIANT,
						)
					} else if (!foundDifferentValue && foundSameValue) {
						variantSpecificityMap.set(currentVariantEval.attribute.id, VariantSpecificity.ALL_SAME)
					} else {
						throw new Error('Logic error in rateWallet variant specificity computation')
					}
				},
			)

			return variantSpecificityMap
		},
	)

	const stageEvaluatable: StageEvaluatableWallet = {
		types: walletTypes(wallet),
		variants: perVariantWallets,
		variantSpecificity,
		overall: aggregateAttributes(perVariantTree),
		overrides: wallet.overrides ?? { attributes: {} },
	}

	return {
		metadata: wallet.metadata,
		...stageEvaluatable,
		ladders: nonEmptyRemap(ladders, (_, ladder) =>
			evaluateWalletOnLadder(stageEvaluatable, ladder),
		),
	}
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
	attribute: Attribute<V>,
): VariantSpecificity {
	const variantSpecificityMap = ratedWallet.variantSpecificity[variant]

	if (variantSpecificityMap === undefined) {
		throw new Error(`Wallet ${ratedWallet.metadata.id} does not have variant ${variant}`)
	}

	const specificity = variantSpecificityMap.get(attribute.id)

	if (specificity === undefined) {
		throw new Error(`Invalid attribute ID: ${attribute.id}`)
	}

	return specificity
}

/**
 * Get the override for an attribute in a given wallet.
 */
export function getAttributeOverride(
	ratedWallet: RatedWallet,
	attrGroup: string,
	attrId: string,
): AttributeOverride | null {
	if (!Object.hasOwn(ratedWallet.overall, attrGroup)) {
		throw new Error(`Invalid attribute group name: ${attrGroup}`)
	}

	if (!Object.hasOwn(ratedWallet.overall[attrGroup], attrId)) {
		throw new Error(`Invalid attribute name ${attrId} in attribute group ${attrGroup}`)
	}

	if (!Object.hasOwn(ratedWallet.overrides.attributes, attrGroup)) {
		return null
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-member-access -- Safe because we just checked the property exists.
	const attributeGroup = (ratedWallet.overrides.attributes as any)[attrGroup] as
		| Record<string, AttributeOverride | undefined> // Safe because all attribute group overrides are structured this way.
		| undefined

	if (attributeGroup === undefined || !Object.hasOwn(attributeGroup, attrId)) {
		return null
	}

	const override = attributeGroup[attrId]

	return override ?? null
}

export function getVariantResolvedWallet(
	wallet: RatedWallet,
	variant: Variant,
): ResolvedWallet | null {
	if (!hasVariant(wallet.variants, variant) || wallet.variants[variant] === undefined) {
		return null
	}

	return wallet.variants[variant]
}

/**
 * Returns the set of account types supported by the wallet, or null if any information is unknown.
 *
 * @param wallet The rated wallet.
 * @param variant The variant to query for, or "ALL_VARIANTS" to get the union of all account types across all variants.
 */
export function walletSupportedAccountTypes(
	wallet: RatedWallet,
	variant: Variant | 'ALL_VARIANTS',
): NonEmptySet<AccountType> | null {
	if (variant === 'ALL_VARIANTS') {
		const accountTypeSets: Array<NonEmptySet<AccountType>> = []

		for (const variant of setItems(getVariants(wallet.variants))) {
			const supportedByVariant = walletSupportedAccountTypes(wallet, variant)

			if (supportedByVariant === null) {
				return null
			}

			accountTypeSets.push(supportedByVariant)
		}

		if (!isNonEmptyArray(accountTypeSets)) {
			return null
		}

		return setUnion(accountTypeSets)
	}

	const resolvedWallet = getVariantResolvedWallet(wallet, variant)

	if (resolvedWallet === null) {
		return null
	}

	if (resolvedWallet.features.accountSupport === null) {
		return null
	}

	return supportedAccountTypes(resolvedWallet.features.accountSupport)
}
