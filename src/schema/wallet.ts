import type { MarkdownParagraph, Paragraph, TypographicContent } from '@/types/content'
import type { CalendarDate } from '@/types/date'
import { getErrorMessage, prefixError } from '@/types/errors'
import type { Dict } from '@/types/utils/dict'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyRemap,
	type NonEmptySet,
	setItems,
	setUnion,
} from '@/types/utils/non-empty'

import {
	aggregateAttributes,
	type AttributeTree,
	evaluateAttributes,
	type EvaluationTree,
	mapAttributesGetter,
} from './attribute-groups'
import {
	type Attribute,
	type OutcomeMetadata,
	Rating,
	type WalletNameAndPseudonymStrings,
	type WalletNameStrings,
} from './attributes'
import type { WalletDeveloper } from './entity'
import { type ResolvedFeatures, resolveFeatures, type WalletBaseFeatures } from './features'
import { type AccountType, supportedAccountTypes } from './features/account-support'
import type { HardwareWalletManufactureType, HardwareWalletModel } from './features/profile'
import type { Ladders, WalletLadderType } from './ladders'
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
	variantEnum,
} from './variants'
import { type WalletType, walletTypesOf } from './wallet-types'

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
export interface WalletOverrides<_AttributeGroupId extends string> {
	attributes: Dict<{
		[attrGroup in keyof EvaluationTree<_AttributeGroupId>]?: {
			[_ in keyof EvaluationTree<_AttributeGroupId>[attrGroup]]?: AttributeOverride
		}
	}>
}

/**
 * The interface used to describe wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export interface BaseWallet<_AttributeGroupId extends string> {
	/** Wallet metadata (name, URL, icon, etc.) */
	metadata: WalletMetadata

	/** Set of variants for which the wallet has an implementation. */
	variants: AtLeastOneTrueVariant

	/** All wallet features. */
	features: WalletBaseFeatures

	/** Overrides for specific attributes. */
	overrides?: WalletOverrides<_AttributeGroupId>
}

export interface ResolvedWallet<_AttributeGroupId extends string> {
	/** Wallet metadata (name, URL, icon, etc.) */
	metadata: WalletMetadata

	/** The variant for which all features were resolved to. */
	variant: Variant

	/** All wallet features. */
	features: ResolvedFeatures

	/** Attribute tree for the wallet variant. */
	attributes: EvaluationTree<_AttributeGroupId>
}

/** Whether an outcome is specific to a variant within the same wallet. */
export enum VariantSpecificity {
	/**
	 * The outcome for this attribute is not assessed for this variant.
	 */
	EXEMPT_FOR_THIS_VARIANT = 'EXEMPT_FOR_THIS_VARIANT',

	/**
	 * The outcome for this attribute is only assessed for this variant.
	 * This can happen either because the wallet only has one variant,
	 * or because the outcomes for this attribute on all other variants
	 * are EXEMPT.
	 */
	ONLY_ASSESSED_FOR_THIS_VARIANT = 'ONLY_ASSESSED_FOR_THIS_VARIANT',

	/**
	 * The outcome is not specific to a variant. All variants of the wallet have
	 * the same outcome (or EXEMPT) for this attribute.
	 */
	ALL_SAME = 'ALL_SAME',

	/**
	 * The outcome is specific to this variant.
	 * This implies that the wallet has other non-EXEMPT variants, and all such
	 * other variants have an outcome different from the one for the current
	 * variant.
	 */
	UNIQUE_TO_VARIANT = 'UNIQUE_TO_VARIANT',

	/**
	 * The outcome is shared with at least one other variant, but not all.
	 * This implies that the wallet has other non-EXEMPT variants, and that at
	 * least one of them shares the same outcome, and that at least another one
	 * of them does not.
	 */
	NOT_UNIVERSAL = 'NOT_UNIVERSAL',
}

/** A fully-rated wallet ready for display. */
export interface RatedWallet<_AttributeGroupId extends string> {
	/** Wallet metadata. */
	metadata: WalletMetadata

	/** The types of the wallet. */
	types: NonEmptySet<WalletType>

	/** Per-variant evaluation. */
	variants: AtLeastOneVariant<ResolvedWallet<_AttributeGroupId>>

	/** For each variant, map attribute IDs to whether they are variant-specific. */
	variantSpecificity: AtLeastOneVariant<Map<string, VariantSpecificity>>

	/** Aggregate evaluation across all variants. */
	overall: EvaluationTree<_AttributeGroupId>

	/**
	 * Stage rating on wallet ladders.
	 *
	 * Given that a single wallet may be of multiple `WalletType`s, a single
	 * wallet may consequently qualify on more than one ladder.
	 * When displayed on the interface, it is expected that the interface code
	 * will select the evaluation on the ladder(s) that makes sense to display.
	 */
	ladders: Record<WalletLadderType, WalletLadderEvaluation<_AttributeGroupId>>

	/** Overrides for specific attributes. */
	overrides?: WalletOverrides<_AttributeGroupId>
}

