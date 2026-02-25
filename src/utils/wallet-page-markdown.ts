import { variantToName } from '@/constants/variants'
import {
	getAttributeFromTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import {
	Rating,
	ratingToText,
	type WalletNameAndPseudonymStrings,
	type WalletNameStrings,
} from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import { getVariants, hasSingleVariant, type Variant } from '@/schema/variants'
import { type RatedWallet, type ResolvedWallet, VariantSpecificity } from '@/schema/wallet'
import {
	type Content,
	ContentType,
	isTypographicContent,
	prerenderTypographicContent,
	type TypographicContent,
} from '@/types/content'
import { nonEmptyEntries, nonEmptyValues, setItems } from '@/types/utils/non-empty'
import { slugifyCamelCase } from '@/types/utils/text'
import {
	collapseToSingleLine,
	markdownBlockquote,
	normalizeMarkdownBlankLines,
} from '@/utils/markdown-utils'

/**
 * Render TypographicContent<WalletNameStrings> to a plain string.
 * Only for content that is known not to contain pseudonym placeholders
 * (e.g. wallet metadata like blurb).
 */
function renderTypographic(
	content: TypographicContent<WalletNameStrings>,
	walletName: string,
): string {
	const rendered = prerenderTypographicContent(content, { WALLET_NAME: walletName })

	switch (rendered.contentType) {
		case ContentType.TEXT:
			return rendered.text
		case ContentType.MARKDOWN:
			return rendered.markdown
	}
}

/**
 * Render any evaluation-related TypographicContent to a plain string, always
 * supplying the full set of wallet name and pseudonym strings.
 *
 * This is necessary because some content typed as WalletNameStrings may still
 * contain {{WALLET_PSEUDONYM_*}} placeholders at runtime (e.g. shortExplanation
 * strings that embed userInfoName() values which return pseudonym placeholders).
 * TypeScript's compile-time template validation cannot catch this for strings
 * constructed from runtime values.
 */
function renderEvaluationContent(
	content: TypographicContent<WalletNameAndPseudonymStrings>,
	strings: WalletNameAndPseudonymStrings,
): string {
	const rendered = prerenderTypographicContent(content, strings)

	switch (rendered.contentType) {
		case ContentType.TEXT:
			return rendered.text
		case ContentType.MARKDOWN:
			return rendered.markdown
	}
}

/**
 * Render Content, falling back to `fallback` for CustomContent.
 * Always passes the full set of strings including pseudonym placeholders.
 */
function renderEvaluationContentOrFallback(
	content: Content<WalletNameAndPseudonymStrings>,
	strings: WalletNameAndPseudonymStrings,
	fallback: string,
): string {
	if (!isTypographicContent(content)) {
		return fallback
	}

	return renderEvaluationContent(content, strings)
}

/**
 * Return the wallet blurb as a single collapsed line, suitable for use
 * as a short description in the /llms.txt index.
 */
export function walletBlurbText(wallet: RatedWallet): string {
	return collapseToSingleLine(renderTypographic(wallet.metadata.blurb, wallet.metadata.displayName))
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

	const evalStrings: WalletNameAndPseudonymStrings = {
		WALLET_NAME: walletName,
		WALLET_PSEUDONYM_SINGULAR: metadata.pseudonymType?.singular ?? 'pseudonym',
		WALLET_PSEUDONYM_PLURAL: metadata.pseudonymType?.plural ?? 'pseudonyms',
	}

	const variantNames = setItems<Variant>(getVariants(wallet.variants))
		.map(v => variantToName(v, true))
		.join(', ')

	const headerLines: string[] = [
		`# ${walletName} — Walletbeat Review`,
		'',
		...markdownBlockquote(renderTypographic(metadata.blurb, walletName)),
		'',
		`Last updated: ${metadata.lastUpdated}`,
		`Walletbeat page: ${siteUrl}/${metadata.id}`,
		`Variants: ${variantNames}`,
		'',
		'---',
		'',
	]

	const isMultiVariant = !hasSingleVariant(wallet.variants)

	const groupLines = mapNonExemptAttributeGroupsInTree(
		wallet.overall,
		(attrGroup, evalGroup): string[] => {
			const attrLines = mapNonExemptGroupAttributes(evalGroup, (evalAttr): string[] => {
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
					renderEvaluationContent(evaluation.value.shortExplanation, evalStrings),
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
						renderEvaluationContent(evaluation.impact, evalStrings),
					)

					if (impact.trim() !== '') {
						parts.push('#### Impact', '', impact.trim(), '')
					}
				}

				if (evaluation.howToImprove !== undefined) {
					const howTo = normalizeMarkdownBlankLines(
						renderEvaluationContent(evaluation.howToImprove, evalStrings),
					)

					if (howTo.trim() !== '') {
						parts.push('#### How to improve', '', howTo.trim(), '')
					}
				}

				if (evaluation.references !== undefined && evaluation.references.length > 0) {
					const qualifiedRefs = toFullyQualified(evaluation.references)

					if (qualifiedRefs.length > 0) {
						parts.push('#### References', '')

						for (const ref of qualifiedRefs) {
							for (const labeledUrl of ref.urls) {
								const refExplanation =
									ref.explanation !== undefined ? `: ${collapseToSingleLine(ref.explanation)}` : ''

								parts.push(`- [${labeledUrl.label}](${labeledUrl.url})${refExplanation}`)
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

	return [...headerLines, ...groupLines.flat()].join('\n')
}
