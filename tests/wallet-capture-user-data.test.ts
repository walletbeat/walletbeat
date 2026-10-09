import { describe, expect, it } from 'vitest'

import { UserFlow, WalletInfo } from '@/schema/features/privacy/data-collection'
import { Variant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { WalletCaptureAnnotations } from '@/tools/wallet-data-collection/wallet-capture-annotations'
import {
	UserDataString,
	UserDataStringStore,
	WalletCaptureFile,
} from '@/tools/wallet-data-collection/wallet-capture-file'
import { ethereumErc55Address } from '@/types/utils/ethereum-address'

const lowercaseAddress = '0x41c36c21b31c67e1c645cee831dd5e4bfbf0cbc9'
const checksummedAddress = ethereumErc55Address(lowercaseAddress)

/** Builds an in-memory capture file with one request whose payload is `content`. */
function captureWithPayload(declaredAddress: string, content: string): WalletCaptureFile {
	return WalletCaptureFile.fromData(
		{ walletId: 'test', walletType: WalletType.SOFTWARE, walletVariant: Variant.BROWSER },
		{
			userData: [{ str: declaredAddress, piece: WalletInfo.ACCOUNT_ADDRESS }],
			flows: {
				[UserFlow.ONBOARDING_NEW]: {
					requests: [{ domain: 'api.example.com', path: '/v1/track', sessionTime: 0, content }],
				},
			},
		},
		WalletCaptureAnnotations.fromData({}, {}),
	)
}

describe('UserDataStringStore', () => {
	it('matches Ethereum addresses regardless of checksum casing', () => {
		const store = UserDataStringStore.newStore()

		store.add(new UserDataString(checksummedAddress, [WalletInfo.ACCOUNT_ADDRESS], 'MANUAL'))

		expect(store.lookup(lowercaseAddress)?.pieces).toEqual(new Set([WalletInfo.ACCOUNT_ADDRESS]))
		expect(store.lookup(lowercaseAddress.toUpperCase().replace('0X', '0x'))?.str).toBe(
			lowercaseAddress.toUpperCase().replace('0X', '0x'),
		)
		expect(store.get(lowercaseAddress)).toBeUndefined()
	})

	it('merges the pieces of every casing of the same address', () => {
		const store = UserDataStringStore.newStore()

		store.add(new UserDataString(checksummedAddress, [WalletInfo.ACCOUNT_ADDRESS], 'MANUAL'))
		store.add(new UserDataString(lowercaseAddress, [WalletInfo.ASSETS], 'MANUAL'))

		expect(store.lookup(checksummedAddress)?.pieces).toEqual(
			new Set([WalletInfo.ACCOUNT_ADDRESS, WalletInfo.ASSETS]),
		)
	})

	it('matches other strings exactly', () => {
		const store = UserDataStringStore.newStore()

		store.add(
			new UserDataString('app.example.com', [WalletInfo.WALLET_CONNECTED_DOMAINS], 'MANUAL'),
		)

		expect(store.lookup('app.example.com')).toBeDefined()
		expect(store.lookup('App.Example.com')).toBeUndefined()
	})

	it('lists user data strings longest first', () => {
		const store = UserDataStringStore.newStore()

		store.add(
			new UserDataString('app.example.com', [WalletInfo.WALLET_CONNECTED_DOMAINS], 'MANUAL'),
		)
		store.add(new UserDataString(checksummedAddress, [WalletInfo.ACCOUNT_ADDRESS], 'MANUAL'))

		expect(store.longestFirstUserInfoOnlyStrings().map(s => s.str)).toEqual([
			checksummedAddress,
			'app.example.com',
		])
	})
})

describe('WalletCaptureFile.gatherStrings', () => {
	it.each([
		['the same casing', checksummedAddress, `eip155:143:${checksummedAddress}`],
		['a different casing', checksummedAddress, `eip155:143:${lowercaseAddress}`],
		[
			'a different casing (declared lowercase)',
			lowercaseAddress,
			`eip155:143:${checksummedAddress}`,
		],
	])(
		'recognizes a declared address embedded in a string with %s',
		async (_, declaredAddress, embedded) => {
			const capture = captureWithPayload(declaredAddress, JSON.stringify({ account: embedded }))
			const strings = await capture.gatherStrings()
			const embeddedAddress = embedded.slice('eip155:143:'.length)

			expect(strings.get(embedded)).toBeUndefined()
			expect(strings.get(embeddedAddress)?.str.pieces).toEqual(
				new Set([WalletInfo.ACCOUNT_ADDRESS]),
			)
			expect(
				strings
					.strings()
					.filter(s => s.isWorthReviewingWithin(strings))
					.map(s => s.str.str)
					.filter(s => s.toLowerCase().includes(lowercaseAddress)),
			).toEqual([])
		},
	)

	it('recognizes a standalone address with a different casing', async () => {
		const capture = captureWithPayload(
			checksummedAddress,
			JSON.stringify({ account: lowercaseAddress }),
		)
		const strings = await capture.gatherStrings()

		expect(strings.get(lowercaseAddress)?.str.pieces).toEqual(new Set([WalletInfo.ACCOUNT_ADDRESS]))
	})
})
