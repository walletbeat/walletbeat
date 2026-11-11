import assert from 'node:assert/strict'

import { expect, test } from '../../../tests/browser/verified-test'

type NoteCase = { url: string; notes: { id: string; html: string; specificImprovement: boolean }[] }

function assertNoteCases(value: unknown): asserts value is NoteCase[] {
	assert(
		Array.isArray(value) &&
			value.every(
				(entry: unknown) =>
					typeof entry === 'object' &&
					entry !== null &&
					'url' in entry &&
					typeof entry.url === 'string' &&
					'notes' in entry &&
					Array.isArray(entry.notes) &&
					entry.notes.every(
						(note: unknown) =>
							typeof note === 'object' &&
							note !== null &&
							'id' in note &&
							typeof note.id === 'string' &&
							'html' in note &&
							typeof note.html === 'string' &&
							'specificImprovement' in note &&
							typeof note.specificImprovement === 'boolean',
					),
			),
		'Attribute note fixture must supply valid expectations',
	)
}

for (const javaScriptEnabled of [false, true]) {
	test.describe(`authored attribute context with JavaScript ${javaScriptEnabled ? 'enabled' : 'disabled'}`, () => {
		test.use({ javaScriptEnabled })
		test('all authored attribute notes', async ({ page, request }) => {
			const response = await request.get('/__wallet-page/attribute-notes.json')

			expect(response.ok()).toBe(true)
			const cases: unknown = await response.json()

			assertNoteCases(cases)

			expect(cases.length).toBeGreaterThan(0)

			for (const { url, notes } of cases) {
				expect(notes.length).toBeGreaterThan(0)
				await test.step(url, async () => {
					await page.goto(url, { waitUntil: 'domcontentloaded' })

					if (javaScriptEnabled) {
						await expect(page.locator('astro-island:has(#top)')).not.toHaveAttribute('ssr')
					}

					for (const note of notes) {
						const rendered = page.locator(
							`#${note.id} .attribute-rating-details > li[data-list-item-marker="👉"]`,
						)

						await expect(rendered).toHaveCount(1)
						await expect(rendered).toBeVisible()
						const content = await rendered.evaluate((node, html) => {
							const expected = new DOMParser().parseFromString(html, 'text/html').body
							const text = (element: Element) => element.textContent?.replace(/\s+/g, ' ').trim()
							const links = (element: Element) =>
								[...element.querySelectorAll('a')].map(link => ({
									text: text(link),
									href: link.getAttribute('href'),
								}))

							return {
								actual: { text: text(node), links: links(node) },
								expected: { text: text(expected), links: links(expected) },
							}
						}, note.html)

						expect(content.actual).toEqual(content.expected)

						if (!note.specificImprovement) {
							await expect(page.locator(`#${note.id}-improvement .note`)).toHaveCount(0)
						}
					}
				})
			}
		})
	})
}
