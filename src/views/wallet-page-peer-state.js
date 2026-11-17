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
	const nestedPressAttribute = 'data-pressable-descendant-active'
	/** @type {Set<Element>} */
	const pressedAncestors = new Set()
	/** @type {Map<string, Element>} */
	const pressSources = new Map()
	/** @type {CSSStyleRule[]} */
	const pressRules = []
	/** @param {CSSStyleSheet | CSSGroupingRule} owner */
	const findPressRules = owner => {
		for (const rule of owner.cssRules) {
			if (
				rule instanceof CSSStyleRule &&
				rule.style.getPropertyValue('---pressable-opacity') &&
				rule.selectorText.includes('summary[data-sticky-breadcrumb~="position"]:active')
			) {
				pressRules.push(rule)
			}

			if ('cssRules' in rule) {
				findPressRules(/** @type {CSSGroupingRule} */ (rule))
			}
		}
	}

	try {
		for (const sheet of document.styleSheets) {
			if (!sheet.href || new URL(sheet.href).origin === location.origin) {
				findPressRules(sheet)
			}
		}
	} catch {
		pressRules.length = 0
	}

	const pressRule = pressRules.length === 1 ? pressRules[0] : null
	const nativePressSelector = pressRule?.selectorText ?? ''
	// Consume the authored native classification, including its label exception.
	const controls = /:has\((:where\(.*?\)):active\)\)/s.exec(nativePressSelector)?.[1]
	const label = /\):is\(\s*(label:has\(.*?\)),/s.exec(nativePressSelector)?.[1]
	const pressOwners =
		pressRule?.parentRule instanceof CSSStyleRule ? pressRule.parentRule.selectorText : null
	const localPressAttribute = 'data-pressable-local'
	const localPressEnabled = Boolean(pressRule && controls && label && pressOwners)
	const clearNestedPress = () => {
		for (const ancestor of pressedAncestors) {
			ancestor.removeAttribute(nestedPressAttribute)
		}
		pressedAncestors.clear()
		pressSources.clear()
	}
	/** @param {Event} event */
	const updateNestedPress = event => {
		if (!localPressEnabled || !event.isTrusted) {
			return
		}

		if (event instanceof PointerEvent && !event.isPrimary) {
			return
		}

		const hadSources = pressSources.size > 0 || pressedAncestors.size > 0
		const pointer = event instanceof PointerEvent ? `pointer:${event.pointerId}` : null
		const key =
			event instanceof KeyboardEvent && [' ', 'Enter'].includes(event.key)
				? `key:${event.key}`
				: null
		const starts = event.type === 'pointerdown' ? pointer : event.type === 'keydown' ? key : null
		const ends = ['pointerup', 'pointercancel'].includes(event.type)
			? pointer
			: event.type === 'keyup'
				? key
				: null

		if (starts && controls) {
			const target = event.composedPath().find(node => node instanceof Element)
			const source = target instanceof Element ? target.closest(`:is(${controls}, ${label})`) : null

			if (source && owner.contains(source)) {
				pressSources.set(starts, source)
			}
		} else if (ends) {
			pressSources.delete(ends)
		} else if (event.type === 'blur') {
			pressSources.clear()
		} else if (event.type === 'focusout' || event.type === 'dragend') {
			const prefix = event.type === 'focusout' ? 'key:' : 'pointer:'

			for (const source of pressSources.keys()) {
				if (source.startsWith(prefix)) {
					pressSources.delete(source)
				}
			}
		} else {
			return
		}

		refreshNestedPress()

		return hadSources || pressSources.size > 0
	}
	/** @param {boolean} [native] */
	const refreshNestedPress = (native = false) => {
		for (const ancestor of pressedAncestors) {
			ancestor.removeAttribute(nestedPressAttribute)
		}
		pressedAncestors.clear()

		if (!pressOwners || !label) {
			return
		}

		for (const source of pressSources.values()) {
			if (native && !source.matches(':active')) {
				continue
			}

			for (
				let ancestor = source.parentElement;
				ancestor && ancestor !== owner;
				ancestor = ancestor.parentElement
			) {
				if (ancestor.matches(pressOwners) && !ancestor.matches(label)) {
					pressedAncestors.add(ancestor)
				}
			}
		}

		for (const ancestor of pressedAncestors) {
			ancestor.setAttribute(nestedPressAttribute, '')
		}
	}

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
	let publishPending = false
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
		const pressChanged = updateNestedPress(event)

		const peersChanged =
			published.size > 0 ||
			(event.target instanceof Element &&
				container.contains(event.target) &&
				(event.type === 'interest' ||
					event.type === 'loseinterest' ||
					container.contains(event.target.closest('a[data-pressable-name]'))))

		if (!pressChanged && !peersChanged) {
			return
		}

		publishPending ||= peersChanged

		if (pending !== undefined) {
			return
		}

		pending = setTimeout(() => {
			pending = undefined
			refreshNestedPress(true)

			if (publishPending) {
				publishPending = false
				publish()
			}
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
		clearNestedPress()

		if (localPressEnabled) {
			owner.removeAttribute(localPressAttribute)
		}

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
	if (localPressEnabled) {
		owner.setAttribute(localPressAttribute, '')
	}

	return dispose
}
