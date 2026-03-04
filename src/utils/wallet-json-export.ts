import {
	type EvaluationTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import type {
	Attribute,
	AttributeGroup,
	EvaluatedAttribute,
	EvaluatedGroup,
	Value,
	ValueSet,
	WalletNameAndPseudonymStrings,
} from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import type { WalletStage } from '@/schema/stages'
import { getUrl } from '@/schema/url'
import { getVariants, type Variant } from '@/schema/variants'
import { type RatedWallet } from '@/schema/wallet'
import type { WalletType } from '@/schema/wallet-types'
import { renderTypographicContentToString } from '@/types/content'
import { setItems } from '@/types/utils/non-empty'
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
}

/** Single attribute export: attribute metadata + rating block. */
export interface AttributeExportBlock {
	attribute: AttributeJsonExport
	rating: RatingJsonExport
}

/** Attribute groups keyed by group id, then attribute id, then attribute + rating block. */
export type AttributeGroupsExport = Record<string, Record<string, AttributeExportBlock>>

export interface RatedWalletJsonExportBase {
	overall: AttributeGroupsExport
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

/** Export shape: base fields plus one key per variant (e.g. BROWSER, MOBILE) with AttributeGroupsExport. */
export type RatedWalletJsonExport = RatedWalletJsonExportBase &
	Partial<Record<Variant, AttributeGroupsExport>>

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

function serializeAttribute<V extends Value>(
	evaluatedAttribute: EvaluatedAttribute<V>,
	evalStrings: WalletNameAndPseudonymStrings,
): AttributeExportBlock {
	const { attribute, evaluation } = evaluatedAttribute

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
		rating: evaluation.value.rating,
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

	return {
		attribute: attributeBlock,
		rating: ratingBlock,
	}
}

function serializeEvaluationTree(
	tree: EvaluationTree,
	evalStrings: WalletNameAndPseudonymStrings,
): AttributeGroupsExport {
	const result: AttributeGroupsExport = {}

	const pairs = mapNonExemptAttributeGroupsInTree(
		tree,
		<Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>, evalGroup: EvaluatedGroup<Vs>) => {
			const entries = mapNonExemptGroupAttributes(
				evalGroup,
				evalAttr => [evalAttr.attribute.id, serializeAttribute(evalAttr, evalStrings)] as const,
			)

			return [attrGroup.id, Object.fromEntries(entries)] as const
		},
	)

	for (const [groupId, groupExport] of pairs) {
		result[groupId] = groupExport
	}

	return result
}

export function ratedWalletJsonExport(wallet: RatedWallet): RatedWalletJsonExport {
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

	const payload: RatedWalletJsonExport = {
		walletId: wallet.metadata.id,
		types: setItems(wallet.types),
		variants: setItems(getVariants(wallet.variants)),
		displayName: metadata.displayName,
		description: walletBlurbText(wallet),
		lastUpdated: metadata.lastUpdated,
		stage: stageExport,
		...(website !== undefined && { website }),
		...(repository !== undefined && { repository }),
		overall: serializeEvaluationTree(wallet.overall, evalStrings),
	}

	for (const variant of setItems(getVariants(wallet.variants))) {
		const resolved = wallet.variants[variant]

		if (resolved !== undefined) {
			payload[variant] = serializeEvaluationTree(resolved.attributes, evalStrings)
		}
	}

	return payload
}
