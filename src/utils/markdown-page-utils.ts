import type { MarkdownContentWithFrontmatter } from '@/types/content'
import { assertStringHasPrefix, assertStringHasPrefixAndSuffix } from '@/types/utils/text'
import { parseMarkdownWithFrontmatter } from '@/utils/markdown-utils'

export type MarkdownMetadata = Record<string, string> & {
	title: string
	description: string
}

export type MarkdownFrontmatter = Record<string, string> & {
	title: string
	description: string
}

/** A single entry shown on an auto-generated index page. */
export interface MarkdownIndexEntry {
	/** The URL path the entry links to. */
	path: `/${string}`
	/** Display title taken from the child's frontmatter (page) or derived (index). */
	title: string
	/** Description from the child's frontmatter, or `null` for index children. */
	description: string | null
}

/** A regular markdown page rendered from frontmatter. */
export type RenderedMarkdownPage = {
	type: 'page'
	metadata: MarkdownMetadata
	repoRootRelativePath: `/${string}.md`
	processedMarkdown: MarkdownContentWithFrontmatter<null, MarkdownMetadata>
}

/** An auto-generated index page listing subdirectory children. */
export type RenderedMarkdownIndex = {
	type: 'index'
	metadata: { title: string; description: string }
	entries: MarkdownIndexEntry[]
}

export type RenderedMarkdown = RenderedMarkdownPage | RenderedMarkdownIndex

