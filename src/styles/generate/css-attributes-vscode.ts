import * as fs from 'fs/promises'
import * as path from 'path'

import { getRepositoryRoot } from '@/tests/utils/codebase'

import { generateWalletbeatHtmlDataJson } from './css-attributes-codegen-lib'

const repoRoot = getRepositoryRoot()
const cssAttributesCssPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.css')
const outputPath = path.join(repoRoot, '.vscode', 'walletbeat.css-attributes.json')

const main = async (): Promise<void> => {
	const css = await fs.readFile(cssAttributesCssPath, 'utf8')
	const out = generateWalletbeatHtmlDataJson(css)

	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, out, 'utf8')
	process.stdout.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

try {
	await main()
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
}
