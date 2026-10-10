import { describe, expect, it } from 'vitest'

import { eips } from '@/data/eips'
import { EipStatus } from '@/schema/eips'
import { daysSince } from '@/types/date'

describe('Eip.finalizedDate', () => {
	for (const eip of Object.values(eips)) {
		it(`is set if and only if EIP-${eip.number} is Final`, () => {
			expect(eip.finalizedDate !== null).toBe(eip.status === EipStatus.FINAL)
		})

		if (eip.finalizedDate !== null) {
			it(`is not in the future for EIP-${eip.number}`, () => {
				expect(daysSince(eip.finalizedDate ?? '2010-01-01')).toBeGreaterThanOrEqual(0)
			})
		}
	}
})
