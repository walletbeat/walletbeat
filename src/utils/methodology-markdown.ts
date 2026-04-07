import { attributeTree } from '@/schema/attribute-groups'
import type { Attribute, ExampleRating, OutcomeMetadata } from '@/schema/attributes'
import { normalizeExampleRatings } from '@/schema/attributes'
import { renderTypographicContentToString, type TypographicContent } from '@/types/content'
import { trimWhitespacePrefix } from '@/types/utils/text'
import { getHowIsEvaluatedHeading, getWhyItMattersHeading } from '@/utils/attribute-display'
import { normalizeMarkdownBlankLines } from '@/utils/markdown-utils'

const GENERIC_WALLET_NAME = 'the wallet'
const GENERIC_PSEUDONYM_STRINGS = {
	WALLET_NAME: GENERIC_WALLET_NAME,
	WALLET_PSEUDONYM_SINGULAR: 'pseudonym',
	WALLET_PSEUDONYM_PLURAL: 'pseudonyms',
}

function renderWalletNameContent(
	content: TypographicContent<null | { WALLET_NAME: string }>,
): string {
	return renderTypographicContentToString(content, { WALLET_NAME: GENERIC_WALLET_NAME })
}

function renderPseudonymContent(
	content: TypographicContent<
		| null
		| { WALLET_NAME: string }
		| {
				WALLET_NAME: string
				WALLET_PSEUDONYM_SINGULAR: string | null
				WALLET_PSEUDONYM_PLURAL: string | null
		  }
	>,
): string {
	return renderTypographicContentToString(content, GENERIC_PSEUDONYM_STRINGS)
}

function renderRatingScale<_OutcomeMetadata extends OutcomeMetadata>(
	attribute: Attribute<_OutcomeMetadata>,
): string[] {
	const { ratingScale } = attribute
	const lines: string[] = ['#### Rating scale', '']

	if (ratingScale.display === 'simple') {
		lines.push(
			normalizeMarkdownBlankLines(
				trimWhitespacePrefix(renderPseudonymContent(ratingScale.content)),
			),
			'',
		)

		return lines
	}

	const sections: Array<{ label: string; examples: ExampleRating<_OutcomeMetadata>[] }> = [
		{ label: 'Pass', examples: normalizeExampleRatings(ratingScale.pass) },
		{ label: 'Partial', examples: normalizeExampleRatings(ratingScale.partial) },
		{ label: 'Fail', examples: normalizeExampleRatings(ratingScale.fail) },
	]

	if (ratingScale.display === 'fail-pass') {
		sections.reverse()
	}

	if (!ratingScale.exhaustive) {
		lines.push('A few examples:', '')
	}

	for (const { label, examples } of sections) {
		if (examples.length === 0) {
			continue
		}

		lines.push(`**${label}:**`)
		lines.push('')

		for (const example of examples) {
			lines.push(`- ${renderTypographicContentToString(example.description, null)}`)
		}

		lines.push('')
	}

	return lines
}

/**
 * Generate the Walletbeat methodology page as markdown.
 *
 * @param siteUrl The site root URL without trailing slash.
 */
export function methodologyPageMarkdown(siteUrl: string): string {
	const lines: string[] = [
		'# Walletbeat Methodology',
		'',
		'> Walletbeat is an independent rating platform for Ethereum wallets, evaluating them across security, privacy, self-sovereignty, transparency, ecosystem, and maintenance categories.',
		'',
		'Each wallet is rated on individual attributes using a `PASS` / `PARTIAL` / `FAIL` / `UNRATED` / `EXEMPT` system.',
		'',
		'- **`PASS`**: The wallet fully meets the criteria.',
		'- **`PARTIAL`**: The wallet partially meets the criteria.',
		'- **`FAIL`**: The wallet does not meet the criteria.',
		'- **`UNRATED`**: The information is not yet available.',
		'- **`EXEMPT`**: The attribute does not apply to this wallet.',
		'',
		`Full wallet list and ratings: ${siteUrl}`,
		'',
		'---',
		'',
	]

	for (const group of Object.values(attributeTree)) {
		lines.push(`## ${group.displayName}`)
		lines.push('')

		for (const attribute of Object.values(group.attributes)) {
			lines.push(`### ${attribute.displayName}`)
			lines.push('')

			lines.push(
				normalizeMarkdownBlankLines(
					trimWhitespacePrefix(renderWalletNameContent(attribute.question)),
				),
			)
			lines.push('')

			lines.push(`#### ${getWhyItMattersHeading(attribute)}`)
			lines.push('')
			lines.push(
				normalizeMarkdownBlankLines(trimWhitespacePrefix(renderWalletNameContent(attribute.why))),
			)
			lines.push('')

			lines.push(`#### ${getHowIsEvaluatedHeading(attribute)}`)
			lines.push('')
			lines.push(
				normalizeMarkdownBlankLines(
					trimWhitespacePrefix(renderWalletNameContent(attribute.methodology)),
				),
			)
			lines.push('')

			lines.push(...renderRatingScale(attribute))
		}
	}

	return lines.join('\n')
}
