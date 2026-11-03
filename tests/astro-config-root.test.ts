import { execFile } from 'node:child_process'
import * as path from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from '@/utils/codebase'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'

const execFileAsync = promisify(execFile)

/**
 * This test verifies that `getAstroBuildTimeRepositoryRoot` returns the same
 * directory as `getRepositoryRoot()` does.
 */

/** Absolute path to the repository root, derived from this test file's location. */
const REPO_ROOT = getRepositoryRoot()

/** File URL for the TypeScript loader module. */
const TSX_IMPORT = import.meta.resolve('tsx')

/**
 * Run `getAstroBuildTimeRepositoryRoot()` in a Node subprocess with the given
 * working directory, returning the resolved repository root.
 */
async function getAstroBuildTimeRootFromCwd(cwd: string): Promise<string> {
	const script = `
import { getAstroBuildTimeRepositoryRoot } from ${JSON.stringify(new URL('../src/utils/codebase.astro.ts', import.meta.url).href)};
process.stdout.write(getAstroBuildTimeRepositoryRoot());
`
	const result = await execFileAsync(
		process.execPath,
		['--import', TSX_IMPORT, '--input-type=module', '--eval', script],
		{ cwd },
	)

	return result.stdout.trim()
}

describe('getAstroBuildTimeRepositoryRoot', () => {
	it('returns the repository root when invoked from the repository root', () => {
		expect(path.resolve(getAstroBuildTimeRepositoryRoot())).toBe(path.resolve(REPO_ROOT))
	})

	it('returns the repository root when invoked from a subdirectory', async () => {
		const repoRoot = await getAstroBuildTimeRootFromCwd(path.join(REPO_ROOT, 'tests'))

		expect(repoRoot).not.toBe('')
		expect(path.resolve(repoRoot)).toBe(path.resolve(REPO_ROOT))
	})
})
