import * as fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import { wbiconsIDs, wbiconsMarkers } from '@/styles/wbicons'
import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from '@/utils/codebase'

const distDir = path.join(getRepositoryRoot(), 'dist')

describe('wbicons integrity', () => {
	it('every wbicon `data-icon` value resolves to exactly one icon ID', async () => {
		const htmlFiles: string[] = []

		await crawlCodebase({
			root: distDir,
			ignore: [],
			baseTraversalFn: entry => {
				if (entry.type === CodebaseEntryType.FILE && entry.path.endsWith('.html')) {
					htmlFiles.push(entry.path)
				}
			},
		})

		const violations: string[] = []
		let foundValid = false

		for (const relativePath of htmlFiles) {
			const html = fs.readFileSync(path.join(distDir, relativePath), 'utf8')
			const dataIconPattern = /data-icon="([^"]*)"/g
			let match: RegExpExecArray | null

			while ((match = dataIconPattern.exec(html)) !== null) {
				const value = match[1]
				const tokens = value.split(' ')

				if (!tokens.some(token => wbiconsMarkers.has(token))) {
					continue
				}

				const iconIDTokens = tokens
					.filter(token => token !== '' && !wbiconsMarkers.has(token))
					.filter(token => (wbiconsIDs as Set<string>).has(token))

				if (iconIDTokens.length === 0) {
					violations.push(`${relativePath}: data-icon="${value}" has no valid icon ID token(s)`)
				} else if (iconIDTokens.length > 1) {
					violations.push(
						`${relativePath}: data-icon="${value}" resolves to ${iconIDTokens.length} icon ID token(s): [${iconIDTokens.join(', ')}]`,
					)
				} else {
					foundValid = true
				}
			}
		}

		expect(foundValid, 'Found no valid data-icon values').toBeTruthy()
		expect(
			violations,
			`Found ${violations.length} wbicon data-icon value(s) without valid icon ID:\n\n${violations.join('\n')}`,
		).toEqual([])
	})
})
