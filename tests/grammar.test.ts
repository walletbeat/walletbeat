import { describe, expect, it } from 'vitest'

import { grammarLintMessages, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

describe('grammarLintMessages', () => {
	it.each(['You should backup your wallet.', 'You should backup password files.'])(
		'flags "backup" used as a verb in %j',
		async text => {
			expect(await grammarLintMessages(text, { language: 'markdown' })).not.toEqual([])
		},
	)

	it.each([
		'Use the value:String parameter.',
		'It depends on The user who holds the key.',
		'Open the dapp settings.',
		'The on-chain registry is public.',
	])('reports a site-convention diagnostic for %j', async text => {
		const messages = await grammarLintMessages(text, { language: 'markdown' })

		expect(messages.some(message => message.includes(': Site convention:'))).toBe(true)
	})
})
