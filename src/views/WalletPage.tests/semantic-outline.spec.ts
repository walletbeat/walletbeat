import { expect, test } from '@playwright/test'

import { semanticOutline } from '../../../tests/browser/semantic-outline.mjs'

test('semantic outline preserves nested detail and source hierarchy', async ({ page }) => {
	await page.setContent(
		'<main><header><h1>Wallet</h1></header><section><h2>Group</h2><section><details open><summary><h3>Attribute</h3></summary><h4>Implementation</h4><details><summary><h4>Methodology</h4></summary><section><aside><h5>Examples</h5></aside></section></details><section><h4>Sources</h4></section></details></section></section><section><h2>Credits</h2></section></main>',
	)
	const headings = await page.locator('main').evaluate(semanticOutline)

	expect(headings.filter(heading => heading.level !== heading.expected)).toEqual([])
})

test('semantic outline detects sibling-rank detail and skipped root levels', async ({ page }) => {
	await page.setContent(
		'<main><h1>Wallet</h1><section><h2>Group</h2><details><summary><h3>Attribute</h3></summary><h3>Implementation</h3></details></section><section><h5>Credits</h5></section></main>',
	)
	const headings = await page.locator('main').evaluate(semanticOutline)

	expect(
		headings.filter(heading => heading.level !== heading.expected).map(heading => heading.text),
	).toEqual(['Implementation', 'Credits'])
})
