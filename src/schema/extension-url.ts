import type { DomainUrl } from './url'

/**
 * A Chrome Web Store extension URL.
 *
 * Format: https://chromewebstore.google.com/detail/[name-slug]/[32-char-extension-id]
 *
 * Example: https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn
 *
 * The name slug is the human-readable wallet name; the extension ID is the
 * 32-character lowercase alphanumeric identifier assigned by the Chrome Web Store.
 *
 * If this field is present on a wallet but does not match this format,
 * `getExtensionId` will throw at runtime.
 */
export type ExtensionUrl = DomainUrl<'chromewebstore.google.com'> &
	`https://chromewebstore.google.com/detail/${string}`

/**
 * Extracts the 32-character extension ID from a Chrome Web Store URL.
 *
 * Throws if the URL does not match the expected format.
 */
export function getExtensionId(url: ExtensionUrl): string {
	const match = /\/detail\/[^/]+\/([a-z]{32})(?:[/?#]|$)/.exec(url)

	if (match === null) {
		throw new Error(
			`extensions[] entry does not contain a valid Chrome extension ID: ${url}\n` +
				'Expected format: https://chromewebstore.google.com/detail/<name-slug>/<32-char-id>',
		)
	}

	return match[1]
}
