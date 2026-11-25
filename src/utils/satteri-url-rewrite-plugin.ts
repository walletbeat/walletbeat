import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineHastPlugin } from 'satteri'

import { GITHUB_REPO_URL, githubBlobUrl } from '@/constants/github'
import {
	IN_REPO_GITHUB_URL_PREFIXES,
	markdownPageSlug,
	NON_SERVED_EXTENSIONS,
	PUBLISHED_URL_PREFIXES,
	SERVED_REPO_DIRS,
	SKIPPED_URL_PREFIXES,
	URL_REWRITE_MAPPINGS,
} from '@/constants/rendered-collections'
import { assertStringHasPrefix } from '@/types/utils/text'

/**
 * Return the lowercase file extension (including the leading dot) of a path,
 * or an empty string when the path has no extension.
 */
function extensionOf(url: string): `.${string}` | '' {
	const lastSlash = url.lastIndexOf('/')
	const basename = lastSlash >= 0 ? url.slice(lastSlash + 1) : url
	const dot = basename.lastIndexOf('.')

	return dot >= 0 ? assertStringHasPrefix(basename.slice(dot).toLowerCase(), '.') : ''
}

/**
 * Extract the repo-root-relative path (leading `/`) from a GitHub blob/tree
 * URL, or null when the URL is not one. The branch component may itself
 * contain slashes, so split points are tried left to right; the first one
 * whose remainder starts with a repository root entry wins.
 */
export function githubInRepoPath(url: string, repoRoot: string): string | null {
	const prefix = IN_REPO_GITHUB_URL_PREFIXES.find(p => url.startsWith(p))

	if (prefix === undefined) {
		return null
	}

	const rest = url.slice(prefix.length)
	const segments = rest.split('/')
	let rootEntries: Set<string> | null

	try {
		rootEntries = new Set(readdirSync(repoRoot))
	} catch {
		rootEntries = null
	}

	for (let split = 1; split < segments.length; split++) {
		const candidate = segments.slice(split).join('/')
		const firstSegment = segments[split]

		if (rootEntries === null || rootEntries.has(firstSegment)) {
			return '/' + candidate
		}
	}

	return null
}

function resolveRelativeUrl(url: string, sourceDir: string): string {
	if (url.startsWith('/')) {
		return url
	}

	const baseParts = sourceDir.split('/').filter(Boolean)
	const urlParts = url.split('/')
	const resultParts = [...baseParts]
	const hasTrailingSlash = url.endsWith('/')

	for (const part of urlParts) {
		if (part === '' || part === '.') {
			continue
		}

		if (part === '..') {
			if (resultParts.length === 0) {
				throw new Error(`Relative path '${url}' tries to escape repository root`)
			}

			resultParts.pop()
			continue
		}

		resultParts.push(part)
	}

	let result = '/' + resultParts.join('/')

	if (hasTrailingSlash && !result.endsWith('/')) {
		result += '/'
	}

	return result
}

const markdownPagePath = (path: string) =>
	path.endsWith('.md') ? markdownPageSlug(path.slice(0, -3)) + '/' : path

/**
 * Rewrite a repository path to its published pathname, retaining an authored
 * section link. Native and external references are not rewritten.
 *
 * Returns the rewritten URL plus whether a source-tree mapping matched. When
 * no mapping matches the resolved path, the path is returned unchanged
 * (pass-through); the caller is responsible for flagging any such path that
 * is not actually published by the site.
 */
