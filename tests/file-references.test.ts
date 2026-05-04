import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { toFullyQualified, type LooseReference } from '@/schema/reference'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')

describe('RepoFileReference', () => {
	describe('toFullyQualified with file references', () => {
		it('converts a file reference under public/ to a root-relative URL', () => {
			const ref: LooseReference = { file: 'public/questionnaires/example.pdf' }
			const result = toFullyQualified(ref)

			expect(result).toHaveLength(1)
			expect(result[0].urls[0].url).toBe('/questionnaires/example.pdf')
		})

		it('uses the filename as the default label', () => {
			const ref: LooseReference = { file: 'public/questionnaires/example.pdf' }
			const result = toFullyQualified(ref)

			expect(result[0].urls[0].label).toBe('example.pdf')
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
				explanation: 'Submitted by wallet team',
				lastRetrieved: '2025-01-15',
			}
			const result = toFullyQualified(ref)

			expect(result[0].explanation).toBe('Submitted by wallet team')
			expect(result[0].lastRetrieved).toBe('2025-01-15')
		})

		it('throws if the file path is not under public/', () => {
			const ref: LooseReference = { file: 'src/something.ts' }

			expect(() => toFullyQualified(ref)).toThrow(
				'RepoFileReference path must be a repo-relative path under public/',
			)
		})

		it('strips nested public/ subdirectories correctly', () => {
			const ref: LooseReference = { file: 'public/docs/wallets/metamask/answers.pdf' }
			const result = toFullyQualified(ref)

			expect(result[0].urls[0].url).toBe('/docs/wallets/metamask/answers.pdf')
		})
	})

	describe('file existence validation', () => {
		it('all file references in wallet data point to files that exist', () => {
			const dataDir = resolve(repoRoot, 'data')

			if (!existsSync(dataDir)) {
				return
			}

			const fileReferences: Array<{ filePath: string; sourceFile: string }> = []

			function scanDir(dir: string): void {
				for (const entry of readdirSync(dir, { withFileTypes: true })) {
					const fullPath = join(dir, entry.name)

					if (entry.isDirectory()) {
						scanDir(fullPath)
						continue
					}

					if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) {
						continue
					}

					const content = readFileSync(fullPath, 'utf-8')
					const matches = content.matchAll(/file:\s*['"]([^'"]+)['"]/g)

					for (const match of matches) {
						fileReferences.push({
							filePath: match[1],
							sourceFile: fullPath,
						})
					}
				}
			}

			scanDir(dataDir)

			for (const { filePath, sourceFile } of fileReferences) {
				const fullPath = resolve(repoRoot, filePath)
				const relativeSource = sourceFile.replace(repoRoot + '/', '')

				expect(
					existsSync(fullPath),
					`${relativeSource} references "${filePath}" but this file does not exist`,
				).toBe(true)
			}
		})
	})
})
