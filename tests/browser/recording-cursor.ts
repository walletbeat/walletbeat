import type { Page } from '@playwright/test'

/** Display the computed CSS cursor because browser video excludes the OS cursor. */
export async function installRecordingCursor(page: Page) {
	await page.addInitScript(() => {
		addEventListener('DOMContentLoaded', () => {
			const cursor = document.createElement('div')

			cursor.setAttribute('aria-hidden', 'true')
			cursor.setAttribute('data-recording-cursor', '')
			cursor.style.cssText =
				'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;user-select:none;display:none;color:white;font:24px monospace;text-shadow:0 1px 2px black,1px 0 2px black;line-height:1'
			document.body.append(cursor)
			let point: { x: number; y: number } | null = null
			const update = () => {
				if (!point) {
					return
				}

				const target = document.elementFromPoint(point.x, point.y)
				const style = target ? getComputedStyle(target) : null
				const computed = style?.cursor ?? 'default'
				let text = computed === 'text' || computed === 'vertical-text'

				if (target && computed === 'auto' && style?.userSelect !== 'none') {
					const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT)

					for (let node = walker.nextNode(); node && !text; node = walker.nextNode()) {
						const range = document.createRange()

						range.selectNodeContents(node)
						text = [...range.getClientRects()].some(
							rect =>
								point &&
								point.x >= rect.left &&
								point.x <= rect.right &&
								point.y >= rect.top &&
								point.y <= rect.bottom,
						)
					}
				}

				cursor.textContent = computed === 'pointer' ? '\u261e' : text ? '\u2160' : '↖'
				cursor.dataset.cursor = computed === 'pointer' ? 'pointer' : text ? 'text' : 'default'
				cursor.style.display = 'block'
				cursor.style.transform = `translate(${point.x}px, ${point.y}px)`
			}

			addEventListener(
				'pointermove',
				event => {
					point = { x: event.clientX, y: event.clientY }
					update()
				},
				{ passive: true },
			)
			addEventListener('scroll', update, { passive: true, capture: true })
		})
	})
}
