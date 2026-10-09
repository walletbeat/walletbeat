import * as fs from 'node:fs'
import * as path from 'node:path'

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

/**
 * Extracts every file in a ZIP buffer into `destDir`.
 * Throws on entries whose path would land outside `destDir`.
 */
export function extractZip(zipBuffer: Buffer, destDir: string): void {
	const root = path.resolve(destDir)

	for (const [name, data] of Object.entries(unzipSync(new Uint8Array(zipBuffer)))) {
		if (name.endsWith('/')) {
			continue
		}

		const target = path.resolve(root, name)

		if (!target.startsWith(root + path.sep)) {
			throw new Error(`ZIP entry escapes the destination directory: ${name}`)
		}

		fs.mkdirSync(path.dirname(target), { recursive: true })
		fs.writeFileSync(target, data)
	}
}
