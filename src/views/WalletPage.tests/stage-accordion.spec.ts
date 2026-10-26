import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { expect, test } from '../../../tests/browser/verified-test'
import { allWalletLadders, WalletLadderType } from '../../schema/ladders'

const cases = [
	{
		path: '/metamask/?variant=BROWSER',
		fixture: 'software',
		ladder: WalletLadderType.SOFTWARE,
		width: 390,
	},
	{
		path: '/__wallet-page/software/',
		fixture: 'software',
		ladder: WalletLadderType.SOFTWARE,
		width: 1440,
	},
	{
		path: '/__wallet-page/unknown/',
		fixture: 'unknown',
		ladder: WalletLadderType.SOFTWARE,
		width: 390,
	},
] as const

test('native Stage accordions preserve every applicable ladder hierarchy', async ({
	page,
	browserName,
}, info) => {
	const covered = new Set(cases.map(scene => scene.ladder))

	expect(
		[...covered].sort(),
		'Each defined ladder requires an applicable native interaction witness',
	).toEqual(Object.keys(allWalletLadders).sort())

	for (const { path, fixture, width, ladder: ladderType } of cases) {
		const ladder = allWalletLadders[ladderType]

		if (!ladder || ladder.stages.length < 2) {
			throw new Error('The accordion witness requires multiple applicable stages')
		}

		const expected = ladder.stages.map(stage => ({
			id: stage.id,
			groups: (stage.criteriaGroups ?? []).map(group => ({
				id: `${stage.id}-${group.id}`,
				criteria: group.criteria.map(criterion => ({
					id: criterion.id,
					text: criterion.description.text,
				})),
			})),
		}))

		expect(expected.some(stage => stage.groups.some(group => group.criteria.length > 0))).toBe(true)
		await page.setViewportSize({ width, height: 1203 })
		await page.goto(path)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const stages = page.locator('#stages section > details[name="wallet-stages"]')

		expect(
			await stages.evaluateAll(elements => elements.map(element => element.parentElement?.id)),
		).toEqual(expected.map(stage => stage.id))
		const original = await stages.evaluateAll(elements =>
			elements.map(element => ({
				id: element.parentElement?.id,
				name: element.getAttribute('name'),
			})),
		)

		expect(original.every(stage => stage.name === 'wallet-stages')).toBe(true)
		const observations = []

		for (const stage of expected) {
			const detail = page.locator(
				`[id=${JSON.stringify(stage.id)}] > details[name="wallet-stages"]`,
			)

			await expect(detail).toHaveCount(1)
			const summary = detail.locator(':scope > summary')

			// Focus the native summary itself; its nested heading link must not receive Enter.
			await summary.focus()
			await expect(summary).toBeFocused()

			if (await detail.evaluate(element => element.hasAttribute('open'))) {
				await page.keyboard.press('Enter')
				await expect(detail).not.toHaveAttribute('open')
			}

			await page.keyboard.press('Enter')
			await expect(detail).toHaveAttribute('open')
			await expect
				.poll(() =>
					stages.evaluateAll(elements =>
						elements
							.filter(element => element.hasAttribute('open'))
							.map(element => element.parentElement?.id),
					),
				)
				.toEqual([stage.id])
			const groups = detail.locator(':scope > div > div > details')

			expect(await groups.evaluateAll(elements => elements.map(element => element.id))).toEqual(
				stage.groups.map(group => group.id),
			)

			for (const group of stage.groups) {
				const groupDetail = groups.filter({
					has: page.locator(`:scope > summary a[href="#${group.id}"]`),
				})

				await expect(groupDetail).toHaveCount(1)
				const criteria = groupDetail.locator(':scope > div > ul > li[data-stage-criterion-rating]')

				await expect(criteria).toHaveCount(group.criteria.length)
				expect(
					await criteria.evaluateAll(elements =>
						elements.every(element => element.textContent?.trim()),
					),
				).toBe(true)

				for (const [index, criterion] of group.criteria.entries()) {
					expect(criterion.text.trim()).not.toBe('')
					await expect(criteria.nth(index)).toContainText(criterion.text)
				}

				if (group.criteria.length > 0) {
					await expect(criteria.first()).toBeVisible()
				}
			}
			await summary.focus()
			await page.keyboard.press('Space')
			await expect(detail).not.toHaveAttribute('open')
			await expect
				.poll(() =>
					stages.evaluateAll(
						elements => elements.filter(element => element.hasAttribute('open')).length,
					),
				)
				.toBe(0)
			await page.keyboard.press('Space')
			await expect(detail).toHaveAttribute('open')
			await expect
				.poll(() =>
					stages.evaluateAll(elements =>
						elements
							.filter(element => element.hasAttribute('open'))
							.map(element => element.parentElement?.id),
					),
				)
				.toEqual([stage.id])
			expect(
				await groups.evaluateAll(elements =>
					elements.map(element => ({
						id: element.id,
						stage: element.parentElement?.closest('details[name="wallet-stages"]')?.parentElement
							?.id,
					})),
				),
			).toEqual(stage.groups.map(group => ({ id: group.id, stage: stage.id })))

			for (const group of stage.groups) {
				await expect(
					page.locator(
						`[id=${JSON.stringify(group.id)}] > div > ul > li[data-stage-criterion-rating]`,
					),
				).toHaveCount(group.criteria.length)
			}
			observations.push({
				stage: stage.id,
				groups: stage.groups,
				openedBy: 'Enter',
				closedAndReopenedBy: 'Space',
			})
		}
		expect(
			await stages.evaluateAll(elements =>
				elements.map(element => ({
					id: element.parentElement?.id,
					name: element.getAttribute('name'),
				})),
			),
		).toEqual(original)
		await info.attach(`native-stage-accordion-${fixture}-${width}`, {
			body: JSON.stringify({ path, fixture, width, observations }),
			contentType: 'application/json',
		})
	}
	const contract = await readFile(
		new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url),
		'utf8',
	)

	await info.attach('contract-evidence', {
		body: JSON.stringify({
			contractHash: createHash('sha256').update(contract).digest('hex'),
			engine: browserName,
			results: [
				{
					id: '🔽 StageAccordion',
					status: 'pass',
					complete: true,
					ladders: [...covered],
					scenes: cases,
					evidence:
						'Every currently defined applicable ladder is represented. Every canonical stage is opened with Enter, checked for native mutual exclusion, closed/reopened with Space, and retains the schema-defined stage/group/criterion hierarchy across real, scored and unknown-data scenes at mobile and desktop widths.',
				},
			],
		}),
		contentType: 'application/json',
	})
})
