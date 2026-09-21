import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const IMAGE_EXTENSIONS = new Set(['.png', '.gif', '.jpg', '.jpeg', '.webp', '.svg'])

/**
 * Check if a path corresponds to an image file.
 */
export function isImagePath(slug: string | undefined): boolean {
	if (!slug) {
		return false
	}

	const ext = '.' + slug.split('.').pop()?.toLowerCase()

	return IMAGE_EXTENSIONS.has(ext)
}

/**
 * Recursively find all image files in a directory.
 * Returns paths relative to the given directory.
 */
export function findImages(dir: string): string[] {
	const results: string[] = []
	const entries = readdirSync(dir, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = join(dir, entry.name)

		if (entry.isDirectory()) {
			results.push(...findImages(fullPath))
		} else if (entry.isFile()) {
			const ext = '.' + entry.name.split('.').pop()?.toLowerCase()

			if (IMAGE_EXTENSIONS.has(ext)) {
				results.push(relative(dir, fullPath))
			}
		}
	}

	return results
}

/**
 * Content type mapping for image extensions.
 */
const CONTENT_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
}

/**
 * Handle an image request by reading the file from disk.
 * Returns a Response with the image data, or a 404 if not found.
 */
export function handleImageRequest(slug: string, imageDir: string): Response {
	const filePath = join(imageDir, slug)

	try {
		const buffer = readFileSync(filePath)
		const ext = '.' + slug.split('.').pop()?.toLowerCase()
		const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'

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

/**
 * Check if the current request is for an image and serve it.
 * Returns a Response if an image should be served, undefined otherwise.
 */
export function tryServeImage(
	request: Request,
	urlPrefix: string,
	imageDir: string,
): Response | undefined {
	const url = new URL(request.url)
	const pathname = url.pathname
	const slugPrefix = `${urlPrefix}/`

	if (!pathname.startsWith(slugPrefix)) {
		return undefined
	}

	const slug = pathname.slice(slugPrefix.length)

	if (!isImagePath(slug)) {
		return undefined
	}

	return handleImageRequest(slug, imageDir)
}
