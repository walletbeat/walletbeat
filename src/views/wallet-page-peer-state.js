/**
 * Publishes native destination interaction at its named peers before and after hydration.
 * @param {HTMLElement} container
 * @param {Map<string, string[]>} groups
 * @param {boolean} [replace]
 * @returns {() => void}
 */
export default function publishPeerState(container, groups, replace = false) {
	const island = container.closest('astro-island')
	// Hydration can replace the page root while retaining its island.
	const owner = island ?? container
	const key = Symbol.for('walletbeat.peer-state')
	/** @type {unknown} */
	const previous = Reflect.get(owner, key)

	if (typeof previous === 'function') {
		if (!replace) {
			return () => {
				Reflect.apply(previous, undefined, [])
			}
		}

		Reflect.apply(previous, undefined, [])
	}

	const stateAttribute = 'data-pressable-state'
	/** @type {Map<Element, string | null>} */
	const originals = new Map()
	let disposed = false
	/** @param {Element} owner @param {string | null} value */
	const attribute = (owner, value) => {
		if (!originals.has(owner)) {
			originals.set(owner, owner.getAttribute(stateAttribute))
		}

		if (value === null) {
			owner.removeAttribute(stateAttribute)
		} else {
			owner.setAttribute(stateAttribute, value)
		}
	}
	/** @type {Map<string, Element[]>} */
	const peers = new Map()

	for (const owner of container.querySelectorAll('[data-pressable-name]')) {
		const identity = /** @type {string} */ (owner.getAttribute('data-pressable-name'))
		const owners = peers.get(identity) ?? []

		owners.push(owner)
		peers.set(identity, owners)
	}
	const flower = container.querySelector('.pie-navigation-geometry')
	/** @type {Map<Element, string>} */
	let published = new Map()
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let pending
	const publish = () => {
		/** @type {Map<Element, Set<string>>} */
		const states = new Map()
		/** @param {Element} owner @param {string} state */
		const mark = (owner, state) => {
			/** @type {Set<string>} */
			const tokens = states.get(owner) ?? new Set()

			tokens.add(state)
			states.set(owner, tokens)
		}

		for (const source of container.querySelectorAll(
			'a[data-pressable-name]:is(:hover, :focus-visible, :active, :interest-source)',
		)) {
			const targets =
				source.getAttribute('data-pressable-targets')?.split(/\s+/).filter(Boolean) ?? []

			if (source.matches(':is(:hover, :focus-visible, :active)')) {
				mark(source, 'interacting')

				for (const identity of targets) {
					for (const owner of peers.get(identity) ?? []) {
						mark(owner, 'interacting')

						if (source.matches(':active')) {
							mark(owner, 'pressed')
						}
					}
				}
			}

			for (const owner of peers.get(
				/** @type {string} */ (source.getAttribute('data-pressable-name')),
			) ?? []) {
				if (owner.matches('.pie-navigation :is(li, details)')) {
					mark(owner, 'exact')
				}
			}

			for (const identity of targets) {
				const related = groups.get(identity)

				if (!related) {
					continue
				}

				if (flower) {
					mark(flower, 'related')
				}

				for (const destination of related) {
					for (const owner of peers.get(destination) ?? []) {
						if (owner.matches('.pie-navigation :is(li, details)')) {
							mark(owner, 'related')
						}
					}
				}
			}
		}
		/** @type {Map<Element, string>} */
		const next = new Map(
			[...states].map(([owner, tokens]) => [
				owner,
				['interacting', 'pressed', 'exact', 'related'].filter(token => tokens.has(token)).join(' '),
			]),
		)

		for (const owner of new Set([...published.keys(), ...next.keys()])) {
			const value = next.get(owner)

			if (value !== published.get(owner)) {
				attribute(owner, value ?? null)
			}
		}
		published = next
	}
	// Interest state changes after its event's default action, beyond the microtask checkpoint.
	/** @param {Event} event */
	const schedule = event => {
		if (published.size === 0 && event.target instanceof Node && !container.contains(event.target)) {
			return
		}

		if (pending !== undefined) {
			return
		}

		pending = setTimeout(() => {
			pending = undefined
			publish()
		}, 0)
	}
	const events = [
		'pointerover',
		'pointerout',
		'pointerdown',
		'pointerup',
		'pointercancel',
		'dragend',
		'focusin',
		'focusout',
		'keydown',
		'keyup',
		'interest',
		'loseinterest',
	]

	function dispose() {
		if (disposed) {
			return
		}

		disposed = true

		if (Reflect.get(owner, key) === dispose) {
			Reflect.deleteProperty(owner, key)
		}

		island?.removeEventListener('astro:unmount', dispose)

		if (pending !== undefined) {
			clearTimeout(pending)
		}

		for (const event of events) {
			document.removeEventListener(event, schedule, true)
		}
		window.removeEventListener('blur', schedule)

		for (const [owner, value] of originals) {
			if (value === null) {
				owner.removeAttribute(stateAttribute)
			} else {
				owner.setAttribute(stateAttribute, value)
			}
		}
	}

	Reflect.set(owner, key, dispose)

	for (const event of events) {
		document.addEventListener(event, schedule, true)
	}
	window.addEventListener('blur', schedule)
	island?.addEventListener('astro:unmount', dispose, { once: true })
	publish()

	return dispose
}
