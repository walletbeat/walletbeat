/** Resolve heading depth from real semantic containers, including deeper subsections. */
/** @param {Element} root */
export function semanticOutline(root) {
	const scopes = 'section,details,article'
	const headings = 'h1,h2,h3,h4,h5,h6'
	/** @param {Element} owner */
	const firstOwned = owner =>
		[...owner.querySelectorAll(headings)].find(heading => heading.closest(scopes) === owner)
	const primary = root.querySelector('h1')

	return [...root.querySelectorAll(headings)].map(heading => {
		if (heading === primary) {
			return { text: heading.textContent?.trim(), level: 1, expected: 1, parent: null }
		}

		let owner = heading.closest(scopes)

		if (owner && firstOwned(owner) === heading) {
			owner = owner.parentElement?.closest(scopes) ?? null
		}

		while (owner && root.contains(owner)) {
			const parent = firstOwned(owner)

			if (parent) {
				return {
					text: heading.textContent?.trim(),
					level: Number(heading.tagName.slice(1)),
					expected: Number(parent.tagName.slice(1)) + 1,
					parent: parent.textContent?.trim(),
				}
			}

			owner = owner.parentElement?.closest(scopes) ?? null
		}

		return {
			text: heading.textContent?.trim(),
			level: Number(heading.tagName.slice(1)),
			expected: primary ? 2 : null,
			parent: primary?.textContent?.trim(),
		}
	})
}
