import { expect, it } from 'vitest'

import { grammarLintMessages } from './utils/grammar'

it('distinguishes frontmatter identifiers from prose', async () => {
	const options = { language: 'markdown' as const }

	expect(
		await grammarLintMessages('---\nname: walletbeat-authoring\n---\n\n# Authoring\n', options),
	).toEqual([])

	for (const text of [
		'---\nname: authoring\ndescription: walletbeat\n---\n',
		'---\nname: authoring\n---\n\nwalletbeat\n',
	]) {
		expect((await grammarLintMessages(text, options)).join('\n')).toContain('deprecated')
	}
})
