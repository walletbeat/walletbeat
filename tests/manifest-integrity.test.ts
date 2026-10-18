import { describe, expect, it } from 'vitest'

import {
	AndroidPermission,
	androidPermissions,
	isIgnoredAndroidPermission,
} from '@/schema/features/security/security-best-practices'
import { checkParsedManifests } from '@/tools/manifest-collector/manifest-checker'
import { parseAndroidManifest } from '@/tools/manifest-collector/mobile-manifest-parser'
import { getRepositoryRoot } from '@/utils/codebase'

function androidManifest(permissionNames: string[]): string {
	const usesPermissions = permissionNames
		.map(name => `<uses-permission android:name="${name}" />`)
		.join('')

	return `<manifest xmlns:android="http://schemas.android.com/apk/res/android">${usesPermissions}</manifest>`
}

describe('manifests', () => {
	it('has up-to-date parsed manifest files', async () => {
		const mismatches = await checkParsedManifests(getRepositoryRoot())

		if (mismatches.length > 0) {
			const details = mismatches
				.map(m => `  [${m.walletId}] ${m.parsedFile}: ${m.issue}`)
				.join('\n')

			throw new Error(
				`Parsed manifest files are out of date:\n${details}\n` +
					'Run `pnpm collect:manifests -- --all` to regenerate them.',
			)
		}

		expect(mismatches).toHaveLength(0)
	})
})

describe('parseAndroidManifest', () => {
	it('never ignores an AndroidPermission value', () => {
		expect(androidPermissions.items.filter(isIgnoredAndroidPermission)).toEqual([])
		expect(parseAndroidManifest(androidManifest(androidPermissions.items))).toEqual(
			new Set(androidPermissions.items),
		)
	})

	it.each(['com.ahloop.anon', 'org.toshi', 'io.example.wallet_app'])(
		'ignores the AndroidX app-private receiver permission of %s',
		applicationId => {
			expect(
				parseAndroidManifest(
					androidManifest([
						AndroidPermission.INTERNET,
						`${applicationId}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`,
					]),
				),
			).toEqual(new Set([AndroidPermission.INTERNET]))
		},
	)

	it.each([
		'android.permission.NOT_IN_THE_ENUM',
		'com.example.wallet.CUSTOM_PERMISSION',
		'DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
	])('throws on the unrecognized permission %s', name => {
		expect(() => parseAndroidManifest(androidManifest([name]))).toThrow(
			'Unrecognized Android permission',
		)
	})
})