function resolveVariant<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	wallet: BaseWallet<_AttributeGroupId>,
	variant: Variant,
): ResolvedWallet<_AttributeGroupId> | null {
	if (!wallet.variants[variant]) {
		return null
	}

	try {
		const resolvedFeatures = resolveFeatures(wallet.features, wallet.variants, variant)

		return {
			metadata: wallet.metadata,
			variant,
			features: resolvedFeatures,
			attributes: evaluateAttributes(attributeTree, resolvedFeatures, wallet.metadata),
		}
	} catch (e) {
		throw prefixError(`Wallet ${wallet.metadata.id}`, e)
	}
}

export function rateWallet<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	walletLadders: Ladders<_AttributeGroupId>,
	wallet: BaseWallet<_AttributeGroupId>,
): RatedWallet<_AttributeGroupId> {
	const perVariantWallets = Object.fromEntries(
		variantEnum.items
			.map(variant => [variant, resolveVariant(attributeTree, wallet, variant)] as const)
			.filter(
				(entry): entry is [(typeof entry)[0], NonNullable<(typeof entry)[1]>] => entry[1] !== null,
			),
	)
	const perVariantTree = Object.fromEntries(
		Object.entries(perVariantWallets).map(([variant, wallet]) => [variant, wallet.attributes]),
	)
	const hasMultipleVariants = Object.values(perVariantTree).length > 1
	const variantSpecificity = nonEmptyRemap(perVariantTree, (variant, evalTree) => {
		const variantSpecificityMap = new Map<string, VariantSpecificity>()

		mapAttributesGetter(evalTree, getter => {
			const currentVariantEval = getter(evalTree)

			if (currentVariantEval === undefined) {
				return
			}

			if (currentVariantEval.evaluation.outcome.rating === Rating.EXEMPT) {
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

			const currentVariantEvalId = currentVariantEval.evaluation.outcome.id
			let allOthersExempt = true
			let foundDifferentValue = false
			let foundSameValue = false

			for (const [versusVariant, versusEvalTree] of Object.entries(perVariantTree)) {
				if (versusVariant === variant) {
					continue
				}

				const versusEval = getter(versusEvalTree)

				if (versusEval === undefined) {
					continue
				}

				if (versusEval.evaluation.outcome.rating === Rating.EXEMPT) {
					continue
				}

				allOthersExempt = false

				if (versusEval.evaluation.outcome.id === currentVariantEvalId) {
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
				variantSpecificityMap.set(currentVariantEval.attribute.id, VariantSpecificity.NOT_UNIVERSAL)
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
		})

		return variantSpecificityMap
	})

	const stageEvaluatable: StageEvaluatableWallet<_AttributeGroupId> = {
		types: walletTypesOf(wallet),
		variants: perVariantWallets,
		variantSpecificity,
		overall: aggregateAttributes(attributeTree, perVariantTree),
		overrides: wallet.overrides,
	}

	return {
		metadata: wallet.metadata,
		...stageEvaluatable,
		ladders: nonEmptyRemap(walletLadders, (_, ladder) => {
			try {
				return evaluateWalletOnLadder(stageEvaluatable, ladder)
			} catch (e) {
				throw new Error(`Wallet ${wallet.metadata.id}: ${getErrorMessage(e)}`)
			}
		}),
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
export function attributeVariantSpecificity<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	ratedWallet: RatedWallet<_AttributeGroupId>,
	variant: Variant,
	attribute: Attribute<_OutcomeMetadata>,
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
 * Whether `attributeGroupId` is a key present on the wallet's overall evaluation tree.
 */
export function isRatedEvaluationTreeGroup<_AttributeGroupId extends string>(
	attributeGroupId: string,
	overall: EvaluationTree<_AttributeGroupId>,
): attributeGroupId is _AttributeGroupId {
	return Object.hasOwn(overall, attributeGroupId)
}

/**
 * Get the override for an attribute in a given wallet.
 */
export function getAttributeOverride<_AttributeGroupId extends string>(
	ratedWallet: RatedWallet<_AttributeGroupId>,
	attrGroup: _AttributeGroupId,
	attrId: string,
): AttributeOverride | null {
	if (!Object.hasOwn(ratedWallet.overall, attrGroup)) {
		throw new Error(`Invalid attribute group name: ${attrGroup}`)
	}

	if (!Object.hasOwn(ratedWallet.overall[attrGroup], attrId)) {
		throw new Error(`Invalid attribute name ${attrId} in attribute group ${attrGroup}`)
	}

	if (!ratedWallet.overrides || !Object.hasOwn(ratedWallet.overrides.attributes, attrGroup)) {
		return null
	}

	const attributeGroup = ratedWallet.overrides.attributes[attrGroup]

	if (attributeGroup === undefined) {
		return null
	}

	for (const [overrideAttrId, override] of Object.entries(attributeGroup)) {
		if (overrideAttrId === attrId) {
			return override ?? null
		}
	}

	return null
}

export function getVariantResolvedWallet<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
	variant: Variant,
): ResolvedWallet<_AttributeGroupId> | null {
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
export function walletSupportedAccountTypes<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
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
