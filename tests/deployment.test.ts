import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe.each(['true', 'false'])('ENS deployment (skip Helios: %s)', skipHelios => {
	it.each([
		{ write: 'success', status: 0, writes: 1 },
		{ write: 'failure', status: 1, writes: 7 },
		{ write: 'fallback', status: 0, writes: 2 },
		{ write: 'submitted', status: 2, writes: 1 },
		{ write: 'wrapper-failure', status: 2, writes: 1 },
	])('contains retries: $write', scenario => {
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
					WRITE_RESULT: scenario.write,
				},
			})

			expect(result.error).toBeUndefined()
			expect(result.status, result.stderr).toBe(scenario.status)
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
