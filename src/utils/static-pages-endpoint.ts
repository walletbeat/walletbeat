import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import type { APIRoute } from 'astro'

import { NON_SERVED_EXTENSIONS } from '@/constants/rendered-collections'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'

/**
 * Returns all file paths under `dir`.
 */
function findAllFiles(dir: string): string[] {
	const results: string[] = []

	function walk(currentDir: string): void {
		const entries = readdirSync(currentDir, { withFileTypes: true })

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name)

			if (entry.isDirectory()) {
				walk(fullPath)
			} else if (entry.isFile()) {
				results.push(relative(dir, fullPath))
			}
		}
	}

	walk(dir)

	return results
}

/**
 * Content-type mapping for the file extensions served by the collection
 * endpoints. Must have mappings for all extensions.
 */
const CONTENT_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.pdf': 'application/pdf',
	'.sty': 'text/plain',
	'.tsv': 'text/tab-separated-values',
	'.txt': 'text/plain',
}

/**
 * Return the lowercase file extension (including the leading dot) of a path,
 * or an empty string when the path has no extension.
 */
function extensionOf(file: string): string {
	const dot = file.lastIndexOf('.')

	return dot >= 0 ? file.slice(dot).toLowerCase() : ''
}

/**
 * Build the `getStaticPaths` for a collection endpoint.
 *
 * The route pattern is `[...path].[ext]`.
 * `path` captures everything before the file extension and `ext`
 * captures the extension (e.g. `/docs/foo/bar.png` gives
 * `path = "foo/bar"`, `ext = "png"`).
 */
export function staticPagesDataPaths(repoDir: `/${string}`) {
	const root = getAstroBuildTimeRepositoryRoot()

	return findAllFiles(join(root, repoDir))
		.filter(file => {
			const ext = extensionOf(file)

			// Skip markdown content, non-served extensions (linked to GitHub instead),
			// and files with no extension (which cannot be matched by
			// `[...path].[ext]`).
			return ext !== '' && !file.endsWith('.md') && !NON_SERVED_EXTENSIONS.has(ext)
		})
		.map(file => {
			const ext = extensionOf(file)

			return {
				params: { path: file.slice(0, -ext.length), ext: ext.slice(1) },
			}
		})
}

/**
 * Build the `GET` handler for a collection endpoint. Reads the file from the
 * collection's repo directory (reconstructed from `path` and `ext` params).
 */
export function staticDataGet(repoDir: `/${string}`): APIRoute {
	const root = getAstroBuildTimeRepositoryRoot()

	return ({ params }) => {
		const ext = `.${params.ext ?? ''}`
		const file = `${params.path ?? ''}${ext}`
		const filePath = join(root, repoDir, file)

		try {
			const buffer = readFileSync(filePath)
			const contentType = CONTENT_TYPES[ext]

			if (contentType === undefined || contentType === '') {
				throw new Error(`Cannot determine content-type for '${filePath}'`)
			}

			return new Response(buffer, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=31536000, immutable',
				},
			})
		} catch {
			return new Response('Not found', { status: 404 })
		}
	}
}
