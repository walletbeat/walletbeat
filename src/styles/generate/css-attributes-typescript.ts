import * as fs from 'fs/promises'
import * as path from 'path'

import { getRepositoryRoot } from '@/tests/utils/codebase'

import { generateCssAttributesDts } from './css-attributes-codegen-lib'

const repoRoot = getRepositoryRoot()
const cssAttributesCssPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.css')
const outputPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.d.ts')

const main = async (): Promise<void> => {
	const css = await fs.readFile(cssAttributesCssPath, 'utf8')
	const dtsContent = generateCssAttributesDts(css)

	await fs.writeFile(outputPath, dtsContent, 'utf8')
	process.stdout.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

try {
	await main()
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
}
