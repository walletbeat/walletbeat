import { DOMParser } from '@xmldom/xmldom'

import {
	AndroidPermission,
	androidPermissions,
	IosUsageDescription,
	iosUsageDescriptions,
	type MobileAppManifest,
} from '@/schema/features/security/security-best-practices'

const ANDROID_NS = 'http://schemas.android.com/apk/res/android'

/**
 * Parses an AndroidManifest.xml string and returns the declared permissions.
 *
 * Extracts all `<uses-permission android:name="...">` entries and maps them
 * to `AndroidPermission` enum values. Throws if an unrecognized permission is
 * encountered — add it to the `AndroidPermission` enum if it is security-relevant,
 * or explicitly ignore it there if not.
 */
export function parseAndroidManifest(xmlText: string): Set<AndroidPermission> {
	const permissions = new Set<AndroidPermission>()

	const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
	const elements = doc.getElementsByTagName('uses-permission')

	for (let i = 0; i < elements.length; i++) {
		const name = elements[i].getAttributeNS(ANDROID_NS, 'name')

		if (name === null) {
			throw new Error(
				`<uses-permission> element at index ${i} is missing the android:name attribute`,
			)
		}

		if (!androidPermissions.is(name)) {
			throw new Error(
				`Unrecognized Android permission: "${name}"\n` +
					'Add it to the AndroidPermission enum in src/schema/features/security/security-best-practices.ts.',
			)
		}

		permissions.add(name)
	}

	return permissions
}

/**
 * Parses an iOS Info.plist XML string and returns the declared usage descriptions.
 *
 * Extracts `NS*UsageDescription` keys and maps them to `IosUsageDescription`
 * enum values. Throws if an unrecognized key is encountered — add it to the
 * `IosUsageDescription` enum if it is security-relevant, or explicitly ignore
 * it there if not.
 */
/**
 * Parses a pre-parsed mobile manifest JSON object (android.parsed.json /
 * ios.parsed.json) into a typed `MobileAppManifest`.
 *
 * Pass `'NOT_AN_ANDROID_APP'` or `'NOT_AN_IOS_APP'` for platforms the wallet
 * does not support.
 */
export function parseMobileManifestJson(androidRaw: unknown, iosRaw: unknown): MobileAppManifest {
	let android: MobileAppManifest['android']

	if (androidRaw === 'NOT_AN_ANDROID_APP') {
		android = 'NOT_AN_ANDROID_APP'
	} else {
		if (typeof androidRaw !== 'object' || androidRaw === null) {
			throw new Error(`Expected android manifest to be an object, got ${typeof androidRaw}`)
		}

		const perms = Reflect.get(androidRaw, 'usesPermissions') as unknown

		if (!Array.isArray(perms)) {
			throw new Error('Expected "usesPermissions" to be an array')
		}

		const usesPermissions: AndroidPermission[] = perms.map((p: unknown, i: number) => {
			if (typeof p !== 'string') {
				throw new Error(`Expected "usesPermissions"[${i}] to be a string, got ${typeof p}`)
			}

			if (!androidPermissions.is(p)) {
				throw new Error(
					`Unrecognized Android permission: "${p}"\n` +
						'Add it to the AndroidPermission enum in src/schema/features/security/security-best-practices.ts.',
				)
			}

			return p
		})

		android = { usesPermissions }
	}

	let ios: MobileAppManifest['ios']

	if (iosRaw === 'NOT_AN_IOS_APP') {
		ios = 'NOT_AN_IOS_APP'
	} else {
		if (typeof iosRaw !== 'object' || iosRaw === null) {
			throw new Error(`Expected iOS manifest to be an object, got ${typeof iosRaw}`)
		}

		const usageKeys = Reflect.get(iosRaw, 'usageDescriptions') as unknown

		if (!Array.isArray(usageKeys)) {
			throw new Error('Expected "usageDescriptions" to be an array')
		}

		const usageDescriptions: IosUsageDescription[] = usageKeys.map((d: unknown, i: number) => {
			if (typeof d !== 'string') {
				throw new Error(`Expected "usageDescriptions"[${i}] to be a string, got ${typeof d}`)
			}

			if (!iosUsageDescriptions.is(d)) {
				throw new Error(
					`Unrecognized iOS usage description key: "${d}"\n` +
						'Add it to the IosUsageDescription enum in src/schema/features/security/security-best-practices.ts.',
				)
			}

			return d
		})

		ios = { usageDescriptions }
	}

	return { android, ios }
}

export function parseIosPlist(plistText: string): Set<IosUsageDescription> {
	const usageDescriptions = new Set<IosUsageDescription>()

	const doc = new DOMParser().parseFromString(plistText, 'text/xml')
	const keyElements = doc.getElementsByTagName('key')

	for (let i = 0; i < keyElements.length; i++) {
		const text = keyElements[i].textContent

		if (text === null) {
			throw new Error(`<key> element at index ${i} has no text content`)
		}

		if (!/^NS\w+UsageDescription$/.test(text)) {
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

	return usageDescriptions
}
