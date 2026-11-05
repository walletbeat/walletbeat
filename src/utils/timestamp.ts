import type { CalendarDate } from '@/types/date'

/** Format a calendar date without shifting it into the visitor's local day. */
export function absoluteTimestamp(date: CalendarDate): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC',
	})
}

/** Express the UTC calendar-day distance, independent of time of day or daylight saving. */
export function relativeTimestamp(date: CalendarDate, now = new Date()): string {
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
	const days = (Date.parse(date) - today) / (1000 * 60 * 60 * 24)

	return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(days, 'day')
}
