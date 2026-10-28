import { expect, test } from '@playwright/test'

for (const javaScriptEnabled of [false, true]) {
	for (const path of [
		'/ambire/?variant=BROWSER',
		'/metamask/?variant=MOBILE',
		'/wallet/eip/6963/',
		'/wallet/eip/712/',
	]) {
		test(`${path} exposes complete evidence with JavaScript ${javaScriptEnabled}`, async ({
			browser,
		}, info) => {
			const context = await browser.newContext({
				baseURL: info.project.use.baseURL,
				javaScriptEnabled,
			})

			try {
				const page = await context.newPage()

				await page.goto(path)

				if (javaScriptEnabled) {
					await expect(page.locator('astro-island[ssr][client="load"]')).toHaveCount(0)

					for (const island of await page.locator('astro-island[client="visible"]').all()) {
						await island.locator(':scope > *').first().scrollIntoViewIfNeeded()
						await expect(island).not.toHaveAttribute('ssr', '')
					}
				}

				const evidence = await page.locator('section.references').evaluateAll(sections =>
					sections.map(section => {
						const heading = section.querySelector('h2, h3, h4, h5, h6')!
						const citations = Array.from(
							section.querySelectorAll<HTMLAnchorElement>('a:has(cite):not(.ref-credit)'),
						)
						const expected = Number(heading.textContent?.match(/\((\d+)\)/)?.[1] ?? 1)
						const items = Array.from(section.querySelectorAll(':scope > ul > li'))

						return {
							expected,
							urls: citations.map(link => link.getAttribute('href')),
							records: items.length,
							hidden: items.some(
								item => item.hasAttribute('hidden') || getComputedStyle(item).display === 'none',
							),
							nativeLinks: citations.every(
								link => link.target === '_blank' && link.rel.includes('noopener'),
							),
							externalImages: Array.from(section.querySelectorAll<HTMLImageElement>('img')).filter(
								image => new URL(image.src).origin !== location.origin,
							).length,
							keyboardPanes: Array.from(section.querySelectorAll('pre')).every(
								pre => pre.tabIndex === 0 && Boolean(pre.getAttribute('aria-label')),
							),
							creditTargets: Array.from(
								section.querySelectorAll<HTMLAnchorElement>('.ref-credit'),
							).every(link => document.getElementById(link.hash.slice(1)) !== null),
							snippets: section.querySelectorAll('pre').length,
							images: section.querySelectorAll('img').length,
						}
					}),
				)

				expect(evidence.length).toBeGreaterThan(0)

				for (const section of evidence) {
					expect(section.urls).toHaveLength(section.expected)
					expect(section.hidden).toBe(false)
					expect(section.nativeLinks).toBe(true)
					expect(section.externalImages).toBe(0)
					expect(section.keyboardPanes).toBe(true)
					expect(section.creditTargets).toBe(true)
				}

				if (path.startsWith('/ambire/')) {
					expect(evidence.some(section => section.records >= 4)).toBe(true)
					expect(evidence.some(section => section.records <= 3)).toBe(true)
					expect(evidence.some(section => section.snippets > 0)).toBe(true)
					expect(evidence.some(section => section.images > 0)).toBe(true)
				}

				await info.attach('reference-evidence', {
					body: JSON.stringify(evidence),
					contentType: 'application/json',
				})
			} finally {
				await context.close()
			}
		})
	}
}
