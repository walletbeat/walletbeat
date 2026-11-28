import { getISO } from 'temporal-polyfill/fns/Calendar'
import { plainDateISO } from 'temporal-polyfill/fns/Now'
import { compare, diffDays, fromString, toString } from 'temporal-polyfill/fns/PlainDate'

const Temporal = {
	Now: { plainDateISO },
	PlainDate: { from: (date: string) => fromString(date, getISO), compare },
}

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type ThirtyDays = `0${Exclude<Digit, '0'>}` | `1${Digit}` | `2${Digit}` | '30'
type ThirtyOneDays = ThirtyDays | '31'
type FebruaryDays = Exclude<ThirtyDays, '30'>
type ThirtyDayMonths = '04' | '06' | '09' | '11'
type ThirtyOneDayMonths = '01' | '03' | '05' | '07' | '08' | '10' | '12'
type MonthAndDay =
	| `${ThirtyDayMonths}-${ThirtyDays}`
	| `${ThirtyOneDayMonths}-${ThirtyOneDays}`
	| `02-${FebruaryDays}`
// Keep this range no wider than the data needs: `CalendarDate` expands to one member per day it
// covers, and check time grows faster than that count does.
type Year = `20${'1' | '2' | '3'}${Digit}` // We're good from 2010 to 2039.

/** A valid date in YYYY-MM-DD format. */
export type CalendarDate = `${Year}-${MonthAndDay}`

// Match the supported years and canonical spelling. Temporal validates the month and day.
const CALENDAR_DATE_PATTERN = /^20[123]\d-\d{2}-\d{2}$/

function isCalendarDate(date: string): date is CalendarDate {
	if (!CALENDAR_DATE_PATTERN.test(date)) {
		return false
	}

	try {
		Temporal.PlainDate.from(date)

		return true
	} catch {
		return false
	}
}

export function assertCalendarDate(date: string): CalendarDate {
	if (!isCalendarDate(date)) {
		throw new Error(`Invalid calendar date: ${date}`)
	}

	return date
}

/** Return today's UTC calendar date. */
export function today(): CalendarDate {
	return assertCalendarDate(toString(Temporal.Now.plainDateISO('UTC')))
}

/** Return the signed number of days from the first date to the second. */
export function daysBetween(first: CalendarDate, second: CalendarDate): number {
	return diffDays(Temporal.PlainDate.from(first), Temporal.PlainDate.from(second))
}

/** Return the number of days since a specific CalendarDate. */
export function daysSince(calendarDate: CalendarDate): number {
	return diffDays(Temporal.PlainDate.from(calendarDate), Temporal.Now.plainDateISO('UTC'))
}

/** Compare two dates for ascending sort order. */
export function dateCompare(first: CalendarDate, second: CalendarDate): -1 | 0 | 1 {
	const order = Temporal.PlainDate.compare(
		Temporal.PlainDate.from(first),
		Temporal.PlainDate.from(second),
	)

	return order < 0 ? -1 : order > 0 ? 1 : 0
}
