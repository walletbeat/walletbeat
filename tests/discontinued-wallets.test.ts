import { describe, expect, it } from 'vitest'

import { allRatedWalletsBySlug, allWallets } from '@/data/wallets'
import { isNoRef, refs } from '@/schema/reference'
import { assertCalendarDate, dateCompare, today } from '@/types/date'

const discontinuedWallets = Object.values(allWallets).filter(
	wallet => wallet.metadata.discontinued !== undefined,
)

describe('discontinued wallets', () => {
	it('includes at least one wallet', () => {
		expect(discontinuedWallets.length).toBeGreaterThan(0)
	})

	for (const wallet of discontinuedWallets) {
		const { discontinued } = wallet.metadata

		if (discontinued === undefined) {
			continue
		}

		describe(`wallet ${wallet.metadata.displayName}`, () => {
			it('cites a source for being discontinued', () => {
				expect(isNoRef(discontinued.ref)).toBe(false)
				expect(refs(discontinued).flatMap(ref => ref.urls).length).toBeGreaterThan(0)
			})

			it('has a discontinuation date that is not in the future', () => {
				expect(() => assertCalendarDate(discontinued.date)).not.toThrow()
				expect(dateCompare(discontinued.date, today())).toBeLessThanOrEqual(0)
			})

			it('keeps its wallet page', () => {
				expect(allRatedWalletsBySlug[wallet.metadata.id]).toBeDefined()
			})
		})
	}
})
