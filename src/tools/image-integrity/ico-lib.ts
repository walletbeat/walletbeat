import sharp from 'sharp'

/**
 * A generic reader for Windows ICO (icon) containers.
 */

/** The format of an embedded ICO frame. */
export type IcoFrameFormat = 'png' | 'bmp'

/** One embedded image inside an ICO container. */
export interface IcoImage {
	/** Declared width in pixels (256 when the entry encodes it as 0). */
	width: number
	/** Declared height in pixels (256 when the entry encodes it as 0). */
	height: number
	/** Number of colors in the palette (0 when not applicable). */
	colorCount: number
	/** Color planes (1 for ICO; the cursor hotspot X for CUR). */
	planes: number
	/** Bits per pixel (24 or 32 for BMP frames, 0/32 for PNG frames). */
	bitCount: number
	/** Detected format of the embedded image data. */
	format: IcoFrameFormat
	/** Raw bytes of the embedded image (a PNG file or a BITMAPINFOHEADER BMP). */
	payload: Buffer
}

/** Raw, tightly-packed pixel data for an image. */
export interface RawImage {
	data: Buffer
	width: number
	height: number
	/** Channels per pixel (always 4 for decoded ICO frames: RGBA). */
	channels: number
}

/**
 * Detect whether a buffer begins with an ICO/CUR container header
 * (`00 00 01 00` for ICO, `00 00 02 00` for CUR).
 */
export function isIco(buffer: Uint8Array): boolean {
	return (
		buffer.length >= 4 &&
		buffer[0] === 0x00 &&
		buffer[1] === 0x00 &&
		buffer[2] === 0x01 &&
		buffer[3] === 0x00
	)
}

/** Read a little-endian UInt16 at `offset` from a `Uint8Array`. */
function readU16(buffer: Uint8Array, offset: number): number {
	return buffer[offset] | (buffer[offset + 1] << 8)
}

/** Read a little-endian UInt32 at `offset` from a `Uint8Array`. */
function readU32(buffer: Uint8Array, offset: number): number {
	return (
		buffer[offset] |
		(buffer[offset + 1] << 8) |
		(buffer[offset + 2] << 16) |
		(buffer[offset + 3] << 24)
	)
}

/** Read a little-endian Int32 at `offset` from a `Uint8Array`. */
function readI32(buffer: Uint8Array, offset: number): number {
	return readU32(buffer, offset) | 0
}

/** Detect the format of an embedded image payload from its signature. */
function detectEmbeddedFormat(payload: Uint8Array): IcoFrameFormat | null {
	if (
		payload.length >= 8 &&
		payload[0] === 0x89 &&
		payload[1] === 0x50 &&
		payload[2] === 0x4e &&
		payload[3] === 0x47
	) {
		return 'png'
	}

	if (payload.length >= 2 && payload[0] === 0x42 && payload[1] === 0x4d) {
		return 'bmp'
	}

	return null
}

/**
 * Parse an ICO container into its embedded images.
 *
 * @param buffer The raw ICO file bytes.
 * @returns The parsed frames, in directory order.
 * @throws If the buffer is not an ICO container or is malformed.
 */
export function parseIco(buffer: Uint8Array): IcoImage[] {
	if (!isIco(buffer)) {
		throw new Error('not an ICO container (expected a 00 00 01 00 header)')
	}

	if (buffer.length < 6) {
		throw new Error('ICO header is truncated')
	}

	const count = readU16(buffer, 4)

	if (count === 0) {
		throw new Error('ICO container contains no images')
	}

	const images: IcoImage[] = []

	for (let index = 0; index < count; index++) {
		const entryOffset = 6 + index * 16

		if (entryOffset + 16 > buffer.length) {
			throw new Error(`ICO image directory entry ${index} is truncated`)
		}

		// A width/height byte of 0 denotes 256 (the ICO spec cannot store 256 in a byte).
		const width = buffer[entryOffset] === 0 ? 256 : buffer[entryOffset]
		const height = buffer[entryOffset + 1] === 0 ? 256 : buffer[entryOffset + 1]
		const colorCount = buffer[entryOffset + 2]
		const planes = readU16(buffer, entryOffset + 4)
		const bitCount = readU16(buffer, entryOffset + 6)
		const bytesInRes = readU32(buffer, entryOffset + 8)
		const imageOffset = readU32(buffer, entryOffset + 12)

		if (imageOffset + bytesInRes > buffer.length) {
			throw new Error(`ICO image ${index} data extends past the end of the file`)
		}

		const payload = buffer.subarray(imageOffset, imageOffset + bytesInRes)
		const format = detectEmbeddedFormat(payload)

		if (format === null) {
			throw new Error(`ICO image ${index} has an unsupported embedded format`)
		}

		images.push({
			width,
			height,
			colorCount,
			planes,
			bitCount,
			format,
			payload: Buffer.from(payload),
		})
	}

	return images
}

