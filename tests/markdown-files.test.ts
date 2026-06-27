import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { extractMarkdownLinks } from '@/utils/markdown-utils'

import {
	CodebaseEntryType,
	commonExclusions,
	crawlCodebase,
	getRepositoryRoot,
} from './utils/codebase'
import { grammarLint, grammarLintMessages } from './utils/grammar'

/**
 * Markdown files that are allowed to fail grammar checks.
 * Add entries here with a comment explaining why.
 * When fixing a file, remove it from this list.
 */
const GRAMMAR_CHECK_WHITELIST: Set<string> = new Set([
	// Seed of all files that currently fail grammar checks.
	// These should be fixed and removed from this list over time.
	'AGENTS.md',
	'.agents/skills/wallet-create/SKILL.md',
	'.agents/skills/wallet-update/SKILL.md',
	'resources/docs/features/features.md',
	'resources/files/community-partner-applications/2026-dappcon.md',
	'resources/talks/2026-04-27-giveth/project-showcase-brief.md',
	'resources/talks/2026-05-giveth/2026-05-13-giveth.md',
	'resources/talks/2026-05-giveth/project-showcase-brief.md',
	'src/tools/markdown-imports-autogen/SPEC.md',
	'src/tools/wallet-data-collection/README.md',
	'public/references/wallets/base-app/2026-02-23-questionnaire.md',
	'public/references/wallets/rainbow/2026-04-22-questionnaire.md',
	'resources/files/grants-applications/2026/octant.md',
	'resources/talks/2026-06-eth-berlin/brew-berlin/proposal.md',
	'resources/talks/2026-06-eth-berlin/dappcon/outline.md',
	'resources/talks/2026-06-eth-berlin/dappcon/proposal.md',
	'resources/talks/2026-06-eth-berlin/ethereum-day/proposal.md',
	'resources/talks/2026-06-eth-berlin/neocypherpunk-summit/outline.md',
	'resources/talks/2026-06-eth-berlin/neocypherpunk-summit/proposal.md',
	'resources/files/social-media/threads/2026-01-13 - Walkaway Test/thread.md',
	'resources/files/social-media/threads/2026-01-14 - Zeus Wallet/thread.md',
	'resources/files/social-media/threads/2026-01-29 - Bitget Wallet/thread.md',
	'resources/files/social-media/threads/2026-02-06 - January Monthly Update/thread.md',
	'resources/files/social-media/threads/2026-01-30 - Okx Wallet/thread.md',
	'resources/files/social-media/threads/2026-04-08 - Duress Resistance/thread.md',
	'resources/files/social-media/threads/2026-04-22 - Security Best Practices/thread.md',
	'resources/files/social-media/threads/2026-05-15 - Transaction legibility ERC-8213 ERC-7730/thread.md',
])

describe('markdown files', () => {
	const allMarkdownFiles: string[] = []

	beforeAll(async () => {
		await crawlCodebase({
			ignore: commonExclusions,
			baseTraversalFn: entry => {
				if (entry.type === CodebaseEntryType.FILE && entry.path.endsWith('.md')) {
					allMarkdownFiles.push(entry.path)
				}
			},
		})
	})

	it('found at least one markdown file', () => {
		expect(allMarkdownFiles.length).toBeGreaterThan(0)
	})

	for (const filePath of allMarkdownFiles) {
		describe(filePath, async () => {
			const absPath = path.join(getRepositoryRoot(), filePath)
			const content = await fs.readFile(absPath, 'utf-8')

			if (!GRAMMAR_CHECK_WHITELIST.has(filePath)) {
				it('has correct grammar', async () => {
					await grammarLint(content, { language: 'markdown' })
				})
			}

			it('has correct links', async () => {
				const links = extractMarkdownLinks(content)

				for (const link of links) {
					const { url, line } = link

					// Skip full links with protocols.
					if (
						url.startsWith('https:') ||
						url.startsWith('http:') ||
						url.startsWith('mailto:') ||
						url.startsWith('tel:') ||
						url.startsWith('#') ||
						url.startsWith('//')
					) {
						continue
					}

					// For relative/absolute paths, check they point to a valid file.
					// Resolve relative paths against the source file's directory.
					const sourceDir = path.dirname(filePath)

					let resolvedPath: string

					if (url.startsWith('/')) {
						// Absolute path relative to repo root
						resolvedPath = path.normalize(url.replace(/^\//, '')).replace(/^\/?/, '')
					} else {
						// Relative path
						resolvedPath = path.normalize(path.join(sourceDir, url)).replace(/^\/?/, '')
					}

					// Normalize to forward slashes
					resolvedPath = resolvedPath.split(path.sep).join('/')

					// Check the resolved path doesn't escape the repository root.
					expect(resolvedPath).toSatisfy(
						(p: string) => !p.startsWith('..'),
						`Link to ${url} (line ${line}) escapes repository root directory`,
					)

					// Check the file exists (it might be a .md, .astro, .html, etc., or a directory).
					// We strip query params and hash fragments for the file check.
					const cleanPath = resolvedPath.split(/[?#]/)[0]

					// Check if file exists directly or as a directory.
					const absResolved = path.join(getRepositoryRoot(), cleanPath)
					let exists = false

					try {
						const stat = await fs.stat(absResolved)

						if (stat.isFile()) {
							exists = true
						} else if (stat.isDirectory()) {
							// A directory is valid, it may have index files or render as a listing.
							exists = true
						}
					} catch {
						// File doesn't exist
					}

					expect(exists).toSatisfy(
						v => v === true,
						`Path '${resolvedPath}' (linked on line ${line}) does not exist in the repository or is not a valid file`,
					)
				}
			})
		})
	}

	describe('whitelist only contains files that actually fail', () => {
		for (const whitelistedPath of GRAMMAR_CHECK_WHITELIST) {
			describe(whitelistedPath, () => {
				it('fails grammar check as it is on the grammar-check exclusion list', async () => {
					const absPath = path.join(getRepositoryRoot(), whitelistedPath)
					const content = await fs.readFile(absPath, 'utf-8')
					const message = await grammarLintMessages(content, { language: 'markdown' })

					expect(message).toSatisfy(m => Array.isArray(m) && m.length > 0, message.join('\n'))
				})
			})
		}
	})
})
