import { unzipSync } from 'fflate'

/**
 * Reads the contents of a named file from a ZIP buffer.
 */
export function readFileFromZip(zipBuffer: Buffer, filename: string): Buffer {
	const files = unzipSync(new Uint8Array(zipBuffer), { filter: f => f.name === filename })
	const data = files[filename]

	if (data === undefined) {
		throw new Error(`File '${filename}' not found in ZIP`)
	}

	return Buffer.from(data)
}
