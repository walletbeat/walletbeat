import * as path from 'path'
import { fileURLToPath } from 'url'

import { getErrorMessage } from '@/types/errors'

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
	outputPath: path.join(srcRoot, 'resources', 'docs', 'features', 'features.md'),
	srcRoot,
	quiet: args.includes('--quiet'),
	test: args.includes('--test'),
}

try {
	await featuresMarkdownUpdate(config)
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
