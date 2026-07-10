import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

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
 */
const GRAMMAR_CHECK_WHITELIST: Set<string> = new Set([
	'governance/decisions/2025/walletbeat-hosting.md',
	'governance/decisions/2026/1ts-security-benchmark/discussion-archive/wallet-security-benchmark-discussion.md',
	'governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round/proposal/proposal.md',
	'governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round/response/2025-03-21-ef-response.md',
	'governance/grants/2026-04-giveth-ethereum-security-qf-round/project-info.md',
	'governance/grants/2025-07-ethereum-foundation-esp-grant-proposal/proposal.md',
	'governance/grants/2025-10-gitcoin-grants-privacy-round/project-info.md',
	'governance/roadmap/2025/2025-roadmap.md',
	'governance/treasury/treasury-transparency.md',
	'public/references/wallets/base-app/2026-02-23-questionnaire.md',
	'public/references/wallets/rainbow/2026-04-22-questionnaire.md',
	'resources/docs/features/features.md',
	'resources/files/community-partner-applications/2026-dappcon.md',
	'resources/talks/2026-06-eth-berlin/brew-berlin/proposal.md',
	'resources/talks/2026-06-eth-berlin/dappcon/outline.md',
	'resources/talks/2026-06-eth-berlin/dappcon/proposal.md',
	'resources/talks/2026-06-eth-berlin/ethereum-day/outline.md',
	'resources/talks/2026-06-eth-berlin/ethereum-day/proposal.md',
	'resources/talks/2026-06-eth-berlin/neocypherpunk-summit/outline.md',
	'resources/talks/2026-06-eth-berlin/neocypherpunk-summit/proposal.md',
	'resources/files/grants-applications/2026/octant.md',
	'resources/files/social-media/threads/2026-01-13 - Walkaway Test/thread.md',
	'resources/files/social-media/threads/2026-01-14 - Zeus Wallet/thread.md',
	'resources/files/social-media/threads/2026-01-29 - Bitget Wallet/thread.md',
	'resources/files/social-media/threads/2026-01-30 - Okx Wallet/thread.md',
	'resources/files/social-media/threads/2026-04-22 - Security Best Practices/thread.md',
	'resources/files/social-media/threads/2026-05-15 - Transaction legibility ERC-8213 ERC-7730/thread.md',
	'resources/files/social-media/threads/2026-07-09 - Orderflow Transparency/thread.md',
])

/**
 * Markdown entries matching this pattern are excluded from grammar checks.
 */
const GRAMMAR_CHECK_EXCLUDED: RegExp[] = [/^governance\/minutes\/.*/]

describe('markdown files', async () => {
	const allMarkdownFiles: string[] = []

	await crawlCodebase({
		ignore: commonExclusions,
		baseTraversalFn: entry => {
			if (entry.type === CodebaseEntryType.FILE && entry.path.endsWith('.md')) {
				allMarkdownFiles.push(entry.path)
			}
		},
	})

	it('found at least one markdown file', () => {
		expect(allMarkdownFiles.length).toBeGreaterThan(0)
	})

	for (const filePath of allMarkdownFiles) {
		describe(filePath, async () => {
			const absPath = path.join(getRepositoryRoot(), filePath)
			const content = await fs.readFile(absPath, 'utf-8')

			if (
				!GRAMMAR_CHECK_WHITELIST.has(filePath) &&
				GRAMMAR_CHECK_EXCLUDED.every(r => r.exec(filePath) === null)
			) {
				it('has correct grammar', async () => {
					await grammarLint(content, { language: 'markdown' })
				})
			}

			it('has correct links', async () => {
				const links = extractMarkdownLinks(content)

				for (const { url, line } of links) {
					// Skip full links with protocols.
					if (
						url.startsWith('data:') ||
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
			describe(
				whitelistedPath,
				() => {
					it('fails grammar check as it is on the grammar-check exclusion list', async () => {
						const absPath = path.join(getRepositoryRoot(), whitelistedPath)
						const content = await fs.readFile(absPath, 'utf-8')
						const message = await grammarLintMessages(content, { language: 'markdown' })

						expect(message).toSatisfy(m => Array.isArray(m) && m.length > 0, message.join('\n'))
					})
				},
				15000,
			)
		}
	})
})
