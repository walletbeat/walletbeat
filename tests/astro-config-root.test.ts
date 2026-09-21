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

/** Absolute path to the `src/utils/codebase.astro.ts` module. */
function resolveAstroUtilModulePath(): string {
	return path.join(REPO_ROOT, 'src', 'utils', 'codebase.astro.ts')
}

/**
 * Run `getAstroBuildTimeRepositoryRoot()` in a `tsx` subprocess with the given
 * working directory, returning the resolved repository root.
 */
async function getAstroBuildTimeRootFromCwd(cwd: string): Promise<string> {
	const tsxBin = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
	const script = `
import { getAstroBuildTimeRepositoryRoot } from ${JSON.stringify(resolveAstroUtilModulePath())};
process.stdout.write(getAstroBuildTimeRepositoryRoot());
`
	const result = await execFileAsync(tsxBin, ['--eval', script], { cwd })

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
