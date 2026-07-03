import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import { shouldShield } from '@/middleware'
import {
	CodebaseEntryType,
	commonExclusions,
	crawlCodebase,
	getRepositoryRoot,
} from '@/tests/utils/codebase'

describe('astro-middleware shouldShield', async () => {
	const publicFiles: string[] = []

	await crawlCodebase({
		root: path.join(getRepositoryRoot(), 'public'),
		ignore: commonExclusions,
		baseTraversalFn: entry => {
			if (entry.type === CodebaseEntryType.FILE) {
				publicFiles.push('/public/' + entry.path)
			}
		},
	})

	it('found at least one file in public/', () => {
		expect(publicFiles.length).toBeGreaterThan(0)
	})

	it('shouldShield returns non-null for all public/ files', () => {
		const failures: string[] = []

		for (const filePath of publicFiles) {
			const result = shouldShield(filePath)

			if (result === null) {
				failures.push(filePath)
			}
		}

		if (failures.length > 0) {
			const sorted = failures.sort()

			expect(
				'',
				`shouldShield returned null for ${failures.length} public/ file(s). Add the extension(s) to \`shouldShieldByExtension\`:\n\n  ${sorted.join('\n  ')}`,
			).toBeUndefined()
		}
	})
})
