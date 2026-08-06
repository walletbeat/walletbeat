/**
 * Standalone script: run a wallet's `wallet-data-collection.ts` generator
 * (see `convert-to-feature-data.ts`) and write its output to a JSON file
 * that feature data files can import synchronously, instead of having to
 * write `privacy.dataCollection` out by hand.
 *
 * Usage:
 *   tsx src/tools/wallet-data-collection/generate-data-collection.ts --id=rainbow [--type=software]
 *
 * Writes to:
 *   data/{type}-wallets/collection/{id}/{id}.dataCollection.generated.json
 */
import fs from 'fs'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

const args = Object.fromEntries(
	process.argv.slice(2).map(arg => {
		const match = /^--([^=]+)=(.*)$/.exec(arg)

		if (match === null) {
			throw new Error(`Invalid argument: ${arg}`)
		}

		return [match[1], match[2]]
	}),
)

const id = args.id

if (id === undefined || id === '') {
	throw new Error('Missing required --id=<walletId> argument')
}

const type = args.type ?? 'software'

const repoDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const collectionDir = path.join(repoDir, 'data', `${type}-wallets`, 'collection', id)
const generatorPath = path.join(collectionDir, 'wallet-data-collection.ts')

if (!fs.existsSync(generatorPath)) {
	throw new Error(`No generator found at ${generatorPath}`)
}

function isDataCollectionGeneratorModule(
	value: unknown,
): value is { default: (options: { strict?: boolean }) => Promise<unknown> } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'default' in value &&
		typeof value.default === 'function'
	)
}

const generatorModule: unknown = await import(generatorPath)

if (!isDataCollectionGeneratorModule(generatorModule)) {
	throw new Error(`${generatorPath} does not have a callable default export`)
}

const result = await generatorModule.default({})

const outPath = path.join(collectionDir, `${id}.dataCollection.generated.json`)

fs.writeFileSync(outPath, `${JSON.stringify(result, null, '\t')}\n`)
