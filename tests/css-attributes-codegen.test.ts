import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	generateCssAttributesDts,
	generateWalletbeatHtmlDataJson,
} from '@/styles/generate/css-attributes-codegen-lib'

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
})
