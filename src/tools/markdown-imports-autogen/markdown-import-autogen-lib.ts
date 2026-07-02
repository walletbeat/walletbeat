import * as fs from 'node:fs'
import * as path from 'node:path'

import * as prettier from 'prettier'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { getErrorMessage } from '@/types/errors'
import { assertStringHasPrefixAndSuffix, trimWhitespacePrefix } from '@/types/utils/text'
import { knownContentTypes, staticSingleMarkdownPage } from '@/utils/markdown-page-utils'

/**
 * Single source of truth for every served markdown directory.
 * Each entry maps a source directory to its generated imports file,
 * URL prefix, and Astro endpoint directory.
 */
export const SERVED_DIRS: {
	/** Repo-root-relative path to the generated `.gen.ts` file. */
	genFile: `/${string}`

	/** Repo-root-relative source directory containing the markdown files. */
	sourceDir: `/${string}`

	/** URL prefix where the pages are served (e.g. `/docs/`). */
	urlPrefix: `/${string}`

	/** Directory under `src/pages/` where the Astro endpoint files live. */
	endpointDir: string
}[] = [
	{
		genFile: '/src/autogen/docs.gen.ts',
		sourceDir: '/resources/docs',
		urlPrefix: '/docs/',
		endpointDir: 'src/pages/docs',
	},
	{
		genFile: '/src/autogen/governance.gen.ts',
		sourceDir: '/governance',
		urlPrefix: '/governance/',
		endpointDir: 'src/pages/governance',
	},
]

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

	public constructor(config: MarkdownImportsConfig) {
		this.repoRoot = getRepositoryRoot()
		this.genFilePath = config.genFilePath
		this.sourceDirs = config.sourceDirs
	}

	/**
	 * Returns the repo-root-relative path of the generated file, with a leading `/`.
	 */
	public genFileRelativePath(): `/${string}.gen.ts` {
		return assertStringHasPrefixAndSuffix(
			'/' + path.relative(this.repoRoot, this.genFilePath).replaceAll(path.sep, '/'),
			{
				prefix: '/',
				suffix: '.gen.ts',
			},
		)
	}

	/**
	 * Recursively walk all source directories and validate the "exactly one `.md`"
	 * rule.  Returns an array of human-readable error strings (empty = no errors).
	 */
	public validate(): string[] {
		const scan = this.scanDirectories()
		const errors: string[] = []

		for (const [dirPath, mdFiles] of scan) {
			const relDir = path.relative(this.repoRoot, dirPath).replaceAll(path.sep, '/')

			if (mdFiles.length > 1) {
				errors.push(
					`${relDir}: Found ${mdFiles.length} .md files, expected exactly 1: ${mdFiles.join(', ')}`,
				)

				continue
			}

			const fullPath = path.join(dirPath, mdFiles[0])
			const relPath = '/' + path.relative(this.repoRoot, fullPath).replaceAll(path.sep, '/')

			try {
				const rawContent = fs.readFileSync(fullPath, 'utf-8')
				const repoRootRelativePath = assertStringHasPrefixAndSuffix(relPath, {
					prefix: '/',
					suffix: '.md',
				})

				staticSingleMarkdownPage({ rawMarkdown: rawContent, repoRootRelativePath })
			} catch (e) {
				errors.push(`${relPath}: ${getErrorMessage(e)}`)
			}
		}

		return errors
	}

	/**
	 * Returns a sorted array of repo-root-relative paths (with leading `/`) for
	 * every eligible `.md` file — i.e. `.md` files that are the sole direct-child
	 * markdown file in their parent directory.
	 */
	public getEligibleFiles(): `/${string}.md`[] {
		const scan = this.scanDirectories()
		const result: `/${string}.md`[] = []

		for (const [dirPath, mdFiles] of scan) {
			if (mdFiles.length === 1) {
				const fullPath = path.join(dirPath, mdFiles[0])

				const relPath = '/' + path.relative(this.repoRoot, fullPath).replaceAll(path.sep, '/')

				result.push(assertStringHasPrefixAndSuffix(relPath, { prefix: '/', suffix: '.md' }))
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

	/**
	 * Recursively scans all source directories for image files and returns the set
	 * of unique file extensions found (including the leading dot, e.g. `.png`).
	 */
	public getImageExtensionsOnDisk(): Set<string> {
		const extensions = new Set<string>()

		for (const sourceDir of this.sourceDirs) {
			this.collectImageExtensions(sourceDir, extensions)
		}

		return extensions
	}

	/**
	 * Validates that every image extension found on disk has a corresponding Astro
	 * endpoint file and a registered Content-Type.
	 *
	 * @param endpointDir Repo-root-relative path to the directory containing the
	 * endpoint files (e.g. `src/pages/docs`).
	 * @returns An array of human-readable error strings (empty = no errors).
	 */
	public validateImageEndpoints(endpointDir: string): string[] {
		const errors: string[] = []
		const diskExtensions = this.getImageExtensionsOnDisk()
		const endpointExtensions = this.discoverEndpointExtensions(endpointDir)

		for (const ext of diskExtensions) {
			const cleanExt = ext.slice(1)

			if (!endpointExtensions.has(ext)) {
				errors.push(
					`No endpoint file for ${ext} images. ` +
						`Create ${endpointDir}/[...img]${ext}.ts and call staticMarkdownMedia({ extension: '${cleanExt}' }).`,
				)
			}

			if (knownContentTypes[cleanExt] === undefined) {
				errors.push(
					`${ext} is not in knownContentTypes in markdown-page-utils.ts. ` +
						`Add '${cleanExt}': '<mime type>' to the mapping.`,
				)
			}
		}

		return errors
	}

	/**
	 * Scans the endpoint directory for `[...img].<ext>.ts` files and returns the
	 * set of extensions (with leading dot) that have an endpoint.
	 */
	public discoverEndpointExtensions(endpointDir: string): Set<string> {
		const extensions = new Set<string>()
		const absEndpointDir = path.join(this.repoRoot, endpointDir)

		if (!fs.existsSync(absEndpointDir)) {
			return extensions
		}

		const pattern = /^\[\.\.\.img\]\.(.+?)\.ts$/

		const entries = fs.readdirSync(absEndpointDir)

		for (const entry of entries) {
			const match = pattern.exec(entry)

			if (match) {
				extensions.add(`.${match[1]}`)
			}
		}

		return extensions
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
	private relativePathToImportPath(mdPath: `/${string}.md`): `@/${string}.md` {
		return assertStringHasPrefixAndSuffix(`@/${mdPath.slice(1)}`, { prefix: '@/', suffix: '.md' })
	}

	/**
	 * Recursively walks a directory tree and collects image file extensions
	 * into the provided set.  Only extensions registered in `knownContentTypes`
	 * are collected.
	 */
	private collectImageExtensions(dir: string, extensions: Set<string>): void {
		const entries = fs.readdirSync(dir, { withFileTypes: true })

		for (const entry of entries) {
			if (entry.isDirectory()) {
				this.collectImageExtensions(path.join(dir, entry.name), extensions)
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase()

				if (ext && knownContentTypes[ext.slice(1)] !== undefined) {
					extensions.add(ext)
				}
			}
		}
	}
}
