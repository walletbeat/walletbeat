/**
 * Observe native text roles and actual backdrop slots, excluding disclosure chevrons.
 * @param {Element} root
 */
export function presentationStyles(root) {
	/** @param {Element} element */
	const font = element => ({
		tag: element.tagName,
		text: (element.textContent ?? '').trim().slice(0, 100),
		family: getComputedStyle(element).fontFamily,
	})
	const surfaces = []

	for (const owner of root.querySelectorAll(
		'[data-sticky], [data-sticky-breadcrumb~="position"]',
	)) {
		const tokens = owner.getAttribute('data-sticky')?.split(/\s+/) ?? []
		/** @type {(string | null)[]} */
		const slots = []

		if (tokens.includes('backdrop-self')) {
			slots.push(null)
		}

		if (
			tokens.includes('backdrop-before') ||
			owner.matches('[data-sticky-breadcrumb~="position"]')
		) {
			slots.push('::before')
		}

		if (tokens.includes('backdrop-after')) {
			slots.push('::after')
		}

		for (const slot of slots) {
			const style = getComputedStyle(owner, slot)

			surfaces.push({
				owner: owner.id || owner.tagName,
				slot,
				mask: style.maskImage,
				backdrop: style.backdropFilter,
				content: style.content,
			})
		}
	}

	return {
		headings: [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(font),
		badges: [...root.querySelectorAll('[data-badge]')].map(font),
		navigation: [...document.querySelectorAll('#wallet-toc a, #nav a')]
			.filter(element => (element.textContent ?? '').trim())
			.map(font),
		prose: [...root.querySelectorAll('p')]
			.filter(element => !element.closest('pre,code'))
			.map(font),
		surfaces,
	}
}
