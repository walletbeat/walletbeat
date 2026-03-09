import { getBaseUrl } from '@/base-url'
import { ratedWalletExportSchemaPath } from '@/constants'
import {
	type EvaluationTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import type {
	AttributeGroup,
	EvaluatedAttribute,
	EvaluatedGroup,
	Value,
	ValueSet,
	WalletNameAndPseudonymStrings,
} from '@/schema/attributes'
import { type ResolvedFeatures } from '@/schema/features'
import {
	isNoRef,
	isReferenceInput,
	type ReferenceInput,
	toFullyQualified,
} from '@/schema/reference'
import {
	type WalletLadderEvaluation,
	type WalletStage,
	type WalletStageCriterion,
	type WalletStageGroup,
} from '@/schema/stages'
import { getUrl } from '@/schema/url'
import { getVariants, type Variant } from '@/schema/variants'
import { type RatedWallet } from '@/schema/wallet'
import type { WalletType } from '@/schema/wallet-types'
import { renderTypographicContentToString } from '@/types/content'
import { setItems } from '@/types/utils/non-empty'
import { getHowIsEvaluatedHeading } from '@/utils/attribute-display'
import { getWalletEvalStrings, renderContentToText } from '@/utils/evaluation-content'
import { getWalletStageAndLadder } from '@/utils/stage'
import {
	allCriteriaInStage,
	computeCountsAndStatus,
	getCriterionAttributeId,
	type StageCountsStatus,
} from '@/utils/stage-attributes'
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

/** Single attribute export: attribute metadata + evaluation block. */
export interface AttributeExportBlock {
	attribute: AttributeJsonExport
	evaluation: RatingJsonExport
}

/** Attribute groups keyed by group id, then attribute id, then attribute + evaluation block. */
export type AttributeGroupsExport = Record<string, Record<string, AttributeExportBlock>>

/** Per-variant export: attribute evaluations and raw feature data for one variant. */
export interface PerVariantExport {
	attributes: AttributeGroupsExport
	features: unknown
}

export interface StageCriterionBreakdownItemJsonExport {
	criterionId: string
	attributeId: string | null
	displayName: string
	description: string
	rating: 'PASS' | 'FAIL' | 'EXEMPT' | 'UNRATED'
}

/** Criteria group within a stage for JSON export (mirrors markdown #### heading + bullets). */
export interface StageCriteriaGroupBreakdownItemJsonExport {
	description: string
	criteria: StageCriterionBreakdownItemJsonExport[]
}

/** Per-stage criteria counts and status for JSON export (overall ladder only). */
export interface StageBreakdownItemJsonExport {
	stageId: string
	label: string
	passedCount: number
	totalCount: number
	status: StageCountsStatus
	criteriaGroups: StageCriteriaGroupBreakdownItemJsonExport[]
}

export interface RatedWalletJsonExportBase {
	$schema: string
	overall: AttributeGroupsExport
	perVariant: Partial<Record<Variant, PerVariantExport>>
	types: WalletType[]
	variants: Variant[]
	walletId: string
	displayName: string
	description: string
	lastUpdated: string
	stage: string | null
	stageBreakdown: StageBreakdownItemJsonExport[] | null
	website?: string
	repository?: string
}

/** Export shape: base fields with perVariant object keyed by variant (e.g. BROWSER, MOBILE). */
export type RatedWalletJsonExport = RatedWalletJsonExportBase

function serializeReferences(references: ReferenceInput): ReferenceJsonExport[] {
	const qualified = toFullyQualified(references)

	if (qualified.length === 0) {
		return []
	}

	return qualified.map(ref => ({
		...(ref.explanation !== undefined && { explanation: ref.explanation }),
		urls: ref.urls.map(u => ({ label: u.label, url: u.url })),
	}))
}

/**
 * Serialize ResolvedFeatures to a JSON-serializable plain object for export.
 * Ref fields are normalized to the same shape as attribute references.
 */
function serializeResolvedFeatures(features: ResolvedFeatures): unknown {
	/**
	 * Recursively serialize a value from ResolvedFeatures (or nested feature data) to a
	 * JSON-serializable plain value. Normalizes `ref` properties: real references become
	 * ReferenceJsonExport[]; refTodo/refNotNecessary become null.
	 */
	function serializeFeatureValue(value: unknown): unknown {
		if (value === null || typeof value !== 'object') {
			return value
		}

		if (Array.isArray(value)) {
			return value.map(serializeFeatureValue)
		}

		const result: Record<string, unknown> = {}

		for (const [key, val] of Object.entries(value)) {
			if (key === 'ref') {
				const ref: unknown = val

				if (ref === undefined || ref === null || isNoRef(ref)) {
					result.ref = null
				} else if (isReferenceInput(ref)) {
					try {
						result.ref = serializeReferences(ref)
					} catch {
						result.ref = null
					}
				} else {
					result.ref = null
				}
			} else {
				result[key] = serializeFeatureValue(val as unknown)
			}
		}

		return result
	}

	return serializeFeatureValue(features)
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
		details: renderContentToText(evaluation.details, evalStrings, {
			fallback: DETAILS_FALLBACK,
		}),
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
		evaluation: ratingBlock,
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

function serializeStageCriteriaGroup(
	group: WalletStageGroup,
	stageEvaluatableWallet: Omit<RatedWallet, 'metadata' | 'ladders'>,
	evalStrings: WalletNameAndPseudonymStrings,
): StageCriteriaGroupBreakdownItemJsonExport {
	const description = renderContentToText(group.description, evalStrings, { trim: true })

	const criteria: StageCriterionBreakdownItemJsonExport[] = []

	const groupCriteria: readonly WalletStageCriterion[] = group.criteria

	for (const criterion of groupCriteria) {
		const evaluation = criterion.evaluate(stageEvaluatableWallet)
		const attributeId = getCriterionAttributeId(criterion)
		const descText = renderContentToText(criterion.description, evalStrings, { trim: true })

		criteria.push({
			criterionId: criterion.id,
			attributeId,
			displayName: criterion.displayName,
			description: descText,
			rating: evaluation.rating,
		})
	}

	return { description, criteria }
}

function computeStageBreakdown(
	wallet: RatedWallet,
	ladderEvaluation: WalletLadderEvaluation | null,
): StageBreakdownItemJsonExport[] | null {
	if (ladderEvaluation === null || ladderEvaluation.stage === 'NOT_APPLICABLE') {
		return null
	}

	const evalStrings = getWalletEvalStrings(wallet)
	const { metadata: _metadata, ladders: _ladders, ...stageEvaluatableWallet } = wallet
	const result: StageBreakdownItemJsonExport[] = []

	for (const s of ladderEvaluation.ladder.stages) {
		const { passedCount, totalCount, status } = computeCountsAndStatus(
			allCriteriaInStage(s),
			stageEvaluatableWallet,
		)

		const criteriaGroups = s.criteriaGroups.map(group =>
			serializeStageCriteriaGroup(group, stageEvaluatableWallet, evalStrings),
		)

		result.push({
			stageId: s.id,
			label: s.label,
			passedCount,
			totalCount,
			status,
			criteriaGroups,
		})
	}

	return result
}

export function ratedWalletJsonExport(wallet: RatedWallet): RatedWalletJsonExport {
	const { metadata } = wallet
	const evalStrings = getWalletEvalStrings(wallet)

	const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)
	const stageExport = stageToExportString(stage)
	const stageBreakdown = computeStageBreakdown(wallet, ladderEvaluation)

	const website =
		metadata.urls?.websites?.[0] !== undefined ? getUrl(metadata.urls.websites[0]) : undefined
	const repository =
		metadata.urls?.repositories?.[0] !== undefined
			? getUrl(metadata.urls.repositories[0])
			: undefined

	const payload: RatedWalletJsonExport = {
		$schema: `${getBaseUrl()}/${ratedWalletExportSchemaPath}`,
		walletId: wallet.metadata.id,
		types: setItems(wallet.types),
		variants: setItems(getVariants(wallet.variants)),
		displayName: metadata.displayName,
		description: walletBlurbText(wallet),
		lastUpdated: metadata.lastUpdated,
		stage: stageExport,
		stageBreakdown,
		...(website !== undefined && { website }),
		...(repository !== undefined && { repository }),
		overall: serializeEvaluationTree(wallet.overall, evalStrings),
		perVariant: {},
	}

	for (const variant of setItems(getVariants(wallet.variants))) {
		const resolved = wallet.variants[variant]

		if (resolved !== undefined) {
			payload.perVariant[variant] = {
				attributes: serializeEvaluationTree(resolved.attributes, evalStrings),
				features: serializeResolvedFeatures(resolved.features),
			}
		}
	}

	return payload
}
