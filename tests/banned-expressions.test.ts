import { describe, expect, it } from 'vitest'

import { commonExclusions, getCodebaseIndex, type IndexedFile } from './utils/codebase'

interface BannedExpression {
	name: string
	regexp: RegExp
	explanation: string
	/** Exact match text that the regexp may capture but that should not count as a violation. */
	allowedExact?: string[]
}

const bannedExpressions: BannedExpression[] = [
	{
		name: 'third party',
		regexp: /\bthird([-_ ]|\s*)?part(y|ies)\b/i,
		explanation:
			'To distinguish between "third-party" as in "other than the wallet developer" and "non-local", use another term. Consider using "external" or "external provider" when talking about a network-level "third party", or "independent" when talking about a party different from the wallet developer.',
	},
	{
		name: 'incorrect Walletbeat casing',
		regexp: /\bwalletbeat\b/i,
		allowedExact: ['Walletbeat', 'walletbeat'],
		explanation:
			'The project name is "Walletbeat" (lowercase "b") or "walletbeat" in URLs and identifiers, not "WalletBeat" or other casings. cSpell does not catch this because its dictionary match is case-insensitive.',
	},
]

interface FileBannedExpressionNames {
	matchedExprs: Set<string>
}

async function codebaseBannedExpressionIndex(): Promise<Map<string, Set<string>>> {
	const bannedMap = new Map<string, Set<string>>()

	await getCodebaseIndex({
		indexFn: (_, fileContents: string): FileBannedExpressionNames => {
			const matched = new Set<string>()

			const urlRegex = /https?:\/\/[^\s'"`<>]+/gi

			const urls: { start: number; end: number }[] = []
			let matchUrl

			while ((matchUrl = urlRegex.exec(fileContents)) !== null) {
				urls.push({ start: matchUrl.index, end: matchUrl.index + matchUrl[0].length })
			}

			function isInsideUrl(pos: number): boolean {
				return urls.some(url => pos >= url.start && pos < url.end)
			}

			for (const bannedExpr of bannedExpressions) {
				const flags = bannedExpr.regexp.flags.includes('g')
					? bannedExpr.regexp.flags
					: `${bannedExpr.regexp.flags}g`
				const regexp = new RegExp(bannedExpr.regexp.source, flags)
				let match

				while ((match = regexp.exec(fileContents)) !== null) {
					if (isInsideUrl(match.index)) {
						continue
					}

					const matchedText = match[0]

					if (matchedText === undefined) {
						continue
					}

					if (
						bannedExpr.allowedExact !== undefined &&
						bannedExpr.allowedExact.includes(matchedText)
					) {
						continue
					}

					matched.add(bannedExpr.name)
					break
				}
			}

			return { matchedExprs: matched }
		},
		aggregateFn: (fileMatch: IndexedFile<FileBannedExpressionNames>) => {
			for (const bannedExprName of fileMatch.matchedExprs.keys()) {
				let fileSet = bannedMap.get(bannedExprName)

				if (fileSet === undefined) {
					fileSet = new Set<string>()
					bannedMap.set(bannedExprName, fileSet)
				}

				fileSet.add(fileMatch.filePath)
			}
		},
		ignore: commonExclusions.concat([
			// This file mentions banned expressions by design.
			'tests/banned-expressions.test.ts',

			// Exclude governance documents (meeting transcripts etc).
			/^governance\//i,
		]),
	})

	return bannedMap
}

describe('banned expressions', async () => {
	const index = await codebaseBannedExpressionIndex()

	for (const banned of bannedExpressions) {
		it(`does not contain the expression: "${banned.name}"`, () => {
			const fileMatches = index.get(banned.name)

			expect(fileMatches).toSatisfy(
				val => val === undefined,
				`Expression "${banned.name}" found in files:\n${
					fileMatches === undefined
						? ''
						: Array.from(fileMatches.keys())
								.map(path => `- ${path}`)
								.join('\n')
				}\n${banned.explanation}`,
			)
		})
	}
})
