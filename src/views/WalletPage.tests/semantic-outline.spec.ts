import { expect, test } from '@playwright/test'

import { semanticOutline } from './fixtures/semantic-outline.mjs'

test('semantic outline preserves nested detail and source hierarchy', async ({ page }) => {
	await page.setContent(
		'<main><header><h1>Wallet</h1></header><article><aside><h2>Security News</h2><article><h3>Incident</h3></article></aside><section><h2>Group</h2><section><details open><summary><h3>Attribute</h3></summary><h4>Implementation</h4><details><summary><h4>Methodology</h4></summary><section><aside><h5>Examples</h5></aside></section></details><section><h4>Sources</h4></section></details></section></section><section><h2>Credits</h2></section></article></main>',
	)
	const headings = await page.locator('main').evaluate(semanticOutline)

	expect(headings.filter(heading => heading.level !== heading.expected)).toEqual([])
})

test('semantic outline detects sibling-rank detail and skipped root levels', async ({ page }) => {
	await page.setContent(
		'<main><h1>Wallet</h1><article><aside><h2>News</h2><article><h2>Incident</h2></article></aside><section><h2>Group</h2><details><summary><h3>Attribute</h3></summary><h3>Implementation</h3></details></section><section><h5>Credits</h5></section></article></main>',
	)
	const headings = await page.locator('main').evaluate(semanticOutline)

	expect(
		headings.filter(heading => heading.level !== heading.expected).map(heading => heading.text),
	).toEqual(['Incident', 'Implementation', 'Credits'])
})
