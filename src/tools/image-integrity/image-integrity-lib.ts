import { isIco } from './ico-lib'

/**
 * File extensions that carry raster pixels and so can exhibit JPEG blockiness.
 */
export const RASTER_EXTENSIONS: ReadonlySet<string> = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.webp',
	'.ico',
])

/**
 * The image format that each supported file extension is expected to contain.
 *
 * This is the single source of truth for which file extensions the repository
 * treats as images: an extension is a known image extension exactly when it has
 * an entry here (see {@link isImageExtension}).
 */
export const FORMAT_FOR_EXTENSION: Readonly<Record<string, string>> = {
	'.png': 'png',
	'.jpg': 'jpeg',
	'.jpeg': 'jpeg',
	'.gif': 'gif',
	'.webp': 'webp',
	'.ico': 'ico',
	'.svg': 'svg',
}

/**
 * Whether an extension is one of the image formats the repository supports
 * (i.e. it has an entry in {@link FORMAT_FOR_EXTENSION}).
 */
export function isImageExtension(ext: string): boolean {
	return Object.prototype.hasOwnProperty.call(FORMAT_FOR_EXTENSION, ext)
}

/**
 * Detect an image's actual format from its leading magic bytes, or null when
 * the bytes match no known image format.
 */
export function detectImageFormat(buffer: Uint8Array): string | null {
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (
		buffer.length >= 8 &&
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47
	) {
		return 'png'
	}

	// JPEG: FF D8 FF
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return 'jpeg'
	}

	// GIF: GIF87a / GIF89a
	if (
		buffer.length >= 4 &&
		buffer[0] === 0x47 &&
		buffer[1] === 0x49 &&
		buffer[2] === 0x46 &&
		buffer[3] === 0x38
	) {
		return 'gif'
	}

	// WebP: RIFF....WEBP
	if (
		buffer.length >= 12 &&
		buffer[0] === 0x52 &&
		buffer[1] === 0x49 &&
		buffer[2] === 0x46 &&
		buffer[3] === 0x46 &&
		buffer[8] === 0x57 &&
		buffer[9] === 0x45 &&
		buffer[10] === 0x42 &&
		buffer[11] === 0x50
	) {
		return 'webp'
	}

	if (isIco(buffer)) {
		return 'ico'
	}

	// SVG: XML declaration or an <svg> root element (after an optional BOM).
	const head = Buffer.from(buffer.subarray(0, Math.min(buffer.length, 512)))
		.toString('utf8')
		.replace(/^\uFEFF/, '')
		.trimStart()

	if (head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!DOCTYPE')) {
		return 'svg'
	}

	return null
}
