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
type Century = '20' | '21' // We're good from 2000 to 2199.

/** A valid date in YYYY-MM-DD format. */
export type CalendarDate = `${Century}${Digit}${Digit}-${MonthAndDay}`

/** The components of a calendar date in YYYY-MM-DD format. */
export interface CalendarDateParts {
	year: number
	month: number
	day: number
}

/** Break a CalendarDate into its components. */
export function calendarParts(calendarDate: CalendarDate): CalendarDateParts {
	const [year, month, day] = calendarDate.split('-')

	return {
		year: +year,
		month: +month,
		day: +day,
	}
}

/** Convert a CalendarDate to a JavaScript Date. */
export function calendarDateToDate(calendarDate: CalendarDate): Date {
	const { year, month, day } = calendarParts(calendarDate)

	return new Date(year, month - 1, day)
}

/** Return today's CalendarDate. */
export function today(): CalendarDate {
	const date = new Date()
	const year = date.getFullYear().toString()
	const month = (date.getMonth() + 1).toString().padStart(2, '0')
	const day = date.getDate().toString().padStart(2, '0')
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We assume that today's date is within the set of allowed dates in CalendarDate.
	const calendarDate = `${year}-${month}-${day}` as CalendarDate

	return calendarDate
}

/** Return the number of days between two CalendarDates. */
export function daysBetween(calendarDate1: CalendarDate, calendarDate2: CalendarDate): number {
	const date1 = calendarDateToDate(calendarDate1)

	date1.setMinutes(date1.getMinutes() - date1.getTimezoneOffset()) // Convert to UTC.
	const date2 = calendarDateToDate(calendarDate2)

	date2.setMinutes(date2.getMinutes() - date2.getTimezoneOffset()) // Convert to UTC.

	return Math.floor((date2.valueOf() - date1.valueOf()) / (1000 * 60 * 60 * 24))
}

/** Return the number of days since a specific CalendarDate. */
export function daysSince(calendarDate: CalendarDate): number {
	return daysBetween(calendarDate, today())
}

/** Compare two dates; usable as a date sorting function. */
export function dateCompare(calendarDate1: CalendarDate, calendarDate2: CalendarDate): -1 | 0 | 1 {
	const days = daysBetween(calendarDate1, calendarDate2)

	return days < 0 ? 1 : days > 0 ? -1 : 0
}
