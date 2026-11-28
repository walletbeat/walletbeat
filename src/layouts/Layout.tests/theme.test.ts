import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

const layout = readFileSync(new URL('../Layout.astro', import.meta.url), 'utf8')
const script = layout.split('<script is:inline>')[1]?.split('</script>')[0]

if (!script) {
	throw new Error('Missing theme lifecycle script')
}

function theme(systemDark: boolean, stored: string | null, storageBlocked = false) {
	const context = createContext({ systemDark, stored, storageBlocked })

	runInContext(
		`
		class HTMLInputElement { id = 'theme-toggle'; checked = false }
		const listeners = new Map();
		const media = { matches: systemDark, addEventListener: (_, fn) => { media.changed = fn } };
		const matchMedia = () => media;
		const localStorage = {
			getItem() { if (storageBlocked) throw Error(); return stored },
			setItem(_, value) { if (storageBlocked) throw Error(); stored = value }
		};
		function makeDocument() {
			return {
				toggle: null,
				documentElement: { style: { colorScheme: '', removeProperty() { this.colorScheme = '' } } },
				getElementById() { return this.toggle },
				addEventListener(name, fn) { listeners.set(name, fn) }
			};
		}
		let document = makeDocument();
		function mount() { document.toggle = new HTMLInputElement() }
		function ready() { listeners.get('DOMContentLoaded')() }
		function click() {
			document.toggle.checked = !document.toggle.checked;
			listeners.get('change')({ target: document.toggle });
		}
		function os(dark) { media.matches = dark; media.changed() }
		function swap() {
			const next = makeDocument();
			next.toggle = new HTMLInputElement();
			listeners.get('astro:before-swap')({ newDocument: next });
			document = next;
		}
		function choice() { return document.toggle.checked !== media.matches ? 'dark' : 'light' }
		`,
		context,
	)
	runInContext(script, context)

	return (code: string): unknown => runInContext(code, context)
}

describe('theme preference lifecycle', () => {
	for (const systemDark of [false, true]) {
		for (const stored of [null, 'invalid', 'light', 'dark']) {
			for (const early of [false, true]) {
				it(`preserves user actions: OS dark=${systemDark}, stored=${stored}, early=${early}`, () => {
					const run = theme(systemDark, stored)
					const initial =
						stored === 'light' || stored === 'dark' ? stored : systemDark ? 'dark' : 'light'

					expect(run('document.documentElement.style.colorScheme')).toBe(
						stored === 'light' || stored === 'dark' ? stored : '',
					)
					run('mount()')

					if (!early) {
						run('ready()')
					}

					run('click(); ready()')
					const selected = initial === 'dark' ? 'light' : 'dark'

					expect(run('choice()')).toBe(selected)
					expect(run('stored')).toBe(selected)
					run('os(!media.matches); swap()')
					expect(run('choice()')).toBe(selected)
					run('click(); swap(); swap()')
					expect(run('choice()')).toBe(initial)
				})
			}
		}
		it(`follows OS until an explicit choice, including blocked storage: ${systemDark}`, () => {
			const run = theme(systemDark, null, true)

			run('mount(); ready(); os(!media.matches); swap()')
			expect(run('choice()')).toBe(systemDark ? 'light' : 'dark')
			run('click(); os(!media.matches); swap()')
			expect(run('choice()')).toBe(systemDark ? 'dark' : 'light')
		})
	}
})
