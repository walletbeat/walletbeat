import { defineHastPlugin } from 'satteri'

import { RENDERED_MARKDOWN_COLLECTIONS } from '@/constants/rendered-collections'

// ---------------------------------------------------------------------------
// URL rewrite plugin for Satteri HAST
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.webp',
	'.svg',
	'.ico',
	'.mp4',
	'.webm',
])

const SKIP_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', '#', '//', 'data:']

const FORBIDDEN_PREFIXES = [
	'https://github.com/walletbeat/walletbeat/blob/',
	'https://github.com/walletbeat/walletbeat/tree/',
]

const ALLOWED_URLS = new Set(['https://github.com/walletbeat/walletbeat'])

interface PathMapping {
	repoPrefix: `/${string}`
	urlPrefix: `/${string}` | `https://${string}`
	stripFilename: boolean
}

const MAPPINGS: PathMapping[] = [
	...Object.values(RENDERED_MARKDOWN_COLLECTIONS).map((collection): PathMapping => ({
		repoPrefix: `${collection.repoDir}/`,
		urlPrefix: `${collection.urlPrefix}/`,
		stripFilename: true,
	})),
	{ repoPrefix: '/public/', urlPrefix: '/', stripFilename: false },
	{ repoPrefix: '/src/pages/', urlPrefix: '/', stripFilename: true },
]

function isImageExtension(path: string): boolean {
	const lower = path.toLowerCase()

	for (const ext of IMAGE_EXTENSIONS) {
		if (lower.endsWith(ext)) {
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

	if (lastSlash > 0) {
		return base.slice(0, lastSlash + 1) + suffix
	}

	return url
}

function rewriteUrl(url: string, sourceDir: string): string {
	if (SKIP_PREFIXES.some(p => url.startsWith(p))) {
		return url
	}

	let resolved = url.startsWith('/') ? url : resolveRelativeUrl(url, sourceDir)

	// Strip filename for pages that map to index.astro routes
	for (const mapping of MAPPINGS) {
		if (mapping.stripFilename) {
			resolved = stripFilename(resolved)
		}
	}

	// Apply prefix mappings (longest match first)
	const sorted = [...MAPPINGS].sort((a, b) => b.repoPrefix.length - a.repoPrefix.length)

	for (const mapping of sorted) {
		if (resolved === mapping.repoPrefix || resolved.startsWith(mapping.repoPrefix)) {
			const suffix = resolved.slice(mapping.repoPrefix.length)
			const suffixToUse =
				mapping.urlPrefix.endsWith('/') && suffix.startsWith('/') ? suffix.slice(1) : suffix

			return mapping.urlPrefix + suffixToUse
		}
	}

	// Root path passes through
	return resolved
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

				if (SKIP_PREFIXES.some(p => url.startsWith(p))) {
					return
				}

				// Check forbidden prefixes
				for (const prefix of FORBIDDEN_PREFIXES) {
					if (url.startsWith(prefix) && !ALLOWED_URLS.has(url)) {
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
						const filePath = ctx.fileURL.pathname
						// Convert absolute file path to repo-relative path
						const repoRoot = process.cwd()

						if (filePath.startsWith(repoRoot)) {
							sourceDir = '/' + filePath.slice(repoRoot.length).replace(/[^/]*$/, '')

							if (!sourceDir.endsWith('/')) {
								sourceDir += '/'
							}
						}
					} catch {
						// Ignore errors deriving source dir
					}
				}

				const rewritten = rewriteUrl(url, sourceDir)

				ctx.setProperty(node, propKey, rewritten)
			},
		},
	})
}

// ---------------------------------------------------------------------------
// Strip first H1 plugin — prevents duplicate H1 when layout already renders title
// ---------------------------------------------------------------------------

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
