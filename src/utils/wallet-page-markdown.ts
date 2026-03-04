import { variantToName } from '@/constants/variants'
import {
	getAttributeFromTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import {
	type Attribute,
	type AttributeGroup,
	type EvaluatedGroup,
	Rating,
	ratingToText,
	type Value,
	type ValueSet,
} from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import { StageCriterionRating, stageCriterionRatings, type WalletStage } from '@/schema/stages'
import { getVariants, hasSingleVariant, type Variant } from '@/schema/variants'
import { type RatedWallet, type ResolvedWallet, VariantSpecificity } from '@/schema/wallet'
import { isTypographicContent, renderTypographicContentToString } from '@/types/content'
import { nonEmptyEntries, nonEmptyValues, setItems } from '@/types/utils/non-empty'
import { slugifyCamelCase } from '@/types/utils/text'
import { getWalletEvalStrings, renderEvaluationContentOrFallback } from '@/utils/evaluation-content'
import {
	collapseToSingleLine,
	markdownBlockquote,
	normalizeMarkdownBlankLines,
} from '@/utils/markdown-utils'
import { getWalletStageAndLadder } from '@/utils/stage'
import { attributesById, getCriterionAttributeId } from '@/utils/stage-attributes'

// TODO: https://github.com/walletbeat/walletbeat/issues/555
/**
 * Convert a stage criterion id (snake_case) to a human-readable label (Title Case).
 * Used when the criterion has no linked attribute (getCriterionAttributeId returns null).
 */
function criterionIdToDisplayName(id: string): string {
	return id
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(' ')
}

/**
 * Return the "How to improve" section heading using Attribute.wording.
 * Complex wording: use the rendered whatCanWalletDoAboutIts sentence.
 * Simple wording: "What can {walletName} do about its {midSentenceName}?"
 */
function getHowToImproveHeading<V extends Value>(
	attribute: Attribute<V>,
	walletName: string,
): string {
	const { wording } = attribute

	if (wording.midSentenceName === null) {
		return collapseToSingleLine(
			renderTypographicContentToString(wording.whatCanWalletDoAboutIts, {
				WALLET_NAME: walletName,
			}),
		)
	}

	return `What can ${walletName} do about its ${wording.midSentenceName}?`
}

/**
 * Return the wallet blurb as a single collapsed line, suitable for use
 * as a short description in the /llms.txt index.
 */
export function walletBlurbText(wallet: RatedWallet): string {
	return collapseToSingleLine(
		renderTypographicContentToString(wallet.metadata.blurb, {
			WALLET_NAME: wallet.metadata.displayName,
		}),
	)
}

/**
 * Generate a clean markdown page for a wallet, following the llms.txt convention
 * of providing LLM-friendly content at `{walletUrl}/index.html.md`.
 *
 * @param wallet The fully-rated wallet to render.
 * @param siteUrl The site root URL without trailing slash (e.g. "https://wallet.page").
 */
export function walletPageMarkdown(wallet: RatedWallet, siteUrl: string): string {
	const { metadata } = wallet
	const walletName = metadata.displayName

	const evalStrings = getWalletEvalStrings(wallet)

	const variantNames = setItems<Variant>(getVariants(wallet.variants))
		.map(v => variantToName(v, true))
		.join(', ')

	const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)

	const stageHeaderText =
		stage === null || stage === 'NOT_APPLICABLE'
			? 'Not applicable'
			: stage === 'QUALIFIED_FOR_NO_STAGES'
				? 'Qualified for no stages'
				: stage.label

	const headerLines: string[] = [
		`# ${walletName} — Walletbeat Review`,
		'',
		...markdownBlockquote(
			renderTypographicContentToString(metadata.blurb, { WALLET_NAME: walletName }),
		),
		'',
		`Last updated: ${metadata.lastUpdated}`,
		`Walletbeat page: ${siteUrl}/${metadata.id}`,
		`Methodology: ${siteUrl}/methodology/index.html.md`,
		`Variants: ${variantNames}`,
		`Stage: ${stageHeaderText}`,
		'',
		'---',
		'',
	]

	const stageSection: string[] = []

	if (typeof stage === 'object' && stage !== null) {
		stageSection.push('## Stage', '', `[${stage.label}](${siteUrl}/${metadata.id}#stages)`, '')

		if (isTypographicContent(stage.description)) {
			const desc = normalizeMarkdownBlankLines(
				renderTypographicContentToString(stage.description, { WALLET_NAME: walletName }),
			).trim()

			if (desc !== '') {
				stageSection.push(desc, '')
			}
		}

		if (ladderEvaluation !== null) {
			const { metadata: _metadata, ladders: _ladders, ...stageEvaluatableWallet } = wallet

			for (let stageIndex = 0; stageIndex < ladderEvaluation.ladder.stages.length; stageIndex++) {
				const s: WalletStage = ladderEvaluation.ladder.stages[stageIndex]

				stageSection.push(`### Stage ${stageIndex}: ${s.label}`, '')

				const allCriteria = s.criteriaGroups.flatMap(group => group.criteria)
				const allEvaluations = allCriteria.map(criterion =>
					criterion.evaluate(stageEvaluatableWallet),
				)
				const applicableEvaluations = allEvaluations.filter(
					e => e.rating !== StageCriterionRating.EXEMPT,
				)
				const passedCount = applicableEvaluations.filter(
					e => e.rating === StageCriterionRating.PASS,
				).length
				const totalCount = applicableEvaluations.length

				if (totalCount > 0) {
					const word = totalCount === 1 ? 'criterion' : 'criteria'

					stageSection.push(`${passedCount}/${totalCount} ${word} passed`, '')
				}

				for (const criteriaGroup of s.criteriaGroups) {
					if (
						isTypographicContent(criteriaGroup.description) &&
						criteriaGroup.description !== undefined
					) {
						const groupDesc = normalizeMarkdownBlankLines(
							renderTypographicContentToString(criteriaGroup.description, {
								WALLET_NAME: walletName,
							}),
						).trim()

						if (groupDesc !== '') {
							const groupHeading =
								/^[a-z]/.test(groupDesc) && groupDesc.length > 0
									? groupDesc.charAt(0).toUpperCase() + groupDesc.slice(1)
									: groupDesc

							stageSection.push(`#### ${groupHeading}`, '')
						}
					}

					for (const criterion of criteriaGroup.criteria) {
						const evaluation = criterion.evaluate(stageEvaluatableWallet)
						const attributeId = getCriterionAttributeId(criterion)
						const attribute = attributeId ? (attributesById.get(attributeId) ?? null) : null
						const displayName =
							attribute?.displayName ?? attributeId ?? criterionIdToDisplayName(criterion.id)
						const descText = normalizeMarkdownBlankLines(
							renderTypographicContentToString(criterion.description, { WALLET_NAME: walletName }),
						).trim()
						const descForBullet =
							descText !== '' && /^[a-z]/.test(descText)
								? descText.charAt(0).toUpperCase() + descText.slice(1)
								: descText
						const rating = evaluation.rating as StageCriterionRating
						const ratingInfo = stageCriterionRatings[rating]
						const attrLink =
							attributeId !== null
								? `[${displayName}](${siteUrl}/${metadata.id}#${slugifyCamelCase(attributeId)})`
								: displayName
						const bullet =
							descForBullet !== ''
								? `- ${attrLink} — ${descForBullet}: ${ratingInfo.icon}`
								: `- ${attrLink}: ${ratingInfo.icon}`

						stageSection.push(bullet)
					}

					stageSection.push('')
				}
				stageSection.push('')
			}
		}
	}

	const isMultiVariant = !hasSingleVariant(wallet.variants)

	const groupLines = mapNonExemptAttributeGroupsInTree(
		wallet.overall,
		<Vs extends ValueSet>(
			attrGroup: AttributeGroup<Vs>,
			evalGroup: EvaluatedGroup<Vs>,
		): string[] => {
			// TODO: https://github.com/walletbeat/walletbeat/issues/547
			const attrLines: string[][] = mapNonExemptGroupAttributes<string[], Vs>(
				evalGroup,
				(evalAttr): string[] => {
					const { attribute, evaluation } = evalAttr
					const rating = ratingToText(evaluation.value.rating)
					const walletAttrUrl = `${siteUrl}/${metadata.id}#${slugifyCamelCase(attribute.id)}`
					const parts: string[] = [`### ${attribute.displayName}: ${rating}`, '']

					if (isMultiVariant) {
						const isVariantSpecific = nonEmptyValues<Variant, Map<string, VariantSpecificity>>(
							wallet.variantSpecificity,
						).some(specMap => {
							const spec = specMap.get(attribute.id)

							return (
								spec === VariantSpecificity.UNIQUE_TO_VARIANT ||
								spec === VariantSpecificity.NOT_UNIVERSAL
							)
						})

						if (isVariantSpecific) {
							const perVariantParts: string[] = []

							for (const [variant, resolved] of nonEmptyEntries<Variant, ResolvedWallet>(
								wallet.variants,
							)) {
								const variantEvalAttr = getAttributeFromTree(resolved.attributes, attribute)

								if (
									variantEvalAttr === null ||
									variantEvalAttr.evaluation.value.rating === Rating.EXEMPT
								) {
									continue
								}

								perVariantParts.push(
									`${variantToName(variant, true)}: ${ratingToText(variantEvalAttr.evaluation.value.rating)}`,
								)
							}

							if (perVariantParts.length > 0) {
								parts.push(
									`**Per-variant ratings:** ${perVariantParts.join(', ')}. [See full details](${walletAttrUrl}).`,
									'',
								)
							}
						}
					}

					const shortExpl = normalizeMarkdownBlankLines(
						renderTypographicContentToString(evaluation.value.shortExplanation, evalStrings),
					)

					parts.push(shortExpl.trim(), '')

					const details = normalizeMarkdownBlankLines(
						renderEvaluationContentOrFallback(
							evaluation.details,
							evalStrings,
							`[See full details for ${attribute.displayName}](${walletAttrUrl})`,
						),
					)

					if (details.trim() !== '') {
						parts.push(details.trim(), '')
					}

					if (evaluation.impact !== undefined) {
						const impact = normalizeMarkdownBlankLines(
							renderTypographicContentToString(evaluation.impact, evalStrings),
						)

						if (impact.trim() !== '') {
							parts.push('#### Impact', '', impact.trim(), '')
						}
					}

					if (evaluation.howToImprove !== undefined) {
						const howTo = normalizeMarkdownBlankLines(
							renderTypographicContentToString(evaluation.howToImprove, evalStrings),
						)

						if (howTo.trim() !== '') {
							parts.push(
								`#### ${getHowToImproveHeading(attribute, walletName)}`,
								'',
								howTo.trim(),
								'',
							)
						}
					}

					if (evaluation.references !== undefined && evaluation.references.length > 0) {
						const qualifiedRefs = toFullyQualified(evaluation.references)

						if (qualifiedRefs.length > 0) {
							parts.push('#### References', '')

							for (const ref of qualifiedRefs) {
								for (const labeledUrl of ref.urls) {
									const prefix =
										ref.explanation === undefined
											? ''
											: `${collapseToSingleLine(ref.explanation)} Source: `

									parts.push(`- ${prefix}[${labeledUrl.label}](${labeledUrl.url})`)
								}
							}

							parts.push('')
						}
					}

					return parts
				},
			)

			return [`## ${attrGroup.displayName}`, '', ...attrLines.flat()]
		},
	)

	return [...headerLines, ...stageSection, ...groupLines.flat()].join('\n')
}