/**
 * Decode an uncompressed (BI_RGB) 24-bit or 32-bit BMP frame into RGBA pixels.
 */
function decodeBmp(payload: Uint8Array): RawImage {
	if (payload.length < 40) {
		throw new Error('BMP frame is shorter than a BITMAPINFOHEADER')
	}

	const headerSize = readU32(payload, 0)

	if (headerSize < 40) {
		throw new Error(`unsupported BMP header size ${headerSize}`)
	}

	const width = readI32(payload, 4)
	const combinedHeight = readI32(payload, 8)
	const planes = readU16(payload, 12)
	const bitCount = readU16(payload, 14)
	const compression = readU32(payload, 16)

	if (compression !== 0) {
		throw new Error(`unsupported BMP compression ${compression}`)
	}

	if (planes !== 1) {
		throw new Error(`unsupported BMP plane count ${planes}`)
	}

	if (bitCount !== 24 && bitCount !== 32) {
		throw new Error(`unsupported BMP bit depth ${bitCount}`)
	}

	if (width <= 0) {
		throw new Error(`invalid BMP width ${width}`)
	}

	const height = Math.abs(combinedHeight) / 2

	if (!Number.isInteger(height) || height <= 0) {
		throw new Error(`invalid BMP height ${combinedHeight}`)
	}

	const bytesPerPixel = bitCount / 8
	const rowStride = Math.ceil((width * bitCount) / 32) * 4
	const pixelDataStart = headerSize
	const xorSize = rowStride * height

	if (pixelDataStart + xorSize > payload.length) {
		throw new Error('BMP pixel data is truncated')
	}

	// For 24-bit frames, transparency comes from the 1-bit AND mask that
	// follows the XOR image. A set bit means transparent.
	const andStride = Math.ceil(width / 32) * 4
	const andStart = pixelDataStart + xorSize

	const out = Buffer.alloc(width * height * 4)

	for (let y = 0; y < height; y++) {
		const rowStart = pixelDataStart + (height - 1 - y) * rowStride

		for (let x = 0; x < width; x++) {
			const px = rowStart + x * bytesPerPixel
			const blue = payload[px]
			const green = payload[px + 1]
			const red = payload[px + 2]
			let alpha = 255

			if (bitCount === 32) {
				alpha = payload[px + 3]
			} else if (andStart + (height - 1 - y) * andStride + (x >> 3) < payload.length) {
				const maskByte = payload[andStart + (height - 1 - y) * andStride + (x >> 3)]

				if ((maskByte & (0x80 >> (x & 7))) !== 0) {
					alpha = 0
				}
			}

			const outOffset = (y * width + x) * 4

			out[outOffset] = red
			out[outOffset + 1] = green
			out[outOffset + 2] = blue
			out[outOffset + 3] = alpha
		}
	}

	return { data: out, width, height, channels: 4 }
}

/**
 * Decode a single ICO frame to raw, tightly packed RGBA pixels.
 *
 * @throws If the frame's image data cannot be decoded.
 */
export async function decodeIcoImage(image: IcoImage): Promise<RawImage> {
	if (image.format === 'png') {
		const { data, info } = await sharp(image.payload)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true })

		return { data, width: info.width, height: info.height, channels: info.channels }
	}

	return decodeBmp(image.payload)
}
