import * as harper from 'harper.js'

/** The purpose of the text being checked, independent of its markup format. */
export enum GrammarTextKind {
	GENERAL = 'GENERAL',
	REFERENCE_LABEL = 'REFERENCE_LABEL',
	REFERENCE_EXPLANATION = 'REFERENCE_EXPLANATION',
}

export interface Suggestion {
	get_replacement_text(): string
	kind(): harper.SuggestionKind
}

export interface Span {
	start: number
	end: number
}

export interface Lint {
	get_problem_text(): string
	lint_kind_pretty(): string
	suggestions(): Suggestion[]
	span(): Span
	message(): string
}

export interface AbstractLinter {
	lint(text: string, lintOptions?: harper.LintOptions, kind?: GrammarTextKind): Promise<Lint[]>
}

/** Format diagnostics with source locations, highlighted text, and suggestions. */
export function formatLintMessages(text: string, lints: Lint[]): string[] {
	const messages: string[] = []

	for (const lint of lints) {
		const { start, end } = lint.span()
		const before = text.substring(Math.max(0, start - 16), start)
		const after = text.substring(end, Math.min(text.length, end + 16))
		const badText = text.substring(start, end)
		const span = `…${before}𜱭${badText}𜱫${after}…`

		messages.push(
			`- ${start}:${end} (${JSON.stringify(span)}): ${lint.lint_kind_pretty()}: ${lint.message()}`,
		)

		if (lint.suggestions().length !== 0) {
			messages.push('  Consider:')

			for (const suggestion of lint.suggestions()) {
				switch (suggestion.kind()) {
					case harper.SuggestionKind.Remove:
						messages.push(`   - Remove: "${lint.get_problem_text()}"`)
						break
					case harper.SuggestionKind.InsertAfter:
						messages.push(
							`   - After "${lint.get_problem_text()}", insert "${suggestion.get_replacement_text()}"`,
						)
						break
					case harper.SuggestionKind.Replace:
						messages.push(
							`   - Replace: "${lint.get_problem_text()}" with "${suggestion.get_replacement_text()}"`,
						)
						break
				}
			}
		}
	}

	return messages
}
