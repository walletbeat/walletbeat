import { existsSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import {
	collectAllRefs,
	type CollectedRef,
	type LooseReference,
	toFullyQualified,
} from '@/schema/reference'
import { CodebaseEntryType, crawlCodebase, GitIgnoredFiles } from '@/utils/codebase'

import { grammarLint, warmupHarperLinter } from './utils/grammar'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')

await warmupHarperLinter()

const WALLET_REFERENCES_DIR = 'public/references/wallets'

/**
 * Wallet questionnaire responses stored under `public/references/wallets/`.
 * These are kept even when no wallet ref cites them, so add new questionnaire
 * files here when you add them.
 */
const QUESTIONNAIRE_FILES: string[] = [
	'public/references/wallets/base-app/2026-02-23-questionnaire.md',
	'public/references/wallets/rainbow/2026-04-22-questionnaire.md',
]

describe('RepoFileReference', () => {
	describe('toFullyQualified with file references', () => {
		it('converts a file reference under public/ to a root-relative URL', () => {
			const ref: LooseReference = {
				file: 'public/questionnaires/example.pdf',
				label: 'Example document',
			}
			const result = toFullyQualified(ref)

			expect(result).toHaveLength(1)
			expect(result[0].urls[0].url).toBe('/questionnaires/example.pdf')
		})

		it('uses a custom label when provided', () => {
			const ref: LooseReference = {
				file: 'public/questionnaires/example.pdf',
				label: 'Intake Form Response',
			}
			const result = toFullyQualified(ref)

			expect(result[0].urls[0].label).toBe('Intake Form Response')
		})

		it('preserves explanation and lastRetrieved', () => {
			const ref: LooseReference = {
				file: 'public/questionnaires/example.pdf',
				label: 'Example document',
				explanation: 'Submitted by wallet team',
				lastRetrieved: '2025-01-15',
			}
			const result = toFullyQualified(ref)

			expect(result[0].explanation).toBe('Submitted by wallet team')
			expect(result[0].lastRetrieved).toBe('2025-01-15')
		})

		it('throws if the file path is not under public/', () => {
			const ref: LooseReference = { file: 'src/something.ts', label: 'Example document' }

			expect(() => toFullyQualified(ref)).toThrow(
				'File path-based references must be a repository-relative path under public/',
			)
		})

		it('strips nested public/ subdirectories correctly', () => {
			const ref: LooseReference = {
				file: 'public/docs/wallets/metamask/answers.pdf',
				label: 'Example document',
			}
			const result = toFullyQualified(ref)

			expect(result[0].urls[0].url).toBe('/docs/wallets/metamask/answers.pdf')
		})
	})
})

describe('reference integrity', () => {
	const allRefs = collectAllRefs(allWallets)

	// Group by wallet name
	const byWallet = new Map<string, CollectedRef[]>()

	for (const ref of allRefs) {
		if (!byWallet.has(ref.walletName)) {
			byWallet.set(ref.walletName, [])
		}

		byWallet.get(ref.walletName)!.push(ref)
	}

	for (const [walletName, refs] of byWallet) {
		describe(walletName, () => {
			for (const collected of refs) {
				const fieldLabel = collected.fieldPath.slice(walletName.length + 1)

				describe(fieldLabel, () => {
					const fqRefs = collected.fullyQualifiedRefs

					it('all file refs point to existing files', () => {
						for (const fq of fqRefs) {
							for (const urlEntry of fq.urls) {
								const url = urlEntry.url

								// Only check file-based refs (root-relative URLs from public/)
								if (url.startsWith('/') && !url.startsWith('//')) {
									const filePath = `public${url}`

									expect(filePath).toMatch(/^public\//)

									const segments = filePath.split('/')

									expect(segments.some(s => s === '.' || s === '..')).toBe(false)

									const fullPath = resolve(repoRoot, filePath)

									expect(
										existsSync(fullPath),
										`references "${filePath}" but this file does not exist`,
									).toBe(true)
								}
							}
						}
					})

					it('explanation fields pass grammar lint', async () => {
						for (const fq of fqRefs) {
							if (fq.explanation) {
								await grammarLint(fq.explanation)
							}
						}
					})

					it('label fields pass grammar lint', async () => {
						for (const fq of fqRefs) {
							for (const urlEntry of fq.urls) {
								if (urlEntry.label) {
									await grammarLint(urlEntry.label)
								}
							}
						}
					})

					it('no URL uses the www.github.com hostname', () => {
						for (const fq of fqRefs) {
							for (const urlEntry of fq.urls) {
								if (!URL.canParse(urlEntry.url)) {
									continue
								}

								expect(
									new URL(urlEntry.url).hostname,
									`"${urlEntry.url}" uses the www.github.com hostname; ` +
										'use plain github.com instead.',
								).not.toBe('www.github.com')
							}
						}
					})
				})
			}
		})
	}
})

describe('wallet references directories', () => {
	const walletIdByName = new Map<string, string>(
		Object.entries(allWallets).map(([name, wallet]) => [name, wallet.metadata.id]),
	)
	const walletIds = new Set(walletIdByName.values())

	// Checks the directories on disk. Fails on a stale or misnamed directory even if  no wallet data references it
	// `public/references/wallets/uniswap/` should be `public/references-wallets/uniswap-wallet
	it('every directory under public/references/wallets/ is named after a known wallet ID', () => {
		const dirs = readdirSync(resolve(repoRoot, WALLET_REFERENCES_DIR), { withFileTypes: true })
			.filter(entry => entry.isDirectory())
			.map(entry => entry.name)

		for (const dir of dirs) {
			expect(
				walletIds.has(dir),
				`"${WALLET_REFERENCES_DIR}/${dir}/" does not match any wallet ID; ` +
					"rename it to the wallet's `metadata.id`.",
			).toBe(true)
		}
	})

	// Checks the wallet data. Fails when a wallet's ref points into a directory other
	// than its own `metadata.id`, even if that directory is a valid wallet ID
	// `uniswapWallet` referencing a file under `public/references/wallets/metamask/`.
	it("wallet file refs under public/references/wallets/ point to the wallet's own directory", () => {
		const urlPrefix = `/${WALLET_REFERENCES_DIR.slice('public/'.length)}/`

		for (const collected of collectAllRefs(allWallets)) {
			const walletId = walletIdByName.get(collected.walletName)

			for (const fq of collected.fullyQualifiedRefs) {
				for (const { url } of fq.urls) {
					if (!url.startsWith(urlPrefix)) {
						continue
					}

					const dir = url.slice(urlPrefix.length).split('/')[0]

					expect(
						dir,
						`${collected.fieldPath} references "public${url}", ` +
							`which is not under "${WALLET_REFERENCES_DIR}/${walletId}/".`,
					).toBe(walletId)
				}
			}
		}
	})

	// Checks the files on disk. Fails on a file that no wallet ref points to, e.g. a
	// screenshot left behind after its ref was removed or changed to another file.
	// Code snippets are skipped; `code-snippets-integrity.test.ts` keeps those in sync.
	// Questionnaire files in `QUESTIONNAIRE_FILES` are also allowed without a ref.
	it('every file under public/references/wallets/ is referenced by wallet data', async () => {
		const urlPrefix = `/${WALLET_REFERENCES_DIR.slice('public/'.length)}/`
		const referencedFiles = new Set<string>(QUESTIONNAIRE_FILES)

		for (const collected of collectAllRefs(allWallets)) {
			for (const fq of collected.fullyQualifiedRefs) {
				for (const { url } of fq.urls) {
					if (url.startsWith(urlPrefix)) {
						referencedFiles.add(`public${url}`)
					}
				}
			}
		}

		const unreferencedFiles: string[] = []

		await crawlCodebase({
			ignore: [
				'.git',
				await GitIgnoredFiles(),
				/\.snippet$/i,
				path =>
					!(
						path.startsWith(`${WALLET_REFERENCES_DIR}/`) ||
						`${WALLET_REFERENCES_DIR}/`.startsWith(`${path}/`)
					),
			],
			baseTraversalFn: entry => {
				if (entry.type === CodebaseEntryType.FILE && !referencedFiles.has(entry.path)) {
					unreferencedFiles.push(entry.path)
				}
			},
		})

		expect(
			unreferencedFiles.sort(),
			'These files are not referenced by any wallet data; delete them or add a ref to them.',
		).toEqual([])
	})
})
