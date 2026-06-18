import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { hasRefs, type LooseReference, toFullyQualified } from '@/schema/reference'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')

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

	describe('file existence validation', () => {
		it('all file references in wallet data point to existing files', () => {
			type RefField = {
				path: string[]
				filePath: string
			}

			const fileRefs: RefField[] = []

			const findFileRefs = (path: string[], x: unknown): void => {
				if (x === undefined || x === null) {
					return
				}

				if (Array.isArray(x)) {
					x.map((item, index) => findFileRefs(path.concat([`[${index.toString()}]`]), item))

					return
				}

				if (typeof x !== 'object') {
					return
				}

				for (const [key, val] of Object.entries(x)) {
					findFileRefs(path.length === 0 ? [key] : path.concat([`.${key}`]), val)
				}

				if (hasRefs(x)) {
					const qualified = toFullyQualified(x.ref)

					for (const ref of qualified) {
						for (const urlEntry of ref.urls) {
							const url = urlEntry.url

							if (url.startsWith('/') && !url.startsWith('//')) {
								fileRefs.push({
									path,
									filePath: `public${url}`,
								})
							}
						}
					}
				}
			}

			for (const [walletName, wallet] of Object.entries(allWallets)) {
				findFileRefs([walletName], wallet)
			}

			for (const { path, filePath } of fileRefs) {
				if (!filePath.startsWith('public/')) {
					throw new Error(`${path.join('')}: file path "${filePath}" must start with public/`)
				}

				const segments = filePath.split('/')

				if (segments.some(s => s === '.' || s === '..')) {
					throw new Error(
						`${path.join('')}: file path "${filePath}" contains path-traversal components`,
					)
				}

				const fullPath = resolve(repoRoot, filePath)

				expect(
					existsSync(fullPath),
					`${path.join('')}: references "${filePath}" but this file does not exist`,
				).toBe(true)
			}
		})
	})
})
