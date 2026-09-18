import { describe, expect, it } from 'vitest'

import { ratedHardwareWallets } from '@/data/hardware-wallets'
import { ratedSoftwareWallets } from '@/data/software-wallets'
import { getWalletStageAndLadder, walletQualifiesForStageZero } from '@/utils/stage'

describe('walletQualifiesForStageZero', () => {
	it('returns true only for software wallets that cleared at least Stage 0', () => {
		const softwareWallets = Object.values(ratedSoftwareWallets)
		const stageZeroPlus = softwareWallets.filter(walletQualifiesForStageZero)
		const others = softwareWallets.filter(wallet => !walletQualifiesForStageZero(wallet))

		expect(stageZeroPlus.length).toBeGreaterThan(0)
		expect(others.length).toBeGreaterThan(0)
		expect(stageZeroPlus.length + others.length).toBe(softwareWallets.length)

		for (const wallet of stageZeroPlus) {
			const { stage } = getWalletStageAndLadder(wallet)

			expect(stage).not.toBeNull()
			expect(typeof stage).toBe('object')
			expect(stage).not.toBe('QUALIFIED_FOR_NO_STAGES')
			expect(stage).not.toBe('NOT_APPLICABLE')
		}

		for (const wallet of others) {
			expect(getWalletStageAndLadder(wallet).stage).toBe('QUALIFIED_FOR_NO_STAGES')
		}
	})

	it('returns false for hardware wallets that have no stage ladder', () => {
		for (const wallet of Object.values(ratedHardwareWallets)) {
			expect(walletQualifiesForStageZero(wallet)).toBe(false)
		}
	})
})