export function rewriteUrl(url: string, sourceDir: string): { url: string; matched: boolean } {
	const pathname = url.split(/[?#]/, 1)[0]

	if (!pathname || SKIPPED_URL_PREFIXES.some(prefix => url.startsWith(prefix))) {
		return { url, matched: false }
	}

	const suffixIndex = url.search(/[?#]/)
	const suffix = suffixIndex === -1 ? '' : url.slice(suffixIndex)
	const resolved = pathname.startsWith('/') ? pathname : resolveRelativeUrl(pathname, sourceDir)
	const extension = extensionOf(resolved)

	if (extension !== '' && NON_SERVED_EXTENSIONS.has(extension)) {
		return { url: githubBlobUrl(resolved), matched: true }
	}

	for (const mapping of URL_REWRITE_MAPPINGS) {
		if (resolved.startsWith(mapping.repoPrefix)) {
			const relativePath = resolved.slice(mapping.repoPrefix.length)

			return {
				url:
					mapping.urlPrefix +
					(mapping.stripFilename ? markdownPagePath(relativePath) : relativePath) +
					suffix,
				matched: true,
			}
		}
	}

	// No mapping matched: either a published site path (pass through) or an
	// in-repo file not served by the site (rewrite to a GitHub link).
	if (isNonPublishedRepoPath(resolved, process.cwd())) {
		return { url: githubBlobUrl(resolved), matched: true }
	}

	return { url: resolved + suffix, matched: false }
}

/**
 * Whether a resolved repo-root-relative URL refers to a path that is NOT served
 * by the site (e.g. a top-level repo file such as `/CONTRIBUTING.md`, a
 * repo-internal directory such as `/.agents`, or a file under a non-collection
 * directory such as `resources/talks`). Such in-repo links are rewritten to
 * point at the file on GitHub rather than served by the site.
 *
 * @param resolved Resolved repo-root-relative URL (leading `/`).
 * @param repoRoot Absolute path to the repository root.
 */
export function isNonPublishedRepoPath(resolved: string, repoRoot: string): boolean {
	const rel = resolved.replace(/^\//, '')

	if (!rel) {
		return false
	}

	// Directories whose contents are served as site pages or published assets.
	if (SERVED_REPO_DIRS.some(dir => rel === dir || rel.startsWith(dir + '/'))) {
		return false
	}

	// Published rendered-collection URL prefixes (e.g. /about, /docs).
	if (PUBLISHED_URL_PREFIXES.some(prefix => rel === prefix || rel.startsWith(prefix + '/'))) {
		return false
	}

	// Assets served directly from `public/`.
	if (existsSync(path.join(repoRoot, 'public', rel))) {
		return false
	}

	return true
}

export function createUrlRewritePlugin() {
	return defineHastPlugin({
		name: 'rewrite-urls',
		element: {
			filter: ['a', 'img'],
			visit(node, ctx) {
				// Determine the property key based on element type
				const tagName = node.tagName
				const propKey = tagName === 'a' ? 'href' : 'src'

				const url = String(node.properties[propKey] ?? '')

				if (!url || typeof url !== 'string') {
					return
				}

				// In-repo GitHub blob/tree URLs are transformed to their
				// associated site URLs at generation time rather than rewritten in
				// document sources; documents representing frozen applications keep
				// their original text. When the linked file is not served by the
				// site, the original branch-pinned GitHub URL is the correct target
				// and is kept as-is.
				const repoPath = githubInRepoPath(url, process.cwd())

				if (repoPath !== null) {
					const { url: rewritten, matched } = rewriteUrl(repoPath, '/')

					if (matched && !rewritten.startsWith(GITHUB_REPO_URL)) {
						ctx.setProperty(node, propKey, rewritten)
					}

					return
				}

				if (SKIPPED_URL_PREFIXES.some(p => url.startsWith(p))) {
					return
				}

				// Derive source directory from fileURL
				let sourceDir = '/'

				if (ctx.fileURL) {
					try {
						// Convert the file URL to an OS-native path (handles Windows drive
						// letters, where URL pathnames carry a leading slash that would
						// otherwise break a plain string-prefix comparison).
						const filePath = fileURLToPath(ctx.fileURL)
						const repoRoot = process.cwd()
						const relPath = path.relative(repoRoot, filePath)

						// Only derive a source dir when the file lives under the repo root
						// (i.e. `path.relative` does not escape it or span another drive).
						if (relPath && !relPath.startsWith('..') && !path.isAbsolute(relPath)) {
							const dir = path.dirname(relPath).split(path.sep).join('/')

							sourceDir = '/' + dir

							if (!sourceDir.endsWith('/')) {
								sourceDir += '/'
							}
						}
					} catch {
						// Ignore errors deriving source dir
					}
				}

				const { url: rewritten } = rewriteUrl(url, sourceDir)

				// An in-repo file not served by the site is rewritten to a GitHub link
				// by `rewriteUrl`, so the property is always safe to set.
				ctx.setProperty(node, propKey, rewritten)
			},
		},
	})
}

export const createMarkdownStructurePlugin = () =>
	defineHastPlugin({
		name: 'markdown-structure',
		element: {
			filter: ['h1', 'table'],
			visit: (node, ctx) => {
				if (node.tagName === 'table') {
					ctx.replaceNode(node, {
						type: 'element',
						tagName: 'div',
						properties: {
							'data-scroll-container': 'inline',
							tabindex: 0,
							role: 'region',
							'aria-label': 'Scrollable table',
						},
						children: [node],
					})
				} else if (!ctx.data.stripFirstH1Done) {
					ctx.data.stripFirstH1Done = true
					ctx.removeNode(node)
				}
			},
		},
	})