export function staticMarkdownDir({
	markdownFiles,
	stripPrefix,
	urlPrefix,
}: {
	markdownFiles: Record<`/${string}.md`, string>
	stripPrefix: `/${string}/`
	urlPrefix: `/${string}/`
}): {
	renderPage: ({ slug }: { slug: string | undefined }) => RenderedMarkdown
	prerender: true
	getStaticPaths: () => Array<{ params: { slug: string } }>
} {
	// ── Pre-compute per-page-dir info ──────────────────────────────────────

	interface PageDirInfo {
		key: `/${string}.md`
		title: string
		description: string
	}

	const pageDirInfo = new Map<string, PageDirInfo>()

	for (const key of Object.keys(markdownFiles)) {
		const withoutPrefix = assertStringHasPrefix(key, stripPrefix).substring(stripPrefix.length)
		const dirPath = withoutPrefix.substring(0, withoutPrefix.lastIndexOf('/'))
		const rawMd = markdownFiles[key]
		const parsed = parseMarkdownWithFrontmatter<MarkdownMetadata>(rawMd, {
			title: true,
			description: true,
		} as const)

		pageDirInfo.set(dirPath, {
			key: assertStringHasPrefixAndSuffix(key, { prefix: '/', suffix: '.md' }),
			title: parsed.frontmatter.title,
			description: parsed.frontmatter.description,
		})
	}

	const pageDirs = new Set(pageDirInfo.keys())

	// ── Compute ancestor (index) directories ──────────────────────────────

	const indexDirs = new Set<string>()

	for (const pageDir of pageDirs) {
		let current = pageDir

		while (current !== '') {
			if (!pageDirs.has(current)) {
				indexDirs.add(current)
			}

			const lastSlash = current.lastIndexOf('/')

			current = lastSlash === -1 ? '' : current.substring(0, lastSlash)
		}

		// Add root as an index dir if it isn't a page dir
		if (!pageDirs.has('')) {
			indexDirs.add('')
		}
	}

	// ── Compute index children for each index dir ─────────────────────────

	function humanizeDirName(name: string): string {
		return name
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
	}

	function getParentDir(path: string): string {
		const lastSlash = path.lastIndexOf('/')

		return lastSlash === -1 ? '' : path.substring(0, lastSlash)
	}

	function getBaseName(path: string): string {
		const lastSlash = path.lastIndexOf('/')

		return lastSlash === -1 ? path : path.substring(lastSlash + 1)
	}

	const indexChildren = new Map<string, MarkdownIndexEntry[]>()

	for (const idxDir of indexDirs) {
		const children = new Map<string, { title: string; description: string | null }>()

		// Page-dir children
		for (const pageDir of pageDirs) {
			if (getParentDir(pageDir) === idxDir) {
				const childName = getBaseName(pageDir)

				if (childName === '') {
					continue // Skip entries with empty names
				}

				const info = pageDirInfo.get(pageDir)!

				children.set(childName, {
					title: info.title,
					description: info.description,
				})
			}
		}

		// Index-dir children
		for (const otherIdxDir of indexDirs) {
			if (otherIdxDir === idxDir) {
				continue // Skip self
			}

			if (getParentDir(otherIdxDir) === idxDir) {
				const childName = getBaseName(otherIdxDir)

				if (childName === '') {
					continue // Skip entries with empty names
				}

				children.set(childName, {
					title: humanizeDirName(childName),
					description: null,
				})
			}
		}

		const entries: MarkdownIndexEntry[] = [...children.entries()]
			.toSorted((a, b) => a[0].localeCompare(b[0]))
			.map(([childName, info]) => {
				const childDir = idxDir === '' ? childName : idxDir + '/' + childName

				const pathStr = urlPrefix + childDir + '/'

				return {
					path: assertStringHasPrefix(pathStr, '/'),
					title: info.title,
					description: info.description,
				}
			})

		indexChildren.set(idxDir, entries)
	}

	// ── Return the three functions ────────────────────────────────────────

	return {
		renderPage: ({ slug }: { slug: string | undefined }): RenderedMarkdown => {
			const dirPath = slug ?? ''

			// Index directory
			if (indexDirs.has(dirPath)) {
				const entries = indexChildren.get(dirPath)!

				const title =
					dirPath === ''
						? humanizeDirName(urlPrefix.slice(1, -1))
						: humanizeDirName(getBaseName(dirPath))

				const descriptionParts = entries.slice(0, 5).map(e => e.title)

				const description =
					descriptionParts.length > 1
						? 'Browse sections: ' + descriptionParts.join(', ')
						: descriptionParts.length === 1
							? 'Browse section: ' + descriptionParts[0]
							: ''

				return { type: 'index', metadata: { title, description }, entries }
			}

			// Regular page
			const info = pageDirInfo.get(dirPath)

			if (!info) {
				throw new Error(`No content for directory: ${stripPrefix}${dirPath}`)
			}

			const repoRootRelativePath = info.key

			const rawMarkdown = markdownFiles[repoRootRelativePath] ?? ''

			if (rawMarkdown === '') {
				throw new Error(`not a valid markdown file path: ${repoRootRelativePath}`)
			}

			const processedMarkdown = parseMarkdownWithFrontmatter<MarkdownMetadata>(rawMarkdown, {
				title: true,
				description: true,
			} as const)

			return {
				type: 'page',
				metadata: processedMarkdown.frontmatter,
				repoRootRelativePath,
				processedMarkdown,
			}
		},
		prerender: true,
		getStaticPaths: (): Array<{ params: { slug: string } }> => {
			const paths: Array<{ params: { slug: string } }> = []
			const seen = new Set<string>()

			for (const dir of pageDirs) {
				if (!seen.has(dir)) {
					paths.push({ params: { slug: dir } })
					seen.add(dir)
				}
			}

			for (const dir of indexDirs) {
				if (!seen.has(dir)) {
					paths.push({ params: { slug: dir } })
					seen.add(dir)
				}
			}

			return paths
		},
	}
}

export function staticSingleMarkdownPage({
	rawMarkdown,
	repoRootRelativePath,
}: {
	rawMarkdown: string
	repoRootRelativePath: `/${string}.md`
}): {
	metadata: MarkdownMetadata
	repoRootRelativePath: `/${string}.md`
	processedMarkdown: MarkdownContentWithFrontmatter<null, MarkdownMetadata>
} {
	const processedMarkdown = parseMarkdownWithFrontmatter<MarkdownMetadata>(rawMarkdown, {
		title: true,
		description: true,
	} as const)

	return {
		metadata: processedMarkdown.frontmatter,
		repoRootRelativePath,
		processedMarkdown,
	}
}
