import { attributeTree } from '@/schema/attribute-groups'
import type { Attribute, ExampleRating, Value } from '@/schema/attributes'
import { ContentType, prerenderTypographicContent, type TypographicContent } from '@/types/content'
import { normalizeMarkdownBlankLines } from '@/utils/markdown-utils'

const GENERIC_WALLET_NAME = 'the wallet'
const GENERIC_PSEUDONYM_STRINGS = {
	WALLET_NAME: GENERIC_WALLET_NAME,
	WALLET_PSEUDONYM_SINGULAR: 'pseudonym',
	WALLET_PSEUDONYM_PLURAL: 'pseudonyms',
}

function renderContent(content: TypographicContent<null>): string {
	const rendered = prerenderTypographicContent(content, null)

	switch (rendered.contentType) {
		case ContentType.TEXT:
			return rendered.text
		case ContentType.MARKDOWN:
			return rendered.markdown
	}
}

function renderWalletNameContent(
	content: TypographicContent<null | { WALLET_NAME: string }>,
): string {
	const rendered = prerenderTypographicContent(content, { WALLET_NAME: GENERIC_WALLET_NAME })

	switch (rendered.contentType) {
		case ContentType.TEXT:
			return rendered.text
		case ContentType.MARKDOWN:
			return rendered.markdown
	}
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
	const rendered = prerenderTypographicContent(content, GENERIC_PSEUDONYM_STRINGS)

	switch (rendered.contentType) {
		case ContentType.TEXT:
			return rendered.text
		case ContentType.MARKDOWN:
			return rendered.markdown
	}
}

function normalizeExampleRatings<V extends Value>(
	ratings: ExampleRating<V> | ExampleRating<V>[] | undefined,
): ExampleRating<V>[] {
	if (ratings === undefined) {
		return []
	}

	return Array.isArray(ratings) ? ratings : [ratings]
}

function renderRatingScale<V extends Value>(attribute: Attribute<V>): string[] {
	const { ratingScale } = attribute
	const lines: string[] = ['#### Rating scale', '']

	if (ratingScale.display === 'simple') {
		lines.push(normalizeMarkdownBlankLines(renderPseudonymContent(ratingScale.content)).trim(), '')

		return lines
	}

	const sections: Array<{ label: string; examples: ExampleRating<V>[] }> = [
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
			lines.push(`- ${renderContent(example.description)}`)
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
		'- **PASS**: The wallet fully meets the criteria.',
		'- **PARTIAL**: The wallet partially meets the criteria.',
		'- **FAIL**: The wallet does not meet the criteria.',
		'- **UNRATED**: The information is not yet available.',
		'- **EXEMPT**: The attribute does not apply to this wallet.',
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

			lines.push(normalizeMarkdownBlankLines(renderWalletNameContent(attribute.question)).trim())
			lines.push('')

			lines.push('#### Why it matters')
			lines.push('')
			lines.push(normalizeMarkdownBlankLines(renderWalletNameContent(attribute.why)).trim())
			lines.push('')

			lines.push('#### How it is evaluated')
			lines.push('')
			lines.push(normalizeMarkdownBlankLines(renderWalletNameContent(attribute.methodology)).trim())
			lines.push('')

			lines.push(...renderRatingScale(attribute))
		}
	}

	return lines.join('\n')
}
