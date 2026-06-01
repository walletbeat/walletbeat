import { variantToName } from '@/constants/variants'
import {
	type AttributeTree,
	getAttributeFromTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { Rating, ratingToText } from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import { StageCriterionRating, stageCriterionRatings } from '@/schema/stages'
import { getVariants, hasSingleVariant, type Variant } from '@/schema/variants'
import {
	type RatedWallet,
	type ResolvedWallet,
	VariantSpecificity,
	type WalletMetadata,
} from '@/schema/wallet'
import { isTypographicContent, renderTypographicContentToString } from '@/types/content'
import { nonEmptyEntries, nonEmptyValues, setItems } from '@/types/utils/non-empty'
import { slugifyCamelCase, trimWhitespacePrefix } from '@/types/utils/text'
import { getHowToImproveHeading } from '@/utils/attribute-display'
import { getWalletEvalStrings, renderContentToText } from '@/utils/evaluation-content'
import {
	collapseToSingleLine,
	markdownBlockquote,
	normalizeMarkdownBlankLines,
} from '@/utils/markdown-utils'
import { getWalletStageAndLadder } from '@/utils/stage'
import {
	allCriteriaInStage,
	computeCountsAndStatus,
	getCriterionAttributeId,
} from '@/utils/stage-attributes'
import { getWalletUrl } from '@/utils/wallet-url'

/**
 * Return the wallet blurb as a single collapsed line, suitable for use
 * as a short description in the /llms.txt index.
 */
export function walletBlurbText(wallet: { metadata: WalletMetadata }): string {
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
 * @param attributeTree Attribute tree for this wallet class; must match the shape of `wallet.overall`.
 * @param wallet The fully-rated wallet to render.
 * @param siteUrl The site root URL without trailing slash (e.g. "https://wallet.page").
 */
export function walletPageMarkdown<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	wallet: RatedWallet<_AttributeGroupId>,
	siteUrl: string,
): string {
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
		`Walletbeat page: ${siteUrl}${getWalletUrl(wallet)}`,
		`Methodology: ${siteUrl}/methodology/index.html.md`,
		`Variants: ${variantNames}`,
		`Stage: ${stageHeaderText}`,
		'',
		'---',
		'',
	]

	const stageSection: string[] = []

	if (typeof stage === 'object' && stage !== null) {
		stageSection.push(
			'## Stage',
			'',
			`[${stage.label}](${siteUrl}${getWalletUrl(wallet, { attributeAnchor: 'stages' })})`,
			'',
		)

		if (isTypographicContent(stage.description)) {
			const desc = normalizeMarkdownBlankLines(
				trimWhitespacePrefix(
					renderTypographicContentToString(stage.description, { WALLET_NAME: walletName }),
				),
			)

			if (desc !== '') {
				stageSection.push(desc, '')
			}
		}

		if (ladderEvaluation !== null) {
			const { metadata: _metadata, ladders: _ladders, ...stageEvaluatableWallet } = wallet

			for (let stageIndex = 0; stageIndex < ladderEvaluation.ladder.stages.length; stageIndex++) {
				const s = ladderEvaluation.ladder.stages[stageIndex]

				stageSection.push(`### Stage ${stageIndex}: ${s.label}`, '')

				const { passedCount, totalCount } = computeCountsAndStatus(
					allCriteriaInStage(s),
					stageEvaluatableWallet,
				)

				if (totalCount > 0) {
					const word = totalCount === 1 ? 'criterion' : 'criteria'

					stageSection.push(`${passedCount}/${totalCount} ${word} passed`, '')
				}

				for (const criteriaGroup of s.criteriaGroups) {
					const groupDescRaw = renderContentToText(criteriaGroup.description, evalStrings, {
						trim: true,
					})

					if (groupDescRaw !== '') {
						const groupDesc = normalizeMarkdownBlankLines(groupDescRaw)

						if (groupDesc !== '') {
							const groupHeading =
								/^[a-z]/.test(groupDesc) && groupDesc.length > 0
									? groupDesc.charAt(0).toUpperCase() + groupDesc.slice(1)
									: groupDesc

							stageSection.push(`#### ${groupHeading}`, '')
						}
					}

					const groupCriteria = criteriaGroup.criteria

					for (const criterion of groupCriteria) {
						const evaluation = criterion.evaluate(stageEvaluatableWallet)
						const attributeId = getCriterionAttributeId(criterion)
						const descText = normalizeMarkdownBlankLines(
							renderContentToText(criterion.description, evalStrings, { trim: true }),
						)
						const descForBullet =
							descText !== '' && /^[a-z]/.test(descText)
								? descText.charAt(0).toUpperCase() + descText.slice(1)
								: descText
						const rating = evaluation.rating as StageCriterionRating
						const ratingInfo = stageCriterionRatings[rating]
						const displayName = criterion.displayName
						const attrLink =
							attributeId !== null
								? `[${displayName}](${siteUrl}${getWalletUrl(wallet, {
										attributeAnchor: slugifyCamelCase(attributeId),
									})})`
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
		attributeTree,
		wallet.overall,
		(attrGroup, evalGroup): string[] => {
			const attrLines: string[][] = mapNonExemptGroupAttributes(evalGroup, (evalAttr): string[] => {
				const { attribute, evaluation } = evalAttr
				const rating = ratingToText(evaluation.outcome.rating)
				const walletAttrUrl = `${siteUrl}${getWalletUrl(wallet, {
					attributeAnchor: slugifyCamelCase(attribute.id),
				})}`
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

						for (const [variant, resolved] of nonEmptyEntries<
							Variant,
							ResolvedWallet<_AttributeGroupId>
						>(wallet.variants)) {
							const variantEvalAttr = getAttributeFromTree(
								attributeTree,
								resolved.attributes,
								attribute,
							)

							if (
								variantEvalAttr === null ||
								variantEvalAttr.evaluation.outcome.rating === Rating.EXEMPT
							) {
								continue
							}

							perVariantParts.push(
								`${variantToName(variant, true)}: ${ratingToText(variantEvalAttr.evaluation.outcome.rating)}`,
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
					trimWhitespacePrefix(
						renderTypographicContentToString(evaluation.outcome.shortExplanation, evalStrings),
					),
				)

				parts.push(shortExpl, '')

				const details = normalizeMarkdownBlankLines(
					renderContentToText(evaluation.details, evalStrings, {
						fallback: `[See full details for ${attribute.displayName}](${walletAttrUrl})`,
						trim: true,
					}),
				)

				if (details.trim() !== '') {
					parts.push(details, '')
				}

				if (evaluation.impact !== undefined) {
					const impact = normalizeMarkdownBlankLines(
						trimWhitespacePrefix(renderTypographicContentToString(evaluation.impact, evalStrings)),
					)

					if (impact.trim() !== '') {
						parts.push('#### Impact', '', impact, '')
					}
				}

				if (evaluation.howToImprove !== undefined) {
					const howTo = normalizeMarkdownBlankLines(
						trimWhitespacePrefix(
							renderTypographicContentToString(evaluation.howToImprove, evalStrings),
						),
					)

					if (howTo.trim() !== '') {
						parts.push(`#### ${getHowToImproveHeading(attribute, walletName)}`, '', howTo, '')
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
			})

			return [`## ${attrGroup.displayName}`, '', ...attrLines.flat()]
		},
	)

	return [...headerLines, ...stageSection, ...groupLines.flat()].join('\n')
}
