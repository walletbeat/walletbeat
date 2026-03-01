import { remark } from 'remark'
import remarkLintNoLiteralUrls from 'remark-lint-no-literal-urls'
import presetLintRecommended from 'remark-preset-lint-recommended'

const processor = remark().use(presetLintRecommended).use(remarkLintNoLiteralUrls, false)

/**
 * Parse and lint markdown using remark and remark-lint (recommended preset with
 * no-literal-urls disabled). Throws if any parse or lint violation is found.
 */
export async function assertValidMarkdown(markdown: string): Promise<void> {
	const file = await processor.process(markdown)
	const lines = markdown.split('\n')

	const errors = file.messages.filter(
		msg =>
			msg.fatal === true ||
			(msg as { ruleId?: string }).ruleId !== undefined ||
			(msg as { source?: string }).source !== undefined,
	)

	if (errors.length > 0) {
		const details = errors
			.map(msg => {
				const ruleId =
					(msg as { ruleId?: string }).ruleId ?? (msg as { source?: string }).source ?? 'parse'
				const line = msg.line ?? 0
				const column = msg.column ?? 0
				const sourceLine = line >= 1 && line <= lines.length ? lines[line - 1] : ''
				const location = `${line}:${column}`

				return sourceLine
					? `  [${ruleId}] ${msg.reason} (${location})\n    ${sourceLine.trim()}`
					: `  [${ruleId}] ${msg.reason} (${location})`
			})
			.join('\n')

		throw new Error(`Invalid markdown:\n${details}`)
	}
}
