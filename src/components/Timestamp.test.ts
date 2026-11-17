import { DOMParser } from '@xmldom/xmldom'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import type { CalendarDate } from '@/types/date'
import { absoluteTimestamp, relativeTimestamp } from '@/utils/timestamp'

import Timestamp from './Timestamp.svelte'

describe('calendar timestamps', () => {
	it('retains the absolute UTC date alongside its relative fallback without JavaScript', () => {
		const date = '2026-10-01'
		const { body } = render(Timestamp, { props: { date } })
		const document = new DOMParser().parseFromString(`<html>${body}</html>`, 'text/html')
		const time = document.getElementsByTagName('time')[0]

		expect(time.getAttribute('datetime')).toBe(date)
		expect(time.textContent).toBe('October 1, 2026')
		expect(body).toContain('relative-date')
		expect(absoluteTimestamp('2024-02-29')).toBe('February 29, 2024')
	})

	it.each<[CalendarDate, string, string]>([
		['2026-10-01', '2026-10-01T23:59:59Z', 'today'],
		['2026-10-01', '2026-10-02T00:00:00Z', 'yesterday'],
		['2026-10-02', '2026-10-01T23:59:59Z', 'tomorrow'],
		['2026-10-01', '2026-10-05T12:00:00Z', '4 days ago'],
		['2026-10-05', '2026-10-01T12:00:00Z', 'in 4 days'],
		['2024-02-29', '2024-03-01T00:00:00Z', 'yesterday'],
		['2026-10-01', '2026-10-01T23:30:00-07:00', 'yesterday'],
	])('derives %s relative to UTC day %s', (date, now, expected) => {
		expect(relativeTimestamp(date, new Date(now))).toBe(expected)
	})
})
