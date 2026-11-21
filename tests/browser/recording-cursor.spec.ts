import { expect, test } from '@playwright/test'

import { installRecordingCursor } from './recording-cursor'

test('recording cursor distinguishes CSS pointer, selectable text and default', async ({
	page,
}) => {
	await installRecordingCursor(page)
	await page.goto(
		`data:text/html,${encodeURIComponent('<button style="cursor:pointer">Link</button><p style="cursor:auto">Selectable text</p><div style="cursor:default;height:100px">Default</div>')}`,
	)
	const cursor = page.locator('[data-recording-cursor]')

	await page.locator('button').hover()
	await expect(cursor).toHaveAttribute('data-cursor', 'pointer')
	await page.locator('p').hover({ position: { x: 10, y: 10 } })
	await expect(cursor).toHaveAttribute('data-cursor', 'text')
	await page.getByText('Default', { exact: true }).hover()
	await expect(cursor).toHaveAttribute('data-cursor', 'default')
	await expect(cursor).toHaveAttribute('aria-hidden', 'true')
})

test('recording cursor updates when content scrolls beneath a stationary pointer', async ({
	page,
}) => {
	await installRecordingCursor(page)
	await page.goto(
		`data:text/html,${encodeURIComponent('<div style="height:100px;cursor:pointer">Link</div><div style="height:2000px;cursor:text">Text</div>')}`,
	)
	await page.mouse.move(40, 40)
	const cursor = page.locator('[data-recording-cursor]')

	await expect(cursor).toHaveAttribute('data-cursor', 'pointer')
	await page.mouse.wheel(0, 200)
	await expect(cursor).toHaveAttribute('data-cursor', 'text')
})
