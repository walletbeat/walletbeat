import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineHastPlugin } from 'satteri'

import { githubBlobUrl } from '@/constants/github'
import {
	ALLOWED_GITHUB_URLS,
	FORBIDDEN_GITHUB_PREFIXES,
	IMAGE_EXTENSIONS,
	NON_SERVED_EXTENSIONS,
	PUBLISHED_URL_PREFIXES,
	SERVED_REPO_DIRS,
	SKIPPED_URL_PREFIXES,
	URL_REWRITE_MAPPINGS,
} from '@/constants/rendered-collections'
import { assertStringHasPrefix } from '@/types/utils/text'

function isImageExtension(path: string): boolean {
	const lower = path.toLowerCase()

	for (const ext of IMAGE_EXTENSIONS) {
		if (lower.endsWith(ext)) {
			return true
		}
	}

	return false
}

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
 * Whether a GitHub blob/tree URL points to a file with a non-served extension.
 * Such GitHub links are allowed (they are the intended target for non-served
 * files), whereas GitHub links to rendered content are forbidden.
 */
function isNonServedGithubUrl(url: string): boolean {
	for (const prefix of FORBIDDEN_GITHUB_PREFIXES) {
		if (!url.startsWith(prefix)) {
			continue
		}

		// After the prefix the URL is `<branch>/<path>`.
		const rest = url.slice(prefix.length)
		const slash = rest.indexOf('/')

		if (slash < 0) {
			continue
		}

		const filePath = rest.slice(slash + 1)
		const extension = extensionOf(filePath)

		if (extension !== '' && NON_SERVED_EXTENSIONS.has(extension)) {
			return true
		}
	}

	return false
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

function stripFilename(url: string): string {
	if (isImageExtension(url)) {
		return url
	}

	// Preserve query string and hash
	const hashIdx = url.indexOf('#')
	const queryIdx = url.indexOf('?')
	const cutIdx = hashIdx >= 0 ? hashIdx : queryIdx >= 0 ? queryIdx : -1
	const base = cutIdx >= 0 ? url.slice(0, cutIdx) : url
	const suffix = cutIdx >= 0 ? url.slice(cutIdx) : ''

	const lastSlash = base.lastIndexOf('/')

	if (lastSlash > 0 && base.slice(lastSlash + 1).endsWith('.md')) {
		return base.slice(0, lastSlash + 1) + suffix
	}

	return url
}

/**
 * Rewrite a repo-relative URL to its published site URL.
 *
 * Returns the rewritten URL plus whether a source-tree mapping matched. When
 * no mapping matches the resolved path, the path is returned unchanged
 * (pass-through); the caller is responsible for flagging any such path that
 * is not actually published by the site.
 */
export function rewriteUrl(url: string, sourceDir: string): { url: string; matched: boolean } {
	if (SKIPPED_URL_PREFIXES.some(p => url.startsWith(p))) {
		return { url, matched: false }
	}

	let resolved = url.startsWith('/') ? url : resolveRelativeUrl(url, sourceDir)
	const extension = extensionOf(resolved)

	if (extension !== '' && NON_SERVED_EXTENSIONS.has(extension)) {
		return { url: githubBlobUrl(resolved), matched: true }
	}

	// Apply prefix mappings (longest match first).
	const sorted = [...URL_REWRITE_MAPPINGS].sort((a, b) => b.repoPrefix.length - a.repoPrefix.length)

	for (const mapping of sorted) {
		if (resolved === mapping.repoPrefix || resolved.startsWith(mapping.repoPrefix)) {
			if (mapping.stripFilename) {
				resolved = stripFilename(resolved)
			}

			const suffix = resolved.slice(mapping.repoPrefix.length)
			const suffixToUse =
				mapping.urlPrefix.endsWith('/') && suffix.startsWith('/') ? suffix.slice(1) : suffix

			return { url: mapping.urlPrefix + suffixToUse, matched: true }
		}
	}

	// No mapping matched: either a published site path (pass through) or an
	// in-repo file not served by the site (rewrite to a GitHub link).
	if (isNonPublishedRepoPath(resolved, process.cwd())) {
		return { url: githubBlobUrl(resolved), matched: true }
	}

	return { url: resolved, matched: false }
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

				if (SKIPPED_URL_PREFIXES.some(p => url.startsWith(p))) {
					return
				}

				// Check forbidden prefixes
				for (const prefix of FORBIDDEN_GITHUB_PREFIXES) {
					if (
						url.startsWith(prefix) &&
						!ALLOWED_GITHUB_URLS.has(url) &&
						!isNonServedGithubUrl(url)
					) {
						ctx.report({
							message: `Forbidden URL prefix: ${prefix} (URL: ${url})`,
							node,
							severity: 'error',
						})

						return
					}
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

export function createStripFirstH1Plugin() {
	return defineHastPlugin({
		name: 'strip-first-h1',
		element: {
			filter: ['h1'],
			visit(node, ctx) {
				if (!ctx.data.stripFirstH1Done) {
					ctx.data.stripFirstH1Done = true
					ctx.removeNode(node)
				}
			},
		},
	})
}
