import { describe, expect, it } from 'vitest'

import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { notSupported, supported } from '@/schema/features/support'

import { supportedHardwareWalletBrandIds } from './supported-hardware-wallets'

describe('hardware model eligibility from evaluation metadata', () => {
	for (const [type, brandId] of [
		[HardwareWalletType.LEDGER, 'ledger'],
		[HardwareWalletType.KEYCARD, 'keycard-shell'],
	] as const) {
		it(`preserves direct and indirect support for ${type}`, () => {
			for (const connection of [
				HardwareWalletConnection.webUSB,
				HardwareWalletConnection.WALLET_CONNECT,
			]) {
				expect(
					supportedHardwareWalletBrandIds({
						hardwareWalletSupport: {
							wallets: { [type]: supported({ connectionTypes: [connection] }) },
						},
					}),
				).toEqual([brandId])
			}
			expect(
				supportedHardwareWalletBrandIds({
					hardwareWalletSupport: { wallets: { [type]: notSupported } },
				}),
			).toEqual([])
		})
	}
	it.each([
		null,
		{},
		{ hardwareWalletSupport: null },
		{ hardwareWalletSupport: { wallets: null } },
		{ hardwareWalletSupport: { wallets: { UNKNOWN: { support: 'SUPPORTED' } } } },
	])('does not invent model eligibility for unavailable metadata %j', metadata => {
		expect(supportedHardwareWalletBrandIds(metadata)).toEqual([])
	})
})
