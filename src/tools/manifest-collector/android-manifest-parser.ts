import { DOMParser } from '@xmldom/xmldom'

import {
	AndroidPermission,
	androidPermissions,
	IosUsageDescription,
	iosUsageDescriptions,
} from '@/schema/features/security/security-best-practices'
import { enumKey } from '@/utils/enum'

const ANDROID_NS = 'http://schemas.android.com/apk/res/android'

/**
 * Parses an AndroidManifest.xml string and returns the declared permissions.
 *
 * Extracts all `<uses-permission android:name="...">` entries and maps them
 * to `AndroidPermission` enum values. Throws if an unrecognized permission is
 * encountered — add it to the `AndroidPermission` enum if it is security-relevant,
 * or explicitly ignore it there if not.
 */
export function parseAndroidManifest(xmlText: string): AndroidPermission[] {
	const permissions = new Set<AndroidPermission>()

	const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
	const elements = doc.getElementsByTagName('uses-permission')

	for (let i = 0; i < elements.length; i++) {
		const name = elements[i].getAttributeNS(ANDROID_NS, 'name')

		if (name === null) {
			continue
		}

		if (!androidPermissions.is(name)) {
			throw new Error(
				`Unrecognized Android permission: "${name}"\n` +
					'Add it to the AndroidPermission enum in src/schema/features/security/security-best-practices.ts.',
			)
		}

		permissions.add(name)
	}

	return [...permissions]
}

/**
 * Parses an iOS Info.plist XML string and returns the declared usage descriptions.
 *
 * Extracts `NS*UsageDescription` keys and maps them to `IosUsageDescription`
 * enum values. Throws if an unrecognized key is encountered — add it to the
 * `IosUsageDescription` enum if it is security-relevant, or explicitly ignore
 * it there if not.
 */
export function parseIosPlist(plistText: string): IosUsageDescription[] {
	const usageDescriptions = new Set<IosUsageDescription>()

	const doc = new DOMParser().parseFromString(plistText, 'text/xml')
	const keyElements = doc.getElementsByTagName('key')

	for (let i = 0; i < keyElements.length; i++) {
		const text = keyElements[i].textContent

		if (text === null || !/^NS\w+UsageDescription$/.test(text)) {
			continue
		}

		if (!iosUsageDescriptions.is(text)) {
			throw new Error(
				`Unrecognized iOS usage description key: "${text}"\n` +
					'Add it to the IosUsageDescription enum in src/schema/features/security/security-best-practices.ts.',
			)
		}

		usageDescriptions.add(text)
	}

	return [...usageDescriptions]
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
