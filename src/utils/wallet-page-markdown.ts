import {
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import {
	ratingToText,
	type WalletNameAndPseudonymStrings,
	type WalletNameStrings,
} from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import type { RatedWallet } from '@/schema/wallet'
import {
	type Content,
	ContentType,
	isTypographicContent,
	prerenderTypographicContent,
	type TypographicContent,
} from '@/types/content'

/**
 * Collapse runs of 3+ newlines to exactly two (one blank line).
 * Used so attribute template output does not produce excess blank lines.
 */
function normalizeMarkdownBlankLines(content: string): string {
	return content.replace(/\n{3,}/g, '\n\n')
}

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
	walletName: string,
	pseudonymSingular: string,
	pseudonymPlural: string,
): string {
	const rendered = prerenderTypographicContent(content, {
		WALLET_NAME: walletName,
		WALLET_PSEUDONYM_SINGULAR: pseudonymSingular,
		WALLET_PSEUDONYM_PLURAL: pseudonymPlural,
	})

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
	walletName: string,
	pseudonymSingular: string,
	pseudonymPlural: string,
	fallback: string,
): string {
	if (!isTypographicContent(content)) {
		return fallback
	}

	return renderEvaluationContent(content, walletName, pseudonymSingular, pseudonymPlural)
}

/**
 * Return the wallet blurb as a single collapsed line, suitable for use
 * as a short description in the /llms.txt index.
 */
export function walletBlurbText(wallet: RatedWallet): string {
	return renderTypographic(wallet.metadata.blurb, wallet.metadata.displayName)
		.trim()
		.replace(/\s+/g, ' ')
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

	// Provide non-null fallbacks for pseudonym strings so that evaluation content
	// which contains {{WALLET_PSEUDONYM_*}} placeholders can always be rendered.
	// For wallets with a pseudonym type, this will use the actual pseudonym name.
	// For others, a generic term ensures the output is still readable.
	const pseudonymSingular = metadata.pseudonymType?.singular ?? 'pseudonym'
	const pseudonymPlural = metadata.pseudonymType?.plural ?? 'pseudonyms'

	const lines: string[] = []

	// Header
	lines.push(`# ${walletName} — Walletbeat Review`)
	lines.push('')

	// Blurb as a blockquote; handle multi-line text
	const blurbText = renderTypographic(metadata.blurb, walletName)
	const blurbLines = blurbText
		.trim()
		.split('\n')
		.map(line => `> ${line}`)

	lines.push(...blurbLines)
	lines.push('')

	// Metadata
	lines.push(`Last updated: ${metadata.lastUpdated}`)
	lines.push(`Walletbeat page: ${siteUrl}/${metadata.id}`)
	lines.push('')
	lines.push('---')
	lines.push('')

	// Attribute groups
	mapNonExemptAttributeGroupsInTree(wallet.overall, (attrGroup, evalGroup) => {
		lines.push(`## ${attrGroup.displayName}`)
		lines.push('')

		mapNonExemptGroupAttributes(evalGroup, evalAttr => {
			const { attribute, evaluation } = evalAttr
			const rating = ratingToText(evaluation.value.rating)

			// Attribute heading with rating
			lines.push(`### ${attribute.displayName}: ${rating}`)
			lines.push('')

			// Short explanation — use full pseudonym strings because runtime string
			// construction can embed {{WALLET_PSEUDONYM_*}} in WalletNameStrings content.
			const shortExpl = normalizeMarkdownBlankLines(
				renderEvaluationContent(
					evaluation.value.shortExplanation,
					walletName,
					pseudonymSingular,
					pseudonymPlural,
				),
			)

			lines.push(shortExpl.trim())
			lines.push('')

			// Long details — omit if CustomContent (no plain-text representation)
			const details = normalizeMarkdownBlankLines(
				renderEvaluationContentOrFallback(
					evaluation.details,
					walletName,
					pseudonymSingular,
					pseudonymPlural,
					'',
				),
			)

			if (details.trim() !== '') {
				lines.push(details.trim())
				lines.push('')
			}

			// Impact
			if (evaluation.impact !== undefined) {
				const impact = normalizeMarkdownBlankLines(
					renderEvaluationContent(
						evaluation.impact,
						walletName,
						pseudonymSingular,
						pseudonymPlural,
					),
				)

				if (impact.trim() !== '') {
					lines.push(`**Impact:** ${impact.trim()}`)
					lines.push('')
				}
			}

			// How to improve
			if (evaluation.howToImprove !== undefined) {
				const howTo = normalizeMarkdownBlankLines(
					renderEvaluationContent(
						evaluation.howToImprove,
						walletName,
						pseudonymSingular,
						pseudonymPlural,
					),
				)

				if (howTo.trim() !== '') {
					lines.push(`**How to improve:** ${howTo.trim()}`)
					lines.push('')
				}
			}

			// References
			if (evaluation.references !== undefined && evaluation.references.length > 0) {
				const qualifiedRefs = toFullyQualified(evaluation.references)

				if (qualifiedRefs.length > 0) {
					lines.push('**References:**')

					for (const ref of qualifiedRefs) {
						for (const labeledUrl of ref.urls) {
							const refExplanation =
								ref.explanation !== undefined
									? `: ${ref.explanation.trim().replace(/\s+/g, ' ')}`
									: ''

							lines.push(`- [${labeledUrl.label}](${labeledUrl.url})${refExplanation}`)
						}
					}

					lines.push('')
				}
			}
		})

		return undefined
	})

	return lines.join('\n')
}
