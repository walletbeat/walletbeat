/**
 * Resolve a wallet's static selection using only metadata on its incoming document.
 * @param {Document} document
 * @param {URL} destination
 * @returns {URL | null}
 */
export default function walletSelectionDestination(document, destination) {
	const links = [...document.querySelectorAll('link[data-wallet-selection]')]
	const params = destination.searchParams
	const requestedVariant = params.get('variant') ?? ''
	const variant = links.some(link => link.getAttribute('data-variant') === requestedVariant)
		? requestedVariant
		: ''
	const model = params.get('model') ?? ''
	const link = links.find(
		link =>
			link.getAttribute('data-variant') === variant && link.getAttribute('data-model') === model,
	)
	const href = link?.getAttribute('href')

	if (!href) {
		return null
	}

	const target = new URL(href, destination)

	if (
		target.origin !== destination.origin ||
		!target.pathname.startsWith(destination.pathname + 'selection/')
	) {
		return null
	}

	target.search = destination.search
	target.hash = destination.hash

	return target.href === destination.href ? null : target
}
