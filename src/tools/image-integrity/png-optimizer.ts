import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { cac } from 'cac'

import {
	CodebaseEntryType,
	crawlCodebase,
	getRepositoryRoot,
	GitIgnoredFiles,
} from '@/utils/codebase'

import { hasSamePixels, isWorthRecompressing, recompressPng } from './png-optimizer-lib'

/**
 * Losslessly recompress PNG files in place.
 *
 * Usage: `pnpm tsx src/tools/image-integrity/png-optimizer.ts [file.png ...]`
 *
 * With no arguments, every PNG in the repository is processed. A file is only
 * rewritten when the recompressed version saves enough to fail the
 * `png-optimized` image integrity test (see `isWorthRecompressing`) and
 * decodes to exactly the same pixels. File names and formats never change.
 */
const repositoryRoot = getRepositoryRoot()

async function repositoryPngFiles(): Promise<string[]> {
	const files: string[] = []

	await crawlCodebase({
		ignore: ['.git', await GitIgnoredFiles()],
		baseTraversalFn: entry => {
			if (
				entry.type === CodebaseEntryType.FILE &&
				path.extname(entry.path).toLowerCase() === '.png'
			) {
				files.push(entry.path)
			}
		},
	})

	return files.sort()
}

const { args } = cac('png-optimizer').parse()
const files = args.length > 0 ? [...args] : await repositoryPngFiles()
let totalBefore = 0
let totalAfter = 0
let rewritten = 0

for (const file of files) {
	const filePath = path.resolve(repositoryRoot, file)
	const original = await fs.readFile(filePath)
	const recompressed = await recompressPng(original)

	totalBefore += original.length

	if (!isWorthRecompressing(original.length, recompressed.length)) {
		totalAfter += original.length
		continue
	}

	if (!(await hasSamePixels(original, recompressed))) {
		throw new Error(`Recompressing ${file} changed its pixels; leaving it untouched.`)
	}

	await fs.writeFile(filePath, recompressed)
	totalAfter += recompressed.length
	rewritten++
	process.stdout.write(
		`${file}: ${original.length} -> ${recompressed.length} bytes (-${original.length - recompressed.length})\n`,
	)
}

process.stdout.write(
	`\n${rewritten} of ${files.length} file(s) rewritten: ${totalBefore} -> ${totalAfter} bytes (-${totalBefore - totalAfter})\n`,
)
