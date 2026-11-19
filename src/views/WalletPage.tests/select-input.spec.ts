import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { expect, test } from '../../../tests/browser/verified-test'

const contractHash = createHash('sha256')
	.update(
		await readFile(new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url)),
	)
	.digest('hex')

test('native variant option names and keyboard selection', async ({ page, browserName }, info) => {
	await page.goto('/__wallet-page/software/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	const picker = page.getByRole('combobox', { name: 'Wallet version', exact: true })
	const options = await picker.locator('option').evaluateAll((elements: HTMLOptionElement[]) =>
		elements.map(option => ({
			value: option.value,
			label: option.label,
			text: option.textContent?.trim(),
		})),
	)
	const states = []

	await picker.focus()

	for (const key of ['m', 'Enter']) {
		await page.keyboard.press(key)
		states.push({
			key,
			...(await picker.evaluate((element: HTMLSelectElement) => ({
				value: element.value,
				index: element.selectedIndex,
				query: location.search,
				focused: document.activeElement === element,
				open: element.matches(':open'),
			}))),
		})
	}
	const icon = await picker.evaluate((element: HTMLSelectElement) => {
		const source = element.selectedOptions[0]?.querySelector('.select-icon')
		const rendered = element.querySelector('selectedcontent .select-icon')?.getBoundingClientRect()

		return {
			enhanced: CSS.supports('appearance: base-select'),
			expected: !!source?.children.length,
			width: rendered?.width ?? 0,
			height: rendered?.height ?? 0,
		}
	})

	await info.attach('native-option-behavior', {
		body: JSON.stringify({ options, states, icon }, null, 2),
		contentType: 'application/json',
	})

	for (const option of options) {
		expect(option.text).toBeTruthy()
		expect(
			option.label,
			'Native option labels remain available independently of closed-popup accessibility exposure',
		).toBe(option.text)
	}

	if (icon.enhanced && icon.expected) {
		expect(icon.width, 'The native selected option retains its real icon content').toBeGreaterThan(
			0,
		)
		expect(icon.height).toBeGreaterThan(0)
	}

	expect(
		states.some(state => state.value !== options[0]?.value),
		'Native keyboard input must choose a real variant',
	).toBe(true)
	const selected = await picker.inputValue()

	expect(new URL(page.url()).searchParams.get('variant')).toBe(selected)
	await picker.selectOption({ index: 0 })
	await expect
		.poll(() => picker.evaluate((element: HTMLSelectElement) => element.selectedOptions[0]?.label))
		.toBe('All versions')
	await expect.poll(() => new URL(page.url()).searchParams.has('variant')).toBe(false)
	await expect(picker).toHaveAccessibleName('Wallet version')
	await picker.evaluate(element => element.blur())
	const idlePaint = await picker.evaluate(element => {
		const button = element.querySelector('button')

		return {
			capBackground: getComputedStyle(element, '::before').backgroundImage,
			bridgeWidth: button
				? Number.parseFloat(getComputedStyle(element, '::picker-icon').borderTopWidth)
				: 0,
		}
	})

	await picker.focus()
	await page.keyboard.press('Tab')
	await page.keyboard.press('Shift+Tab')
	await expect(picker).toBeFocused()
	const focus = await picker.evaluate(element => {
		const style = getComputedStyle(element)
		const button = element.querySelector('button'),
			cap = getComputedStyle(element, '::before')
		const bridge = button ? getComputedStyle(element, '::picker-icon') : null

		return {
			visible: element.matches(':focus-visible'),
			outline: style.outlineStyle,
			outlineWidth: Number.parseFloat(style.outlineWidth),
			outlineColor: style.outlineColor,
			shadow: style.boxShadow,
			baseSelect: CSS.supports('appearance: base-select'),
			capBackground: cap.backgroundImage,
			bridgeWidth: bridge ? Number.parseFloat(bridge.borderTopWidth) : 0,
			bridgeColor: bridge?.borderTopColor,
		}
	})

	expect(focus.visible).toBe(true)
	expect(
		(focus.outline !== 'none' &&
			focus.outlineWidth > 0 &&
			focus.outlineColor !== 'rgba(0, 0, 0, 0)') ||
			focus.shadow !== 'none' ||
			(focus.baseSelect &&
				focus.capBackground.includes('radial-gradient') &&
				focus.capBackground !== idlePaint.capBackground &&
				focus.bridgeWidth > idlePaint.bridgeWidth &&
				focus.bridgeColor !== 'rgba(0, 0, 0, 0)'),
		JSON.stringify(focus),
	).toBe(true)
	await info.attach('native-select-focus', {
		body: JSON.stringify(focus),
		contentType: 'application/json',
	})
	await info.attach('contract-evidence', {
		body: JSON.stringify({
			contractHash,
			engine: browserName,
			results: [
				{
					id: '♿ NativeInput',
					status: 'pass',
					complete: false,
					observation:
						'Native select typeahead, confirmation, explicit default restoration and URL binding are asserted; links/disclosures/menu/touch remain independently required.',
				},
				{
					id: '♿ FocusNaming',
					status: 'pass',
					complete: false,
					observation:
						'Native keyboard focus-visible and a painted ring are asserted for the actual select; other interactive control roles remain independently required.',
				},
			],
		}),
		contentType: 'application/json',
	})
})
