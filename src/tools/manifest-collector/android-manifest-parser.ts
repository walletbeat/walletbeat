import {
	AndroidPermission,
	IosUsageDescription,
} from '@/schema/features/security/security-best-practices'

/**
 * Parses an AndroidManifest.xml string and returns the declared permissions.
 *
 * Extracts all `<uses-permission android:name="...">` entries and maps them
 * to `AndroidPermission` enum values. Unrecognized permissions are returned
 * separately so they can be reviewed and added to the enum if needed.
 */
export function parseAndroidManifest(xmlText: string): {
	permissions: AndroidPermission[]
	unrecognized: string[]
} {
	const known = new Map<string, AndroidPermission>(
		Object.values(AndroidPermission).map(v => [v, v]),
	)

	const permissions: AndroidPermission[] = []
	const unrecognized: string[] = []

	// Match <uses-permission android:name="..."> (single or double quotes)
	const pattern = /<uses-permission\s[^>]*android:name=["']([^"']+)["']/g
	let match: RegExpExecArray | null

	while ((match = pattern.exec(xmlText)) !== null) {
		const name = match[1]
		const known_perm = known.get(name)

		if (known_perm !== undefined) {
			if (!permissions.includes(known_perm)) {
				permissions.push(known_perm)
			}
		} else {
			if (!unrecognized.includes(name)) {
				unrecognized.push(name)
			}
		}
	}

	return { permissions, unrecognized }
}

/**
 * Parses an iOS Info.plist XML string and returns the declared usage descriptions.
 *
 * Extracts `NS*UsageDescription` keys and maps them to `IosUsageDescription`
 * enum values. Unrecognized keys are returned separately.
 */
export function parseIosPlist(plistText: string): {
	usageDescriptions: IosUsageDescription[]
	unrecognized: string[]
} {
	const known = new Map<string, IosUsageDescription>(
		Object.values(IosUsageDescription).map(v => [v, v]),
	)

	const usageDescriptions: IosUsageDescription[] = []
	const unrecognized: string[] = []

	// Match <key>NS*UsageDescription</key>
	const pattern = /<key>(NS\w+UsageDescription)<\/key>/g
	let match: RegExpExecArray | null

	while ((match = pattern.exec(plistText)) !== null) {
		const key = match[1]
		const known_desc = known.get(key)

		if (known_desc !== undefined) {
			if (!usageDescriptions.includes(known_desc)) {
				usageDescriptions.push(known_desc)
			}
		} else {
			if (!unrecognized.includes(key)) {
				unrecognized.push(key)
			}
		}
	}

	return { usageDescriptions, unrecognized }
}

function enumKey<T extends Record<string, string>>(enumObj: T, value: string): string {
	for (const k in enumObj) {
		if (enumObj[k] === value) {
			return k
		}
	}

	return value
}

/**
 * Renders `AndroidPermission[]` as a TypeScript code snippet for the
 * `MobileAppManifest.android.usesPermissions` field.
 */
export function renderAndroidPermissions(permissions: AndroidPermission[]): string {
	const t = '\t'

	if (permissions.length === 0) {
		return 'android: { usesPermissions: [] }'
	}

	const lines = permissions
		.map(p => `${t}${t}AndroidPermission.${enumKey(AndroidPermission, p)},`)
		.join('\n')

	return `android: {\n${t}usesPermissions: [\n${lines}\n${t}],\n}`
}

/**
 * Renders `IosUsageDescription[]` as a TypeScript code snippet for the
 * `MobileAppManifest.ios.usageDescriptions` field.
 */
export function renderIosUsageDescriptions(descriptions: IosUsageDescription[]): string {
	const t = '\t'

	if (descriptions.length === 0) {
		return 'ios: { usageDescriptions: [] }'
	}

	const lines = descriptions
		.map(d => `${t}${t}IosUsageDescription.${enumKey(IosUsageDescription, d)},`)
		.join('\n')

	return `ios: {\n${t}usageDescriptions: [\n${lines}\n${t}],\n}`
}
