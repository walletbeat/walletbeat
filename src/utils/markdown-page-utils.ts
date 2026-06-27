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

export function staticMarkdownDir({
	markdownFiles,
	stripPrefix,
}: {
	markdownFiles: Record<`/${string}.md`, string>
	stripPrefix: `/${string}/`
}): {
	renderPage: ({ slug }: { slug: string | undefined }) => {
		metadata: MarkdownMetadata
		repoRootRelativePath: `/${string}.md`
		processedMarkdown: MarkdownContentWithFrontmatter<null, MarkdownMetadata>
	}
	prerender: true
	getStaticPaths: () => Array<{ params: { slug: string } }>
} {
	return {
		renderPage: ({
			slug,
		}: {
			slug: string | undefined
		}): {
			metadata: MarkdownMetadata
			repoRootRelativePath: `/${string}.md`
			processedMarkdown: MarkdownContentWithFrontmatter<null, MarkdownMetadata>
		} => {
			const dirPath = stripPrefix + (slug ?? '')
			// Find the .md file under this directory (guaranteed to have exactly one).
			const matchingKey = Object.keys(markdownFiles).find(
				k => k.startsWith(dirPath + '/') && k.endsWith('.md'),
			)

			if (!matchingKey) {
				throw new Error(`No content for directory: ${dirPath}`)
			}

			const repoRootRelativePath = assertStringHasPrefixAndSuffix(matchingKey, {
				prefix: '/',
				suffix: '.md',
			})

			const rawMarkdown = markdownFiles[repoRootRelativePath] ?? ''

			if (rawMarkdown === '') {
				throw new Error(`not a valid markdown file path: ${repoRootRelativePath}`)
			}

			const processedMarkdown = parseMarkdownWithFrontmatter<MarkdownMetadata>(rawMarkdown, {
				title: true,
				description: true,
			} as const)

			return {
				metadata: processedMarkdown.frontmatter,
				repoRootRelativePath,
				processedMarkdown,
			}
		},
		prerender: true,
		getStaticPaths: (): Array<{ params: { slug: string } }> =>
			Object.keys(markdownFiles)
				.toSorted()
				.map(key => {
					// Strip the prefix and the filename to get the directory path.
					// e.g. '/prefix/foo/bar.md' → 'foo'
					const withoutPrefix = assertStringHasPrefix(key, stripPrefix).substring(
						stripPrefix.length,
					)
					const dirPath = withoutPrefix.substring(0, withoutPrefix.lastIndexOf('/'))

					return {
						params: { slug: dirPath },
					}
				}),
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
