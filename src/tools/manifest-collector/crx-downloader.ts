import * as http from 'node:http'
import * as https from 'node:https'

import { readFileFromZip } from './zip-reader'

const CRX3_MAGIC = 'Cr24'
const CRX3_VERSION = 3
const CRX_HEADER_PREFIX_SIZE = 12 // 4 magic + 4 version + 4 headerSize

const MAX_REDIRECTS = 5

/**
 * Downloads the manifest.json from a Chrome extension via the Chrome Web Store.
 *
 * Downloads the CRX3 file, strips the protobuf header, and extracts
 * manifest.json from the embedded ZIP archive.
 */
export async function fetchBrowserExtensionManifest(extensionId: string): Promise<unknown> {
	const crxBuffer = await downloadCrx(extensionId)
	const zipBuffer = extractZipFromCrx(crxBuffer)
	const manifestBytes = readFileFromZip(zipBuffer, 'manifest.json')

	return JSON.parse(manifestBytes.toString('utf8')) as unknown
}

function extractZipFromCrx(crxBuffer: Buffer): Buffer {
	const magic = crxBuffer.toString('ascii', 0, 4)

	if (magic !== CRX3_MAGIC) {
		throw new Error(`Not a valid CRX file — unexpected magic bytes: ${JSON.stringify(magic)}`)
	}

	const version = crxBuffer.readUInt32LE(4)

	if (version !== CRX3_VERSION) {
		throw new Error(`Unsupported CRX version: ${version} (expected 3)`)
	}

	const headerSize = crxBuffer.readUInt32LE(8)
	const zipOffset = CRX_HEADER_PREFIX_SIZE + headerSize

	return crxBuffer.subarray(zipOffset)
}

function downloadCrx(extensionId: string): Promise<Buffer> {
	// Chrome Web Store CRX download endpoint.
	// The `x` parameter is a URL-encoded query string for the extension update check.
	const innerQuery = encodeURIComponent(`id=${extensionId}&installsource=ondemand&uc`)
	const url =
		'https://clients2.google.com/service/update2/crx' +
		'?response=redirect' +
		'&prodversion=120.0' +
		'&acceptformat=crx3' +
		`&x=${innerQuery}`

	return fetchBuffer(url, MAX_REDIRECTS)
}

function fetchBuffer(url: string, remainingRedirects: number): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const client = url.startsWith('https') ? https : http

		client
			.get(url, res => {
				const { statusCode, headers } = res

				if (
					statusCode !== undefined &&
					statusCode >= 300 &&
					statusCode < 400 &&
					headers.location !== undefined
				) {
					if (remainingRedirects <= 0) {
						reject(new Error(`Too many redirects fetching: ${url}`))

						return
					}

					resolve(fetchBuffer(headers.location, remainingRedirects - 1))
					res.resume()

					return
				}

				if (statusCode !== 200) {
					reject(new Error(`HTTP ${statusCode ?? 'unknown'} fetching: ${url}`))
					res.resume()

					return
				}

				const chunks: Uint8Array[] = []
				let totalLength = 0

				res.on('data', (chunk: Uint8Array) => {
					chunks.push(chunk)
					totalLength += chunk.byteLength
				})
				res.on('end', () => {
					const result = new Uint8Array(totalLength)
					let offset = 0

					for (const chunk of chunks) {
						result.set(chunk, offset)
						offset += chunk.byteLength
					}

					resolve(Buffer.from(result))
				})
				res.on('error', reject)
			})
			.on('error', reject)
	})
}

/**
 * Fetches the raw text content of a URL (for AndroidManifest.xml or Info.plist from GitHub).
 */
export async function fetchText(url: string): Promise<string> {
	const buffer = await fetchBuffer(url, MAX_REDIRECTS)

	return buffer.toString('utf8')
}
