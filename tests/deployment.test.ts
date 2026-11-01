import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe.each(['true', 'false'])('ENS deployment (skip Helios: %s)', skipHelios => {
	it.each([
		{ before: 'mismatch', after: 'match', write: 'submitted', success: false, writes: 1 },
		{ before: 'mismatch', after: 'match', write: 'wrapper-failure', success: false, writes: 1 },
		{ before: 'match', after: 'error', write: 'failure', success: true, writes: 0 },
		{ before: 'mismatch', after: 'match', write: 'success', success: true, writes: 1 },
		{ before: 'error', after: 'match', write: 'success', success: true, writes: 1 },
		{ before: 'mismatch', after: 'match', write: 'failure', success: true, writes: 7 },
		{ before: 'mismatch', after: 'mismatch', write: 'failure', success: false, writes: 7 },
		{ before: 'mismatch', after: 'mismatch', write: 'success', success: false, writes: 1 },
		{ before: 'error', after: 'error', write: 'success', success: false, writes: 1 },
		{ before: 'failed-match', after: 'failed-match', write: 'success', success: false, writes: 1 },
		{ before: 'wrong', after: 'wrong', write: 'success', success: false, writes: 1 },
		{ before: 'malformed', after: 'malformed', write: 'success', success: false, writes: 1 },
	])('requires verified state: $before / $write / $after', scenario => {
		const directory = mkdtempSync(join(tmpdir(), 'ens-deployment-'))
		const calls = join(directory, 'calls')

		try {
			copyFileSync(resolve('tests/fixtures/deployment-pnpm.sh'), join(directory, 'pnpm'))
			writeFileSync(join(directory, 'shuf'), '#!/bin/bash\ncat\n', { mode: 0o755 })
			writeFileSync(calls, '')
			const result = spawnSync('bash', [resolve('deploy/update-ens.sh')], {
				encoding: 'utf8',
				timeout: 10000,
				env: {
					...process.env,
					PATH: `${directory}${delimiter}${process.env.PATH ?? ''}`,
					ENS_DOMAIN: 'beta.walletbeat.eth',
					DEPLOY_DIRECTORY: directory,
					OMNIPIN_PK: 'test-only',
					SKIP_HELIOS: skipHelios,
					DEBUG: '',
					CALL_LOG: calls,
					WRITE_MARKER: join(directory, 'written'),
					BEFORE_RESULT: scenario.before,
					AFTER_RESULT: scenario.after,
					WRITE_RESULT: scenario.write,
				},
			})

			expect(result.error).toBeUndefined()
			expect(result.status, result.stderr).toBe(
				scenario.success ? 0 : ['submitted', 'wrapper-failure'].includes(scenario.write) ? 2 : 1,
			)
			expect(
				readFileSync(calls, 'utf8')
					.split('\n')
					.filter(call => call === 'write'),
			).toHaveLength(scenario.writes)
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})
})
