import { expect, test } from '../../../tests/browser/verified-test'

test('rendered wallet fragment links resolve across available versions and models', async ({
	page,
}, info) => {
	const response = await page.request.get('/__wallet-page/series.json')

	expect(response.ok()).toBe(true)
	const payload: unknown = await response.json()

	if (!Array.isArray(payload) || !payload.every((value: unknown) => typeof value === 'string')) {
		throw new Error('The wallet series fixture must return wallet paths')
	}

	const wallets = payload

	expect(wallets.length).toBeGreaterThan(0)
	const origin = new URL(response.url()).origin
	const normalize = (value: string) => {
		const url = new URL(value, origin)

		url.hash = ''
		url.searchParams.sort()

		return url.pathname + url.search
	}
	const queue: string[] = []
	const queued = new Set<string>()
	const enqueue = (value: string) => {
		const key = normalize(value)

		if (!queued.has(key)) {
			queued.add(key)
			queue.push(key)
		}
	}

	wallets.forEach(enqueue)
	const destinations = new Map<string, Set<string>>()
	const references: { page: string; href: string; destination: string; id: string }[] = []
	const coverage: { page: string; anchors: number }[] = []

	for (let index = 0; index < queue.length; index++) {
		const url = queue[index]
		const requested = new URL(url, origin)

		await page.goto(url)
		await expect(page.locator('#top')).toHaveCount(1)
		await expect(page.locator('astro-island:has(#top)')).toHaveCount(1)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await expect
			.poll(() =>
				page.evaluate(() => ({
					variant:
						document.querySelector<HTMLSelectElement>('select[aria-label="Wallet version"]')
							?.value ?? '',
					model:
						document.querySelector<HTMLSelectElement>('select[aria-label="Wallet model"]')?.value ??
						'',
				})),
			)
			.toEqual({
				variant: requested.searchParams.get('variant') ?? '',
				model: requested.searchParams.get('model') ?? '',
			})
		const result = await page.evaluate(() => {
			const values = (label: string) => [
				...new Set([
					'',
					...Array.from(
						document.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)?.options ??
							[],
						option => option.value,
					),
				]),
			]
			const references = Array.from(document.querySelectorAll('a[href]')).flatMap(link => {
				const href = link.getAttribute('href')!
				const url = new URL(href, document.baseURI)

				if (
					url.origin !== location.origin ||
					url.pathname !== location.pathname ||
					url.hash.length < 2
				) {
					return []
				}

				return [
					{
						href,
						destination: url.pathname + url.search,
						id: decodeURIComponent(url.hash.slice(1)),
					},
				]
			})

			return {
				references,
				ids: Array.from(document.querySelectorAll('[id]'), element => element.id),
				variants: values('Wallet version'),
				models: values('Wallet model'),
			}
		})

		expect(result.references.length, `Rendered anchor inventory for ${url}`).toBeGreaterThan(0)
		coverage.push({ page: url, anchors: result.references.length })
		destinations.set(url, new Set(result.ids))

		for (const reference of result.references) {
			const destination = normalize(reference.destination)

			references.push({ page: url, ...reference, destination })
			enqueue(destination)
		}

		for (const variant of result.variants) {
			for (const model of result.models) {
				const selection = new URL(requested)

				if (variant) {
					selection.searchParams.set('variant', variant)
				} else {
					selection.searchParams.delete('variant')
				}

				if (model) {
					selection.searchParams.set('model', model)
				} else {
					selection.searchParams.delete('model')
				}

				enqueue(selection.href)
			}
		}
	}
	const missing = references.filter(
		reference => !destinations.get(reference.destination)?.has(reference.id),
	)

	await info.attach('fragment-destinations', {
		body: JSON.stringify({ wallets, coverage, missing }),
		contentType: 'application/json',
	})
	expect(missing).toEqual([])
})
