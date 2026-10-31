import { expect, test } from '../../../tests/browser/verified-test'

for (const [direction, order] of [
	['Ascending', '1,2,3'],
	['Descending', '3,2,1'],
] as const) {
	test(`sort descriptors remain coherent when columns change: ${direction}`, async ({ page }) => {
		await page.goto('/__table-sort-state')
		const state = async (sort: string, column: string, rows: string) => {
			await expect(page.locator('output[data-sort]')).toHaveText(sort)
			await expect(page.locator('output[data-column]')).toHaveText(column)
			await expect(page.locator('[data-rows]')).toHaveText(rows)
		}

		await state('fallback:asc', 'fallback', '3,2,1')
		await page.getByRole('button', { name: 'Remove default', exact: true }).click()
		await state('none:none', 'none', '2,1,3')
		await expect(page.locator('thead th[aria-sort]')).toHaveCount(0)
		await expect(page.locator('tbody tr[data-disabled]')).toHaveCount(0)
		await page.getByRole('button', { name: 'Restore', exact: true }).click()
		await state('fallback:asc', 'fallback', '3,2,1')
		const header = page.locator('thead th[data-table-column="selected"]')
		const sortedRows = page.locator('tbody tr')

		await header.getByRole('button', { name: 'Sort by Selected', exact: true }).click()

		if (direction === 'Descending') {
			await header.getByRole('button', { name: 'Sort by Selected', exact: true }).click()
		}

		await expect(header).toHaveAttribute('aria-sort', direction.toLowerCase())
		await expect(sortedRows.locator('td:first-child')).toHaveText(order.split(','))
		await expect(page.locator('tbody tr[data-disabled] td:first-child')).toHaveText(['2'])
		await page.getByRole('button', { name: direction, exact: true }).click()
		await state(`selected:${direction === 'Ascending' ? 'asc' : 'desc'}`, 'selected', order)
		await expect(page.locator('[data-visible]')).toHaveText('fallback,selected')
		await page.getByRole('button', { name: 'Collapse state', exact: true }).click()
		await expect(page.locator('[data-visible]')).toHaveText('fallback,group')
		await state(`selected:${direction === 'Ascending' ? 'asc' : 'desc'}`, 'selected', order)
		await page.getByRole('button', { name: 'Remove selected', exact: true }).click()
		await state('fallback:asc', 'fallback', '3,2,1')
		await expect(page.locator('thead th[aria-sort]')).toHaveAttribute(
			'data-table-column',
			'fallback',
		)
		await expect(sortedRows.locator('td:first-child')).toHaveText(['3', '2', '1'])
		await expect(page.locator('tbody tr[data-disabled] td:first-child')).toHaveText(['1'])
		await page.getByRole('button', { name: 'Remove all', exact: true }).click()
		await state('none:none', 'none', '2,1,3')
		await expect(page.locator('thead th[aria-sort]')).toHaveCount(0)
		await expect(page.locator('tbody tr[data-disabled]')).toHaveCount(0)
		await page.getByRole('button', { name: 'Restore', exact: true }).click()
		await state(`selected:${direction === 'Ascending' ? 'asc' : 'desc'}`, 'selected', order)
		await expect(header).toHaveAttribute('aria-sort', direction.toLowerCase())
		await expect(sortedRows.locator('td:first-child')).toHaveText(order.split(','))
	})
}
