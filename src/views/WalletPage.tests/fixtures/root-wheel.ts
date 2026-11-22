import type { Page } from '@playwright/test'

export async function wheelMainRoot(
	page: Page,
	attach: (name: string, body: string) => Promise<void>,
): Promise<void> {
	const state = await page.evaluateHandle(() => {
		const root = document.querySelector('#layout')
		const main = document.querySelector('#content main')

		if (!(root instanceof HTMLElement) || !(main instanceof HTMLElement)) {
			throw new Error('Root/main scroll geometry unavailable')
		}

		if (
			!root.matches('[data-scroll-container]') ||
			!/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)
		) {
			throw new Error('Layout is not the native scroll owner')
		}

		const describe = (element: Element) =>
			element.tagName.toLowerCase() + (element.id ? '#' + element.id : '')
		const chain = (element: Element) => {
			const elements: Element[] = []

			for (let current: Element | null = element; current; current = current.parentElement) {
				elements.push(current)
			}

			return elements
		}
		const valid = (elements: Element[]) => {
			const rootIndex = elements.indexOf(root)

			return (
				rootIndex >= 0 &&
				elements.includes(main) &&
				!elements.some(element => element.matches('#nav, #wallet-toc, :popover-open')) &&
				!elements.slice(0, rootIndex).some(element => {
					const style = getComputedStyle(element)

					return (
						/(auto|scroll|overlay|hidden)/.test(style.overflowY) &&
						element.scrollHeight > element.clientHeight
					)
				})
			)
		}
		const rect = main.getBoundingClientRect()
		const bounds = root.getBoundingClientRect()
		const left = Math.max(0, rect.left, bounds.left) + 16
		const right = Math.min(innerWidth, rect.right, bounds.right) - 16
		const top = Math.max(0, rect.top, bounds.top) + 16
		const bottom = Math.min(innerHeight, rect.bottom, bounds.bottom) - 16

		if (left >= right || top >= bottom || root.scrollTop >= root.scrollHeight - root.clientHeight) {
			throw new Error('No visible main geometry/root downward scroll range')
		}

		let point: { x: number; y: number } | undefined

		for (const fy of [0.5, 0.25, 0.75, 0.1, 0.9]) {
			for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) {
				const candidate = { x: left + (right - left) * fx, y: top + (bottom - top) * fy }
				const hit = document.elementFromPoint(candidate.x, candidate.y)

				if (hit && valid(chain(hit))) {
					point = candidate
					break
				}
			}

			if (point) {
				break
			}
		}

		if (!point) {
			throw new Error('No main-content wheel point with root as scroll owner')
		}

		const chosen = point
		const events: object[] = []
		const positions = () => ({
			rootTop: root.scrollTop,
			rootHeight: root.scrollHeight,
			rootClientHeight: root.clientHeight,
		})
		let started = 0
		let before = 0
		let armed = false
		let finished = false
		let wheelValid = false
		let done: Promise<string>
		let complete: (status: string) => void
		let timer: ReturnType<typeof setTimeout>
		const record = (kind: string, detail: object = {}) =>
			events.push({ kind, at: performance.now() - started, ...positions(), ...detail })
		const finish = (status: string) => {
			if (!armed || finished) {
				return
			}

			finished = true
			record('finished', { status })
			clearTimeout(timer)
			document.removeEventListener('wheel', onWheel, true)
			root.removeEventListener('scrollend', onEnd)
			complete(status)
		}
		const onWheel = (event: WheelEvent) => {
			const elements = event
				.composedPath()
				.filter((target): target is Element => target instanceof Element)

			wheelValid =
				event.isTrusted &&
				event.deltaX === 0 &&
				event.deltaY === 650 &&
				event.deltaMode === 0 &&
				Math.abs(event.clientX - chosen.x) <= 1 &&
				Math.abs(event.clientY - chosen.y) <= 1 &&
				valid(elements)
			record('wheel', {
				trusted: event.isTrusted,
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaMode: event.deltaMode,
				clientX: event.clientX,
				clientY: event.clientY,
				path: elements.map(describe),
				valid: wheelValid,
				defaultPrevented: event.defaultPrevented,
			})

			if (!wheelValid) {
				finish('invalid-wheel-owner')
			}
		}
		const onEnd = (event: Event) => {
			record('scrollend', {
				target: event.target instanceof Element ? describe(event.target) : null,
				trusted: event.isTrusted,
			})

			if (event.target === root && event.isTrusted && wheelValid && root.scrollTop > before) {
				finish('root-scrollend-with-movement')
			}
		}

		return {
			point: chosen,
			arm: () => {
				const hit = document.elementFromPoint(chosen.x, chosen.y)

				if (armed || !hit || !valid(chain(hit))) {
					throw new Error('Main root wheel precondition changed after pointer move')
				}

				armed = true
				started = performance.now()
				before = root.scrollTop
				done = new Promise<string>(resolve => {
					complete = resolve
				})
				document.addEventListener('wheel', onWheel, { capture: true, passive: true })
				root.addEventListener('scrollend', onEnd)
				timer = setTimeout(() => finish('timeout'), 5000)
				record('listener-ready', {
					point: chosen,
					hit: describe(hit),
					path: chain(hit).map(describe),
					deadlineMs: 5000,
				})

				return { point: chosen, before, events }
			},
			wait: () => done,
			finish,
			report: () => ({ point: chosen, before, ...positions(), events }),
		}
	})

	try {
		const point = await state.evaluate(value => value.point)

		await page.mouse.move(point.x, point.y)
		const ready = await state.evaluate(value => value.arm())

		await attach('root-wheel-ready', JSON.stringify(ready))
		await page.mouse.wheel(0, 650)
		const result = await state.evaluate(value => value.wait())

		if (result !== 'root-scrollend-with-movement') {
			throw new Error('Root wheel failed: ' + result)
		}
	} finally {
		const report = await state.evaluate(value => {
			value.finish('driver-finally')

			return value.report()
		})

		try {
			await attach('root-wheel-result', JSON.stringify(report))
		} finally {
			await state.dispose()
		}
	}
}
