import type { Page } from '@playwright/test'

import { expect, test } from '@/tests/browser/verified-test'
import type { WalletContentCase } from '@/tests/utils/wallet-page-content'
import {
	loadWalletContentPlans,
	loadWalletDetailSnapshots,
} from '@/tests/utils/wallet-page-content-plan'
import { fragmentContent } from '@/tests/utils/wallet-report-content'

async function assertSelectedContent(
	page: Page,
	expected: WalletContentCase,
	walletId: string,
	detailSnapshots: Record<string, string>,
) {
	const actual = await page.locator('main section.attribute[data-rating]').evaluateAll(sections =>
		sections.map(section => ({
			id: section.id,
			name: section.getAttribute('aria-label'),
			rating: section.getAttribute('data-rating'),
			badges: Array.from(section.querySelectorAll(':scope > details > summary data[value]')).map(
				badge => badge.getAttribute('value'),
			),
			details: section.querySelector('.attribute-rating-details > li')?.outerHTML ?? '',
			citations: Array.from(section.querySelectorAll('a[href]')).map(link =>
				link.getAttribute('href'),
			),
		})),
	)

	expect(actual.map(attribute => attribute.id).sort()).toEqual(
		expected.attributes.map(attribute => attribute.id).sort(),
	)

	for (const attribute of expected.attributes) {
		const rendered = actual.find(item => item.id === attribute.id)!

		expect(rendered.name, attribute.id).toBe(attribute.name)
		expect(rendered.rating, attribute.id).toBe(attribute.rating.toLowerCase())
		expect(rendered.badges, attribute.id).toContain(attribute.rating)

		const key = `${walletId}/${expected.variant ?? 'ALL'}/${attribute.id}`

		expect(detailSnapshots[key], key).toBeDefined()
		expect(JSON.stringify(fragmentContent(rendered.details)), key).toBe(detailSnapshots[key])

		for (const url of attribute.citations) {
			expect(rendered.citations, `${attribute.id}: ${url}`).toContain(url)
		}
	}
	const badges = await page
		.locator('.supported-hardware-wallets a[data-badge]')
		.evaluateAll(links =>
			links.map(link => ({
				href: link.getAttribute('href'),
				text: link.textContent?.replace(/\s+/g, ' ').trim(),
				image: link.querySelector('img')?.getAttribute('src'),
				alt: link.querySelector('img')?.getAttribute('alt'),
			})),
		)

	expect(badges).toEqual(expected.badges)

	return {
		variant: expected.variant,
		model: expected.model,
		attributes: actual.length,
		citations: expected.attributes.reduce((sum, attribute) => sum + attribute.citations.length, 0),
		hardwareBadges: badges.length,
	}
}

let detailSnapshots: Record<string, string>

test.beforeAll(async () => {
	detailSnapshots = await loadWalletDetailSnapshots()
})

for (const plan of loadWalletContentPlans()) {
	test(`${plan.id} renders canonical variant facts and independent model filtering`, async ({
		page,
	}, info) => {
		const observations = []

		const navigate = async (state: WalletContentCase) => {
			const query = new URLSearchParams()

			if (state.variant) {
				query.set('variant', state.variant)
			}

			if (state.model) {
				query.set('model', state.model)
			}

			await page.goto(`/${plan.id}/?${query}`, { waitUntil: 'domcontentloaded' })
			await page.locator('astro-island[component-url*="WalletPageContext"]:not([ssr])').waitFor()
			await expect.poll(() => new URL(page.url()).searchParams.get('variant')).toBe(state.variant)
			await expect.poll(() => new URL(page.url()).searchParams.get('model')).toBe(state.model)
		}
		const aggregate = plan.cases.find(state => state.variant === null && state.model === null)!

		await navigate(aggregate)
		const version = page.getByLabel('Wallet version', { exact: true })

		if (plan.variants.length > 1) {
			expect(
				await version
					.locator('option')
					.evaluateAll(options =>
						options
							.slice(1)
							.flatMap(option => (option instanceof HTMLOptionElement ? [option.value] : [])),
					),
			).toEqual(plan.variants.slice(1))
		}

		for (const state of plan.cases) {
			await navigate(state)
			observations.push(await assertSelectedContent(page, state, plan.id, detailSnapshots))

			if (state.variant && state.model === null) {
				await version.selectOption({ index: 0 })
				observations.push(await assertSelectedContent(page, aggregate, plan.id, detailSnapshots))
				await version.selectOption(state.variant)
				observations.push(await assertSelectedContent(page, state, plan.id, detailSnapshots))
			}
		}

		if (plan.ownModels.length > 1) {
			await navigate(aggregate)
			const modelSelect = page.getByLabel('Wallet model', { exact: true })

			expect(
				await modelSelect
					.locator('option')
					.evaluateAll(options =>
						options
							.slice(1)
							.flatMap(option => (option instanceof HTMLOptionElement ? [option.value] : [])),
					),
			).toEqual(plan.ownModels)

			for (const model of plan.ownModels) {
				await modelSelect.selectOption(model)
				observations.push(
					await assertSelectedContent(
						page,
						plan.cases.find(state => state.variant === null && state.model === model)!,
						plan.id,
						detailSnapshots,
					),
				)
			}
		}

		await info.attach('canonical-wallet-content', {
			body: JSON.stringify({ wallet: plan.id, observations }),
			contentType: 'application/json',
		})
	})
}
