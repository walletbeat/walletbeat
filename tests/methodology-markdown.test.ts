import { describe, expect, it } from 'vitest'

import { attributeTree } from '@/schema/attribute-groups'
import { methodologyPageMarkdown } from '@/utils/methodology-markdown'

import { assertValidMarkdown } from './utils/assert-valid-markdown'
import { grammarLint, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

const SITE_URL = 'http://localhost:4321'

describe('methodologyPageMarkdown', () => {
	const md = methodologyPageMarkdown(SITE_URL)

	it('produces non-empty output', () => {
		expect(md.length).toBeGreaterThan(100)
	})

	it('contains the methodology title', () => {
		expect(md).toContain('Walletbeat Methodology')
	})

	it('contains the site URL', () => {
		expect(md).toContain(SITE_URL)
	})

	it('has no unresolved template placeholders', () => {
		expect(md).not.toMatch(/\{\{[^}]+\}\}/)
	})

	it('has no accidental object-to-string coercion', () => {
		expect(md).not.toContain('[object Object]')
	})

	it('contains each attribute group heading', () => {
		for (const group of Object.values(attributeTree)) {
			expect(md).toContain(`## ${group.displayName}`)
		}
	})

	it('contains each attribute heading', () => {
		for (const group of Object.values(attributeTree)) {
			for (const attribute of Object.values(group.attributes)) {
				expect(md).toContain(`### ${attribute.displayName}`)
			}
		}
	})

	it('contains standard subsection headings', () => {
		// "Why" section: either "Why it matters" (complex wording) or "Why X matters" (simple wording)
		expect(md).toMatch(/#### Why .+ matters/)
		// "How is evaluated" section: wording-derived, e.g. "How is X evaluated?" or "How is a wallet's X evaluated?"
		expect(md).toMatch(/#### How is .+ evaluated\?/)
		expect(md).toContain('#### Rating scale')
	})

	it('contains rating system labels', () => {
		expect(md).toContain('PASS')
		expect(md).toContain('FAIL')
		expect(md).toContain('UNRATED')
		expect(md).toContain('EXEMPT')
	})

	it('passes harper.js grammar check', async () => {
		await grammarLint(md, { language: 'markdown' })
	}, 15_000)

	it('produces valid markdown', async () => {
		await assertValidMarkdown(md)
	})
})
