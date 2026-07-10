import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { hasRefs, type LooseReference, toFullyQualified } from '@/schema/reference'

import { grammarLint, warmupHarperLinter } from './utils/grammar'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')

/** A single collected reference with its wallet name, field path, and fully-qualified refs. */
interface CollectedRef {
	walletName: string
	fieldPath: string
	fullyQualifiedRefs: ReturnType<typeof toFullyQualified>
}

/**
 * Recursively traverse wallet data objects and collect every `ref` field,
 * returning the wallet name, the period-delimited field path, and the
 * fully-qualified references.
 */
export function collectAllRefs(wallets: typeof allWallets): CollectedRef[] {
	const results: CollectedRef[] = []

	const findRefs = (path: string[], x: unknown): void => {
		if (x === undefined || x === null) {
			return
		}

		if (Array.isArray(x)) {
			for (let i = 0; i < x.length; i++) {
				findRefs(path.concat([`[${i}]`]), x[i])
			}

			return
		}

		if (typeof x !== 'object') {
			return
		}

		if (hasRefs(x)) {
			results.push({
				walletName: path[0],
				fieldPath: path.join(''),
				fullyQualifiedRefs: toFullyQualified(x.ref),
			})
		}

		for (const [key, val] of Object.entries(x)) {
			findRefs(path.length === 0 ? [key] : path.concat([`.${key}`]), val)
		}
	}

	for (const [walletName, wallet] of Object.entries(wallets)) {
		findRefs([walletName], wallet)
	}

	return results
}

await warmupHarperLinter()

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
