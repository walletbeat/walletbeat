import sharp from 'sharp'

/** The 8-byte signature every PNG file starts with. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** PNG color type for indexed-color (palette) images. */
const COLOR_TYPE_PALETTE = 3

/** PNG color types that carry an alpha channel (grayscale+alpha, RGBA). */
const COLOR_TYPES_WITH_ALPHA: Set<number> = new Set([4, 6])

/** PNG color types that carry color (RGB, palette, RGBA). */
const COLOR_TYPES_WITH_COLOR: Set<number> = new Set([2, 3, 6])

/**
 * Ancillary chunks that affect how the image is displayed (color space,
 * gamma, HDR metadata, physical pixel size, orientation). These are copied
 * as-is from the original file into the re-encoded one, so re-encoding never
 * changes how the image renders.
 *
 * Every other ancillary chunk (text, timestamps, background color hints,
 * significant bits, application-private chunks) does not affect rendering
 * and is dropped.
 */
const PRESERVED_CHUNK_TYPES: Set<string> = new Set([
	'cHRM',
	'cICP',
	'cLLI',
	'eXIf',
	'gAMA',
	'iCCP',
	'mDCV',
	'pHYs',
	'sRGB',
])

/**
 * Recompressing a PNG is only worth it (and the file only counts as not
 * optimized) when it saves at least this fraction of the file size...
 */
export const PNG_MIN_SAVINGS_RATIO = 0.05

/** ...and at least this many bytes. */
export const PNG_MIN_SAVINGS_BYTES = 1024

/**
 * Whether recompressing a PNG from `originalSize` to `recompressedSize` bytes
 * saves enough to be worth a new copy of the file.
 */
export function isWorthRecompressing(originalSize: number, recompressedSize: number): boolean {
	const savings = originalSize - recompressedSize

	return savings >= PNG_MIN_SAVINGS_BYTES && savings >= originalSize * PNG_MIN_SAVINGS_RATIO
}

/** A single chunk of a PNG file. */
export interface PngChunk {
	/** Four-character chunk type, e.g. `IHDR`. */
	type: string
	/** The full chunk bytes: length, type, data and CRC. */
	bytes: Buffer
}

/** The fields of a PNG `IHDR` chunk that matter for re-encoding. */
export interface PngHeader {
	width: number
	height: number
	bitDepth: number
	colorType: number
}

/** Whether a buffer starts with the PNG signature. */
export function isPng(buffer: Buffer): boolean {
	return buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE)
}

/**
 * Split a PNG file into its chunks, up to and including `IEND`. Any bytes
 * after `IEND` are ignored.
 */
export function parsePngChunks(png: Buffer): PngChunk[] {
	if (!isPng(png)) {
		throw new Error('not a PNG file')
	}

	const chunks: PngChunk[] = []
	let offset = PNG_SIGNATURE.length

	while (offset + 12 <= png.length) {
		const length = png.readUInt32BE(offset)
		const end = offset + 12 + length

		if (end > png.length) {
			throw new Error(`truncated PNG chunk at offset ${offset}`)
		}

		const type = png.toString('latin1', offset + 4, offset + 8)

		chunks.push({ type, bytes: png.subarray(offset, end) })
		offset = end

		if (type === 'IEND') {
			return chunks
		}
	}

	throw new Error('PNG file has no IEND chunk')
}

/** Read the header of a PNG file. */
export function readPngHeader(chunks: PngChunk[]): PngHeader {
	const ihdr = chunks.at(0)

	if (ihdr === undefined || ihdr.type !== 'IHDR') {
		throw new Error('PNG file does not start with an IHDR chunk')
	}

	return {
		width: ihdr.bytes.readUInt32BE(8),
		height: ihdr.bytes.readUInt32BE(12),
		bitDepth: ihdr.bytes[16],
		colorType: ihdr.bytes[17],
	}
}

/**
 * Load a PNG for pixel-exact processing: no color management, no orientation
 * changes, and 16-bit images kept at 16 bits per sample.
 */
function loadPixels(png: Buffer, header: PngHeader): ReturnType<typeof sharp> {
	const image = sharp(png, { ignoreIcc: true })

	if (header.bitDepth === 16) {
		return image.toColourspace(COLOR_TYPES_WITH_COLOR.has(header.colorType) ? 'rgb16' : 'grey16')
	}

	return image
}

/**
 * Losslessly re-encode a PNG at maximum zlib compression with adaptive
 * filtering.
 *
 * The pixel values, bit depth and every chunk that affects rendering (see
 * `PRESERVED_CHUNK_TYPES`) are kept. An alpha channel that is fully opaque is
 * dropped. Palette images are returned unchanged, since re-encoding them as
 * truecolor would make them larger.
 *
 * The result may be larger than the input; callers decide whether to use it.
 */
export async function recompressPng(png: Buffer): Promise<Buffer> {
	const chunks = parsePngChunks(png)
	const header = readPngHeader(chunks)

	if (header.colorType === COLOR_TYPE_PALETTE) {
		return png
	}

	let image = loadPixels(png, header)
	const hasTransparencyChunk = chunks.some(chunk => chunk.type === 'tRNS')

	if (COLOR_TYPES_WITH_ALPHA.has(header.colorType) || hasTransparencyChunk) {
		const { isOpaque } = await loadPixels(png, header).stats()

		if (isOpaque) {
			image = image.removeAlpha()
		}
	}

	const encoded = await image
		.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
		.toBuffer()
	const encodedChunks = parsePngChunks(encoded)
	const preserved = chunks.filter(chunk => PRESERVED_CHUNK_TYPES.has(chunk.type))
	const imageData = encodedChunks.filter(chunk => chunk.type === 'IDAT')
	const encodedHeader = encodedChunks[0]
	const end = encodedChunks[encodedChunks.length - 1]

	return Buffer.concat([
		PNG_SIGNATURE,
		encodedHeader.bytes,
		...preserved.map(chunk => chunk.bytes),
		...imageData.map(chunk => chunk.bytes),
		end.bytes,
	])
}

/**
 * Whether two PNGs decode to exactly the same pixels (same dimensions and
 * sample values, with a missing alpha channel treated as fully opaque).
 */
export async function hasSamePixels(a: Buffer, b: Buffer): Promise<boolean> {
	const [left, right] = await Promise.all([decodePixels(a), decodePixels(b)])

	return (
		left.bitDepth === right.bitDepth &&
		left.width === right.width &&
		left.height === right.height &&
		left.channels === right.channels &&
		left.data.equals(right.data)
	)
}

/** Decoded pixels of a PNG, always with an alpha channel. */
interface DecodedPixels {
	data: Buffer
	width: number
	height: number
	channels: number
	bitDepth: number
}

async function decodePixels(png: Buffer): Promise<DecodedPixels> {
	const header = readPngHeader(parsePngChunks(png))
	const bitDepth = header.colorType === COLOR_TYPE_PALETTE ? 8 : header.bitDepth
	const { data, info } = await loadPixels(png, header)
		.ensureAlpha()
		.raw({ depth: bitDepth === 16 ? 'ushort' : 'uchar' })
		.toBuffer({ resolveWithObject: true })

	return { data, width: info.width, height: info.height, channels: info.channels, bitDepth }
}
