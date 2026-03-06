import * as path from 'path'
import { fileURLToPath } from 'url'

import {
	type FeaturesMarkdownConfig,
	featuresMarkdownUpdate,
} from './features-markdown-generator-lib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const srcRoot = path.join(__dirname, '..', '..', '..')

const args = process.argv.slice(2)

const config: FeaturesMarkdownConfig = {
	featuresSrcFile: path.join(srcRoot, 'src', 'schema', 'features.ts'),
	featuresDir: path.join(srcRoot, 'src', 'schema', 'features'),
	outputPath: path.join(srcRoot, 'docs', 'features.md'),
	srcRoot,
	quiet: args.includes('--quiet'),
	test: args.includes('--test'),
}

try {
	await featuresMarkdownUpdate(config)
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
}
