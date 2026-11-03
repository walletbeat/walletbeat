import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../deploy/walletbeat-tv/tour.mjs', import.meta.url), 'utf8')
const initialization = source.split('await context.addInitScript(')[1]?.split('\n}, origin)')[0]

assert.ok(initialization, 'Missing production page initialization')

/**
 * @typedef {{now: number, lastInputTime: number, query: () => Promise<boolean>, input: () => Promise<void>}} Host
 * @typedef {{top: unknown, addEventListener: () => void, walletbeatTVIsPaused: () => Promise<boolean>, walletbeatTVInput: () => Promise<void>, walletbeatTVPaused?: boolean, walletbeatTVResume?: () => Promise<boolean>}} PageWindow
 */

/** @param {Host} host */
async function documentFor(host, storedInputTime = '0') {
	/** @type {Map<string, ((...args: unknown[]) => unknown)[]>} */
	const listeners = new Map()
	/** @type {Element[]} */
	const elements = []
	/** @type {Set<string>} */
	const attributes = new Set()
	/** @param {string} type @param {(...args: unknown[]) => unknown} callback */
	const listen = (type, callback) => {
		const callbacks = listeners.get(type) ?? []

		callbacks.push(callback)
		listeners.set(type, callbacks)
	}

	class Element {
		id = ''
		/** @type {Record<string, string>} */
		style = {}
		/** @type {Record<string, string>} */
		dataset = {}
		setAttribute() {}
		showPopover() {}
		hidePopover() {}
	}
	class MouseEvent {
		isTrusted = true
		clientX = 100
		clientY = 100
	}
	/** @type {PageWindow} */
	const window = {
		top: null,
		addEventListener() {},
		walletbeatTVIsPaused: () => host.query(),
		walletbeatTVInput: () => host.input(),
	}

	window.top = window
	const document = {
		hidden: false,
		addEventListener: listen,
		createElement: () => {
			const element = new Element()

			elements.push(element)

			return element
		},
		/** @param {string} id */
		getElementById: id => elements.find(element => element.id === id),
		documentElement: {
			append() {},
			/** @param {string} name */
			setAttribute: name => attributes.add(name),
			/** @param {string} name */
			removeAttribute: name => attributes.delete(name),
			/** @param {string} name @param {boolean} present */
			toggleAttribute: (name, present) =>
				present ? attributes.add(name) : attributes.delete(name),
		},
	}

	runInNewContext(`(${initialization}\n})('https://walletbeat.test')`, {
		window,
		document,
		navigator: {},
		location: { origin: 'https://walletbeat.test' },
		innerWidth: 1440,
		innerHeight: 900,
		MouseEvent,
		sessionStorage: {
			/** @param {string} key */
			getItem: key => (key === 'walletbeat-tv-last-input' ? storedInputTime : null),
			setItem() {},
		},
	})
	const attached = listeners.get('DOMContentLoaded')

	assert.ok(attached)
	await Promise.all(attached.map(callback => callback()))
	const cursor = document.getElementById('walletbeat-tv-cursor')
	const resume = window.walletbeatTVResume

	assert.ok(cursor)
	assert.ok(resume)

	return {
		window,
		resume,
		cursor,
		attributes,
		input: () => {
			const callbacks = listeners.get('pointerdown')

			assert.ok(callbacks)

			for (const callback of callbacks) {
				callback(new MouseEvent())
			}
		},
	}
}

function activity() {
	/** @type {Host} */
	const host = {
		now: 100000,
		lastInputTime: 100000,
		query: () => Promise.resolve(host.now - host.lastInputTime < 15000),
		input: () => {
			host.lastInputTime = host.now

			return Promise.resolve()
		},
	}

	return host
}

await test('fresh documents derive the full inactivity interval from the host, regardless of stored clocks', async () => {
	for (const stored of ['0', '999999999']) {
		const host = activity()
		const page = await documentFor(host, stored)

		assert.equal(page.window.walletbeatTVPaused, true)
		assert.equal(page.cursor.style.opacity, '0')
		assert.equal(page.attributes.has('data-walletbeat-tv'), false)
		host.now += 14999
		assert.equal(await page.resume(), false)
		assert.equal(page.cursor.style.opacity, '0')
		host.now++
		assert.equal(await page.resume(), true)
		assert.equal(page.cursor.style.opacity, '1')
		assert.equal(page.attributes.has('data-walletbeat-tv'), true)
	}
})

await test('input during an in-flight resume query keeps manual presentation', async () => {
	const host = activity()

	host.lastInputTime = 0
	const page = await documentFor(host)
	/** @type {(value: boolean) => void} */
	let finishQuery = () => {
		throw new Error('Query has not started')
	}

	host.query = () =>
		new Promise(resolve => {
			finishQuery = resolve
		})
	const resumed = page.resume()

	await Promise.resolve()
	page.input()
	assert.equal(page.cursor.style.opacity, '0')
	finishQuery(false)
	assert.equal(await resumed, false)
	assert.equal(page.window.walletbeatTVPaused, true)
	assert.equal(page.attributes.has('data-walletbeat-tv'), false)
})

await test('resume waits for the latest input report before consulting host inactivity', async () => {
	const host = activity()

	host.lastInputTime = 0
	const page = await documentFor(host)
	let acknowledge = () => {
		throw new Error('Input has not started')
	}

	host.input = () =>
		new Promise(resolve => {
			acknowledge = () => {
				host.lastInputTime = host.now
				resolve()
			}
		})
	page.input()
	/** @type {boolean | undefined} */
	let result
	const resumed = page.resume().then(value => {
		result = value
	})

	await Promise.resolve()
	assert.equal(result, undefined)
	assert.equal(page.cursor.style.opacity, '0')
	acknowledge()
	await resumed
	assert.equal(result, false)
	assert.equal(page.window.walletbeatTVPaused, true)
})
