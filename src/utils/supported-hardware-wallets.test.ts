import { describe, expect, it } from 'vitest'

import {
	HardwareWalletConnection,
	hardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { notSupported, supported } from '@/schema/features/support'

import { supportedHardwareWalletTypes } from './supported-hardware-wallets'

describe('hardware model eligibility from evaluation metadata', () => {
	for (const type of hardwareWalletType.items) {
		it(`preserves direct and indirect support for ${type}`, () => {
			for (const connection of [
				HardwareWalletConnection.webUSB,
				HardwareWalletConnection.WALLET_CONNECT,
			]) {
				expect(
					supportedHardwareWalletTypes({
						hardwareWalletSupport: {
							wallets: { [type]: supported({ connectionTypes: [connection] }) },
						},
					}),
				).toEqual([type])
			}
			expect(
				supportedHardwareWalletTypes({
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
		expect(supportedHardwareWalletTypes(metadata)).toEqual([])
	})
})
