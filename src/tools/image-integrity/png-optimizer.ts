import { execFile } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { promisify } from 'node:util'

import { getRepositoryRoot } from '@/utils/codebase'

import { hasSamePixels, isWorthRecompressing, recompressPng } from './png-optimizer-lib'

/**
 * Losslessly recompress PNG files in place.
 *
 * Usage: `pnpm tsx src/tools/image-integrity/png-optimizer.ts [file.png ...]`
 *
 * With no arguments, every PNG tracked by git is processed. A file is only
 * rewritten when the recompressed version saves enough to fail the
 * `png-optimized` image integrity test (see `isWorthRecompressing`) and
 * decodes to exactly the same pixels. Smaller savings are not worth adding a
 * new copy of the file to the git history. File names and formats never
 * change.
 */
const execFileAsync = promisify(execFile)
const repositoryRoot = getRepositoryRoot()

async function trackedPngFiles(): Promise<string[]> {
	const { stdout } = await execFileAsync('git', ['ls-files', '-z', '*.png', '*.PNG'], {
		cwd: repositoryRoot,
		maxBuffer: 64 * 1024 * 1024,
	})

	return stdout.split('\0').filter(file => file !== '')
}

const args = process.argv.slice(2)
const files = args.length > 0 ? args : await trackedPngFiles()
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
