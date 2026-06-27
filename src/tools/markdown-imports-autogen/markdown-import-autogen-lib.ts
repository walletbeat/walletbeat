import * as fs from 'node:fs'
import * as path from 'node:path'

import * as prettier from 'prettier'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { trimWhitespacePrefix } from '@/types/utils/text'

/** Configuration for a MarkdownImportsGenerator instance. */
export interface MarkdownImportsConfig {
	/** Absolute path to the generated .gen.ts file. */
	genFilePath: string
	/** Absolute paths to source directories to scan recursively for markdown files. */
	sourceDirs: string[]
}

/**
 * Generates and manages auto-generated TypeScript import mapping files for
 * markdown documentation directories.
 *
 * Scans source directories recursively and produces a `.gen.ts` file containing
 * `import(... ?raw)` expressions for every `.md` file that is the sole direct-child
 * markdown file in its parent directory.
 */
export class MarkdownImportsGenerator {
	private readonly repoRoot: string
	private readonly genFilePath: string
	private readonly sourceDirs: string[]
	private genFileRelativePathCache: string | undefined = undefined

	public constructor(config: MarkdownImportsConfig) {
		this.repoRoot = getRepositoryRoot()
		this.genFilePath = config.genFilePath
		this.sourceDirs = config.sourceDirs
	}

	// ── Public API ──

	/**
	 * Returns the repo-root-relative path of the generated file, with a leading `/`.
	 */
	public genFileRelativePath(): string {
		if (this.genFileRelativePathCache !== undefined) {
			return this.genFileRelativePathCache
		}

		this.genFileRelativePathCache =
			'/' + path.relative(this.repoRoot, this.genFilePath).replaceAll(path.sep, '/')

		return this.genFileRelativePathCache
	}

	/**
	 * Recursively walk all source directories and validate the "exactly one `.md`"
	 * rule.  Returns an array of human-readable error strings (empty = no errors).
	 */
	public validate(): string[] {
		const scan = this.scanDirectories()
		const errors: string[] = []

		for (const [dirPath, mdFiles] of scan) {
			if (mdFiles.length > 1) {
				const relDir = path.relative(this.repoRoot, dirPath).replaceAll(path.sep, '/')

				errors.push(
					`${relDir}: Found ${mdFiles.length} .md files, expected exactly 1: ${mdFiles.join(', ')}`,
				)
			}
		}

		return errors
	}

	/**
	 * Returns a sorted array of repo-root-relative paths (with leading `/`) for
	 * every eligible `.md` file — i.e. `.md` files that are the sole direct-child
	 * markdown file in their parent directory.
	 */
	public getEligibleFiles(): string[] {
		const scan = this.scanDirectories()
		const result: string[] = []

		for (const [dirPath, mdFiles] of scan) {
			if (mdFiles.length === 1) {
				const fullPath = path.join(dirPath, mdFiles[0])

				const relPath = '/' + path.relative(this.repoRoot, fullPath).replaceAll(path.sep, '/')

				result.push(relPath)
			}
		}

		return result.sort()
	}

	/**
	 * Generates the raw (unformatted) TypeScript source for the `.gen.ts` file.
	 */
	public generateContent(): string {
		const files = this.getEligibleFiles()

		const entries = files
			.map(mdPath => {
				const importPath = this.relativePathToImportPath(mdPath)

				return `    '${mdPath}': (await import('${importPath}?raw')).default,`
			})
			.join('\n')

		// The `${string}` fragment cannot be literal inside a template expression,
		// so we build the type annotation as a plain string and interpolate it.
		const typeAnnotation = 'Record<`/${string}.md`, string>'

		return (
			trimWhitespacePrefix(`
      /**
       * Auto-generated import mappings for markdown documentation files.
       * DO NOT edit manually — run the markdown-imports-autogen tool to regenerate.
       */
      const markdownFiles: ${typeAnnotation} = {
      ${entries}
      }

      export default markdownFiles
    `) + '\n'
		)
	}

	/**
	 * Generates the Prettier-formatted TypeScript source for the `.gen.ts` file.
	 */
	public async generateFormatted(): Promise<string> {
		const raw = this.generateContent()
		const prettierConfig = (await prettier.resolveConfig(this.genFilePath)) ?? {}

		return prettier.format(raw, { ...prettierConfig, parser: 'typescript' })
	}

	/**
	 * Returns `true` if the generated file on disk matches the current generated
	 * content.  Returns `false` if the file does not exist.
	 */
	public async isUpToDate(): Promise<boolean> {
		if (!fs.existsSync(this.genFilePath)) {
			return false
		}

		const existing = fs.readFileSync(this.genFilePath, 'utf-8')

		const formatted = await this.generateFormatted()

		return existing === formatted
	}

	/**
	 * Writes the formatted `.gen.ts` file to disk.  Idempotent — does nothing
	 * if the file content is already identical.
	 */
	public async write(): Promise<void> {
		const content = await this.generateFormatted()

		if (fs.existsSync(this.genFilePath)) {
			const existing = fs.readFileSync(this.genFilePath, 'utf-8')

			if (existing === content) {
				return
			}
		}

		fs.mkdirSync(path.dirname(this.genFilePath), { recursive: true })

		fs.writeFileSync(this.genFilePath, content)
	}

	/**
	 * Returns a shell command string that re-runs this generator in write mode.
	 */
	public writeCommand(): string {
		return 'pnpm tsx src/tools/markdown-imports-autogen/markdown-import-autogen.ts --mode write'
	}

	// ── Private helpers ──

	/**
	 * Recursively walks all configured source directories.  Returns a Map of
	 * absolute directory path → list of direct-child `.md` file names.
	 */
	private scanDirectories(): Map<string, string[]> {
		const result = new Map<string, string[]>()

		for (const sourceDir of this.sourceDirs) {
			this.scanDirectoryRecursive(sourceDir, result)
		}

		return result
	}

	/** Recursively crawl a single directory tree, populating the scan map. */
	private scanDirectoryRecursive(dir: string, map: Map<string, string[]>): void {
		const entries = fs.readdirSync(dir, { withFileTypes: true })
		const mdFiles: string[] = []

		for (const entry of entries) {
			if (entry.isDirectory()) {
				// Collect the directory entry itself for later recursive crawl
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				mdFiles.push(entry.name)
			}
		}

		if (mdFiles.length > 0) {
			map.set(dir, mdFiles.sort())
		}

		// Recurse into subdirectories
		for (const entry of entries) {
			if (entry.isDirectory()) {
				this.scanDirectoryRecursive(path.join(dir, entry.name), map)
			}
		}
	}

	/**
	 * Converts a repo-root-relative path (with leading `/`) to an `@/`-aliased
	 * import path suitable for `import(...)`.
	 */
	private relativePathToImportPath(mdPath: string): string {
		// Strip leading slash: '/resources/docs/foo.md' → 'resources/docs/foo.md'
		const stripped = mdPath.slice(1)

		// Prepend @ to create the alias path
		return `@/${stripped}`
	}
}
