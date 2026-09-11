import { describe, expect, expectTypeOf, it } from 'vitest'

import { assertCalendarDate, type CalendarDate, today } from '@/types/date'

// `CalendarDate` covers a fixed range of years. These tests catch today's date falling outside it,
// and `CALENDAR_DATE_PATTERN` drifting away from it.
describe('datesAreWithinSupportedYearRange', () => {
	it('accepts today', () => {
		expect(() => assertCalendarDate(today())).not.toThrow()
	})

	it('rejects years outside the range the type allows', () => {
		expect(() => assertCalendarDate('2009-12-31')).toThrow('Invalid calendar date')
		expect(() => assertCalendarDate('2040-01-01')).toThrow('Invalid calendar date')
		expect(() => assertCalendarDate('2150-01-01')).toThrow('Invalid calendar date')
	})

	it('accepts the first and last day of the range', () => {
		expect(assertCalendarDate('2010-01-01')).toBe('2010-01-01')
		expect(assertCalendarDate('2039-12-31')).toBe('2039-12-31')
	})

	it('expresses the supported year range in the type', () => {
		expectTypeOf<'2009-12-31'>().not.toExtend<CalendarDate>()
		expectTypeOf<'2010-01-01'>().toExtend<CalendarDate>()
		expectTypeOf<'2039-12-31'>().toExtend<CalendarDate>()
		expectTypeOf<'2040-01-01'>().not.toExtend<CalendarDate>()
	})

	it('rejects dates the type cannot express', () => {
		expect(() => assertCalendarDate('2026-13-01')).toThrow('Invalid calendar date')
		expect(() => assertCalendarDate('2026-04-31')).toThrow('Invalid calendar date')
		expect(() => assertCalendarDate('2026-9-10')).toThrow('Invalid calendar date')
	})

	it('rejects a February 29th that the type cannot rule out', () => {
		expect(() => assertCalendarDate('2023-02-29')).toThrow('Invalid calendar date')
		expect(assertCalendarDate('2024-02-29')).toBe('2024-02-29')
	})
})
