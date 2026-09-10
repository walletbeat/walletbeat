import { describe, expect, expectTypeOf, it } from 'vitest'

import { assertCalendarDate, type CalendarDate } from '@/types/date'

describe('CalendarDate', () => {
	it('retains static month and day validation', () => {
		expectTypeOf<'2026-09-10'>().toExtend<CalendarDate>()
		expectTypeOf<'2026-13-10'>().not.toExtend<CalendarDate>()
		expectTypeOf<'2026-09-32'>().not.toExtend<CalendarDate>()
	})

	it('validates the exact YYYY-MM-DD format at runtime', () => {
		expect(assertCalendarDate('2024-02-29')).toBe('2024-02-29')
		expect(() => assertCalendarDate('2023-02-29')).toThrow('Invalid calendar date')
		expect(() => assertCalendarDate('20260-09-10')).toThrow('Invalid calendar date')
	})
})
