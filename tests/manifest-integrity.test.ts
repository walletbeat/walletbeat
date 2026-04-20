import { describe, expect, it } from 'vitest'

import { checkParsedManifests } from '@/tools/manifest-collector/manifest-checker'

import { getRepositoryRoot } from './utils/codebase'

describe('manifests', () => {
	it('has up-to-date parsed manifest files', async () => {
		const mismatches = await checkParsedManifests(getRepositoryRoot())

		if (mismatches.length > 0) {
			const details = mismatches
				.map(m => `  [${m.walletId}] ${m.parsedFile}: ${m.issue}`)
				.join('\n')

			throw new Error(
				`Parsed manifest files are out of date:\n${details}\n` +
					'Run `pnpm collect:manifests -- --all` to regenerate them.',
			)
		}

		expect(mismatches).toHaveLength(0)
	})
})
