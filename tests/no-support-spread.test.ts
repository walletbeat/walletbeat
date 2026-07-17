import { describe, expect, it } from 'vitest'

import { commonExclusions, getCodebaseIndex, type IndexedFile } from './utils/codebase'

interface BannedSpread {
	name: string
	regexp: RegExp
	explanation: string
}

const bannedSpreads: BannedSpread[] = [
	{
		name: '...featureSupported',
		regexp: /\.\.\.\s*featureSupported\b/,
		explanation:
			'Do not spread `featureSupported` to build a supported feature object; use the `supported({ ... })` helper from `@/schema/features/support` instead.',
	},
	{
		name: '...notSupported',
		regexp: /\.\.\.\s*notSupported\b/,
		explanation:
			'Do not spread `notSupported` to build an unsupported feature object; use the `notSupportedWithRef({ ... })` helpers from `@/schema/features/support` instead.',
	},
]

async function codebaseBannedSpreadIndex(): Promise<Map<string, Set<string>>> {
	const bannedMap = new Map<string, Set<string>>()

	await getCodebaseIndex({
		indexFn: (_, fileContents: string): { matchedSpreads: Set<string> } => {
			const matched = new Set<string>()

			for (const bannedSpread of bannedSpreads) {
				if (bannedSpread.regexp.test(fileContents)) {
					matched.add(bannedSpread.name)
				}
			}

			return { matchedSpreads: matched }
		},
		aggregateFn: (fileMatch: IndexedFile<{ matchedSpreads: Set<string> }>) => {
			for (const bannedSpreadName of fileMatch.matchedSpreads.keys()) {
				let fileSet = bannedMap.get(bannedSpreadName)

				if (fileSet === undefined) {
					fileSet = new Set<string>()
					bannedMap.set(bannedSpreadName, fileSet)
				}

				fileSet.add(fileMatch.filePath)
			}
		},
		ignore: commonExclusions.concat([
			'src/schema/features/support.ts',

			// Exclude test files
			/\.test\.ts$/i,
		]),
	})

	return bannedMap
}

describe('no spreading of support constants', async () => {
	const index = await codebaseBannedSpreadIndex()

	for (const banned of bannedSpreads) {
		it(`does not spread ${banned.name}`, () => {
			const fileMatches = index.get(banned.name)

			expect(fileMatches).toSatisfy(
				val => val === undefined,
				`Found "${banned.name}" spread in files:\n${
					fileMatches === undefined
						? ''
						: Array.from(fileMatches.keys())
								.map(filePath => `- ${filePath}`)
								.join('\n')
				}\n${banned.explanation}`,
			)
		})
	}
})
