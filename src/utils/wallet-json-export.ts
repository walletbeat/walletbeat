import type { PrivacyEvaluations } from '@/schema/attribute-groups'
import { getAttributeFromTree } from '@/schema/attribute-groups'
import type {
	Attribute,
	EvaluatedAttribute,
	Value,
	WalletNameAndPseudonymStrings,
} from '@/schema/attributes'
import { Rating } from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import type { WalletStage } from '@/schema/stages'
import { getUrl } from '@/schema/url'
import { getVariants, hasSingleVariant, type Variant } from '@/schema/variants'
import { type RatedWallet, type ResolvedWallet, VariantSpecificity } from '@/schema/wallet'
import type { WalletType } from '@/schema/wallet-types'
import { renderTypographicContentToString } from '@/types/content'
import { nonEmptyEntries, nonEmptyValues, setItems } from '@/types/utils/non-empty'
import { getWalletEvalStrings, renderEvaluationContentOrFallback } from '@/utils/evaluation-content'
import { getWalletStageAndLadder } from '@/utils/stage'
import { walletBlurbText } from '@/utils/wallet-page-markdown'

const DETAILS_FALLBACK = 'See full details on the wallet page.'

type StageExportInput = WalletStage | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null

/**
 * Maps the wallet stage (from getWalletStageAndLadder) to the string used in JSON export.
 * Single source of truth for stage serialization.
 */
export function stageToExportString(stage: StageExportInput): string | null {
	if (stage === null) {
		return null
	}

	if (stage === 'NOT_APPLICABLE') {
		return 'NOT_APPLICABLE'
	}

	if (stage === 'QUALIFIED_FOR_NO_STAGES') {
		return 'QUALIFIED_FOR_NO_STAGES'
	}

	return stage.label
}

export interface ReferenceUrlJsonExport {
	label: string
	url: string
}

export interface ReferenceJsonExport {
	explanation?: string
	urls: ReferenceUrlJsonExport[]
}

/** Attribute-level metadata (same for every wallet). */
export interface AttributeJsonExport {
	attributeDisplayName: string
	attributeId: string
	/** Short question describing what the attribute evaluates (e.g. "Can you send and receive tokens without revealing your transaction history to others?") */
	shortQuestion: string
	/** "Why does this matter?" / "Why should I care?" section body */
	whyItMatters: string
	/** Section heading and body for "How is this attribute evaluated?" */
	howIsEvaluated: {
		heading: string
		methodology: string
	}
}

/** Wallet-specific evaluation result for an attribute. */
export interface RatingJsonExport {
	rating: string
	shortExplanation: string
	details: string
	impact?: string
	howToImprove?: string
	references?: ReferenceJsonExport[]
	perVariantRatings?: Partial<Record<Variant, string>>
}

export interface PrivacyAttributeJsonExport {
	attribute: AttributeJsonExport
	rating: RatingJsonExport
}

export interface RatedWalletJsonExport {
	overallPrivacy: {
		addressCorrelation: PrivacyAttributeJsonExport
		multiAddressCorrelation: PrivacyAttributeJsonExport
		privateTransfers: PrivacyAttributeJsonExport
		hardwarePrivacy: PrivacyAttributeJsonExport
		appIsolation: PrivacyAttributeJsonExport
	}
	types: WalletType[]
	variants: Variant[]
	walletId: string
	displayName: string
	description: string
	lastUpdated: string
	stage: string | null
	website?: string
	repository?: string
}

function serializeReferences(
	references: Parameters<typeof toFullyQualified>[0],
): ReferenceJsonExport[] {
	const qualified = toFullyQualified(references)

	if (qualified.length === 0) {
		return []
	}

	return qualified.map(ref => ({
		...(ref.explanation !== undefined && { explanation: ref.explanation }),
		urls: ref.urls.map(u => ({ label: u.label, url: u.url })),
	}))
}

function getHowIsEvaluatedHeading<V extends Value>(attribute: Attribute<V>): string {
	const { wording } = attribute

	if (wording.midSentenceName === null) {
		return wording.howIsEvaluated
	}

	return `How is ${wording.midSentenceName} evaluated?`
}

