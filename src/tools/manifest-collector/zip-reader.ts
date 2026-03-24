import * as zlib from 'node:zlib'

const EOCD_SIGNATURE = 0x06054b50
const CD_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50

const EOCD_MIN_SIZE = 22
const CD_ENTRY_FIXED_SIZE = 46
const LOCAL_HEADER_FIXED_SIZE = 30

const COMPRESSION_STORED = 0
const COMPRESSION_DEFLATE = 8

/**
 * Reads the contents of a named file from a ZIP buffer.
 *
 * Uses the Central Directory at the end of the ZIP to locate the file, then
 * reads the Local File Header and decompresses the data.
 */
export function readFileFromZip(zipBuffer: Buffer, filename: string): Buffer {
	const eocdOffset = findEocd(zipBuffer)
	const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10)
	const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16)

	let pos = cdOffset

	for (let i = 0; i < totalEntries; i++) {
		if (zipBuffer.readUInt32LE(pos) !== CD_SIGNATURE) {
			throw new Error(`Expected Central Directory signature at offset ${pos}`)
		}

		const compressionMethod = zipBuffer.readUInt16LE(pos + 10)
		const compressedSize = zipBuffer.readUInt32LE(pos + 20)
		const fileNameLength = zipBuffer.readUInt16LE(pos + 28)
		const extraFieldLength = zipBuffer.readUInt16LE(pos + 30)
		const fileCommentLength = zipBuffer.readUInt16LE(pos + 32)
		const localHeaderOffset = zipBuffer.readUInt32LE(pos + 42)
		const entryFileName = zipBuffer.toString(
			'utf8',
			pos + CD_ENTRY_FIXED_SIZE,
			pos + CD_ENTRY_FIXED_SIZE + fileNameLength,
		)

		if (entryFileName === filename) {
			return extractLocalFile(zipBuffer, localHeaderOffset, compressionMethod, compressedSize)
		}

		pos += CD_ENTRY_FIXED_SIZE + fileNameLength + extraFieldLength + fileCommentLength
	}

	throw new Error(`File '${filename}' not found in ZIP`)
}

function findEocd(zipBuffer: Buffer): number {
	// Search backwards — EOCD is near the end, possibly followed by a comment.
	for (let i = zipBuffer.length - EOCD_MIN_SIZE; i >= 0; i--) {
		if (zipBuffer.readUInt32LE(i) === EOCD_SIGNATURE) {
			return i
		}
	}
	throw new Error('Not a valid ZIP file: End of Central Directory not found')
}

function extractLocalFile(
	zipBuffer: Buffer,
	localHeaderOffset: number,
	compressionMethod: number,
	compressedSize: number,
): Buffer {
	if (zipBuffer.readUInt32LE(localHeaderOffset) !== LOCAL_SIGNATURE) {
		throw new Error(`Expected Local File Header signature at offset ${localHeaderOffset}`)
	}

	const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26)
	const localExtraFieldLength = zipBuffer.readUInt16LE(localHeaderOffset + 28)
	const dataOffset =
		localHeaderOffset + LOCAL_HEADER_FIXED_SIZE + localFileNameLength + localExtraFieldLength
	const compressedData = zipBuffer.subarray(dataOffset, dataOffset + compressedSize)

	if (compressionMethod === COMPRESSION_STORED) {
		return compressedData
	}

	if (compressionMethod === COMPRESSION_DEFLATE) {
		const view = new Uint8Array(
			compressedData.buffer,
			compressedData.byteOffset,
			compressedData.byteLength,
		)

		return Buffer.from(zlib.inflateRawSync(view))
	}

	throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`)
}
