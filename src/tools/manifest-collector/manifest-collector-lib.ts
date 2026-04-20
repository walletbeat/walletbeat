import * as prettier from 'prettier'

import { parseBrowserExtensionManifest } from './browser-ext-manifest-parser'
import { parseAndroidManifest, parseIosPlist } from './mobile-manifest-parser'

export async function formatJson(obj: unknown, filePath: string): Promise<string> {
	const config = (await prettier.resolveConfig(filePath)) ?? {}

	return prettier.format(JSON.stringify(obj), { ...config, parser: 'json' })
}

export async function computeBrowserExtParsed(
	rawManifest: unknown,
	parsedPath: string,
): Promise<string> {
	return formatJson(parseBrowserExtensionManifest(rawManifest), parsedPath)
}

export async function computeAndroidParsed(xmlText: string, parsedPath: string): Promise<string> {
	return formatJson({ usesPermissions: [...parseAndroidManifest(xmlText)] }, parsedPath)
}

export async function computeIosParsed(plistText: string, parsedPath: string): Promise<string> {
	return formatJson({ usageDescriptions: [...parseIosPlist(plistText)] }, parsedPath)
}
