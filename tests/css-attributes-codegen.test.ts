import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	generateCssAttributesDts,
	generateWalletbeatHtmlDataJson,
} from '@/styles/generate/css-attributes-codegen-lib'
import { parseCssAttributes } from '@/styles/generate/css-attributes-generator-shared'

import { getRepositoryRoot } from './utils/codebase'

describe('css-attributes codegen', () => {
	const repoRoot = getRepositoryRoot()
	const cssPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.css')
	const dtsPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.d.ts')
	const htmlDataPath = path.join(repoRoot, '.vscode', 'walletbeat.css-attributes.json')

	it('src/styles/css-attributes.d.ts matches css-attributes.css', async () => {
		const css = (await fs.readFile(cssPath, 'utf8')).replaceAll('\r\n', '\n')
		const onDisk = (await fs.readFile(dtsPath, 'utf8')).replaceAll('\r\n', '\n')

		expect(generateCssAttributesDts(css)).toBe(onDisk)
	})

	it('.vscode/walletbeat.css-attributes.json matches css-attributes.css', async () => {
		const css = (await fs.readFile(cssPath, 'utf8')).replaceAll('\r\n', '\n')
		const onDisk = (await fs.readFile(htmlDataPath, 'utf8')).replaceAll('\r\n', '\n')

		expect(generateWalletbeatHtmlDataJson(css)).toBe(onDisk)
	})

	it('includes sibling token rules without inventing undocumented attributes', () => {
		const entries = parseCssAttributes(`
/** Column child. */
[data-column-item~="flexible"] { flex: 1; }
[data-column-item~="basis-1"] { flex-basis: 16ch; }
[data-column-item~="end"] { align-self: end; }
[data-undocumented~="ignored"] { color: red; }
`)

		expect([...(entries.get('data-column-item')?.values ?? [])].sort()).toEqual([
			'basis-1',
			'end',
			'flexible',
		])
		expect(entries.has('data-undocumented')).toBe(false)
	})

	it('keeps nested documentation owned by its documented selector', () => {
		const entries = parseCssAttributes(`
/**
 * ## [data-parent]
 * Parent documentation.
 */
[data-parent] {
		/**
		 * ## [data-child]
		 * Child documentation.
		 */
		[data-child] { color: red; }
		[data-undocumented] { color: blue; }
	}
`)

		expect(entries.get('data-child')?.docMarkdown).toContain('Child documentation.')
		expect(entries.get('data-child')?.docMarkdown).not.toContain('Parent documentation.')
		expect(entries.has('data-undocumented')).toBe(false)
	})

	it('keeps the documented owner across property registrations', () => {
		const entries = parseCssAttributes(`
/**
 * ## [data-column]
 * Column documentation.
 */
@property --example { syntax: '<length>'; inherits: true; initial-value: 0px; }
[data-column] { display: block; }
[data-column~="start"] { align-items: start; }
`)

		expect(entries.get('data-column')?.docMarkdown).toContain('Column documentation.')
		expect([...(entries.get('data-column')?.values ?? [])]).toEqual(['start'])
	})
})
