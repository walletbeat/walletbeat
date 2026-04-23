import * as fs from 'fs/promises'
import * as path from 'path'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { getErrorMessage } from '@/types/errors'

import { generateWalletbeatHtmlDataJson } from './css-attributes-codegen-lib'

const repoRoot = getRepositoryRoot()
const cssAttributesCssPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.css')
const outputPath = path.join(repoRoot, '.vscode', 'walletbeat.css-attributes.json')

const main = async (): Promise<void> => {
	const css = await fs.readFile(cssAttributesCssPath, 'utf8')
	const out = generateWalletbeatHtmlDataJson(css)
	let existingContent: string | undefined

	try {
		existingContent = await fs.readFile(outputPath, 'utf-8')
	} catch {
		// File doesn't exist yet, skip the comparison
	}

	if (existingContent !== undefined && out.trim() === existingContent.trim()) {
		// Already up to date
		return
	}

	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, out, 'utf8')
	process.stderr.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

try {
	await main()
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
