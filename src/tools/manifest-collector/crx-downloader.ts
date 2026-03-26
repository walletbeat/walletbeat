import { readFileFromZip } from './zip-reader'

const CRX3_MAGIC = 'Cr24'
const CRX3_VERSION = 3
const CRX_HEADER_PREFIX_SIZE = 12 // 4 magic + 4 version + 4 headerSize

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

	return fetchBuffer(url)
}

async function fetchBuffer(url: string): Promise<Buffer> {
	const res = await fetch(url)

	if (!res.ok) {
		throw new Error(`HTTP ${res.status.toString()} fetching: ${url}`)
	}

	return Buffer.from(await res.arrayBuffer())
}

/**
 * Fetches the raw text content of a URL (for AndroidManifest.xml or Info.plist from GitHub).
 */
export async function fetchText(url: string): Promise<string> {
	const res = await fetch(url)

	if (!res.ok) {
		throw new Error(`HTTP ${res.status.toString()} fetching: ${url}`)
	}

	return res.text()
}