function perVariantRatingsForAttribute<V extends Value>(
	wallet: RatedWallet,
	attribute: Attribute<V>,
): Partial<Record<Variant, string>> | undefined {
	if (hasSingleVariant(wallet.variants)) {
		return undefined
	}

	const isVariantSpecific = nonEmptyValues<Variant, Map<string, VariantSpecificity>>(
		wallet.variantSpecificity,
	).some(specMap => {
		const spec = specMap.get(attribute.id)

		return (
			spec === VariantSpecificity.UNIQUE_TO_VARIANT || spec === VariantSpecificity.NOT_UNIVERSAL
		)
	})

	if (!isVariantSpecific) {
		return undefined
	}

	const perVariant: Partial<Record<Variant, string>> = {}

	for (const [variant, resolved] of nonEmptyEntries<Variant, ResolvedWallet>(wallet.variants)) {
		const variantEvalAttr = getAttributeFromTree(resolved.attributes, attribute)

		if (variantEvalAttr === null || variantEvalAttr.evaluation.value.rating === Rating.EXEMPT) {
			continue
		}

		perVariant[variant] = variantEvalAttr.evaluation.value.rating
	}

	return Object.keys(perVariant).length > 0 ? perVariant : undefined
}

function serializePrivacyAttribute<V extends Value>(
	evaluatedAttribute: EvaluatedAttribute<V>,
	wallet: RatedWallet,
	evalStrings: WalletNameAndPseudonymStrings,
): PrivacyAttributeJsonExport {
	const { attribute, evaluation } = evaluatedAttribute
	const ratingStr = evaluation.value.rating

	const attributeBlock: AttributeJsonExport = {
		attributeDisplayName: attribute.displayName,
		attributeId: attribute.id,
		shortQuestion: renderTypographicContentToString(attribute.question, evalStrings),
		whyItMatters: renderTypographicContentToString(attribute.why, evalStrings),
		howIsEvaluated: {
			heading: getHowIsEvaluatedHeading(attribute),
			methodology: renderTypographicContentToString(attribute.methodology, evalStrings),
		},
	}

	const ratingBlock: RatingJsonExport = {
		rating: ratingStr,
		shortExplanation: renderTypographicContentToString(
			evaluation.value.shortExplanation,
			evalStrings,
		),
		details: renderEvaluationContentOrFallback(evaluation.details, evalStrings, DETAILS_FALLBACK),
	}

	if (evaluation.impact !== undefined) {
		ratingBlock.impact = renderTypographicContentToString(evaluation.impact, evalStrings)
	}

	if (evaluation.howToImprove !== undefined) {
		ratingBlock.howToImprove = renderTypographicContentToString(
			evaluation.howToImprove,
			evalStrings,
		)
	}

	const refs = serializeReferences(evaluation.references)

	if (refs.length > 0) {
		ratingBlock.references = refs
	}

	const perVariant = perVariantRatingsForAttribute(wallet, attribute)

	if (perVariant !== undefined) {
		ratingBlock.perVariantRatings = perVariant
	}

	return {
		attribute: attributeBlock,
		rating: ratingBlock,
	}
}

export function ratedWalletJsonExport(wallet: RatedWallet): RatedWalletJsonExport {
	const privacy: PrivacyEvaluations = wallet.overall.privacy
	const { metadata } = wallet

	const evalStrings = getWalletEvalStrings(wallet)

	const { stage } = getWalletStageAndLadder(wallet)
	const stageExport = stageToExportString(stage)

	const website =
		metadata.urls?.websites?.[0] !== undefined ? getUrl(metadata.urls.websites[0]) : undefined
	const repository =
		metadata.urls?.repositories?.[0] !== undefined
			? getUrl(metadata.urls.repositories[0])
			: undefined

	return {
		walletId: wallet.metadata.id,
		types: setItems(wallet.types),
		variants: setItems(getVariants(wallet.variants)),
		displayName: metadata.displayName,
		description: walletBlurbText(wallet),
		lastUpdated: metadata.lastUpdated,
		stage: stageExport,
		...(website !== undefined && { website }),
		...(repository !== undefined && { repository }),
		overallPrivacy: {
			addressCorrelation: serializePrivacyAttribute(
				privacy.addressCorrelation,
				wallet,
				evalStrings,
			),
			multiAddressCorrelation: serializePrivacyAttribute(
				privacy.multiAddressCorrelation,
				wallet,
				evalStrings,
			),
			privateTransfers: serializePrivacyAttribute(privacy.privateTransfers, wallet, evalStrings),
			hardwarePrivacy: serializePrivacyAttribute(privacy.hardwarePrivacy, wallet, evalStrings),
			appIsolation: serializePrivacyAttribute(privacy.appIsolation, wallet, evalStrings),
		},
	}
}
