import { describe, expect, it } from 'vitest'

import { collapseToSingleLine } from '@/utils/markdown-utils'

describe('collapseToSingleLine', () => {
	it('collapses whitespace and trims', () => {
		expect(collapseToSingleLine('  foo   bar  \n  baz  ')).toBe('foo bar baz')
	})

	it('throws on triple-backtick code blocks', () => {
		expect(() => collapseToSingleLine('text with ```code``` here')).toThrow(
			'collapseToSingleLine does not support triple-backtick code blocks',
		)
	})

	it('throws on blockquote lines', () => {
		expect(() => collapseToSingleLine('> quoted line')).toThrow(
			'collapseToSingleLine does not support blockquote lines',
		)
		expect(() => collapseToSingleLine('normal line\n> blockquote')).toThrow(
			'collapseToSingleLine does not support blockquote lines',
		)
	})
})
