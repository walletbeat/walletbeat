import { isNonEmptyArray, type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'

/** A URL and a label. */
export interface LabeledUrl {
	url: string
	label: string
}

/** A Url is either a simple URL string or a LabeledUrl. */
export type Url = string | LabeledUrl

/** A URL with a specific domain name. */
type WithDomain<D extends string> = `${'http' | 'https'}://${D | `www.${D}`}${'' | `/${string}`}`

/** DomainUrl is a Url with a specific domain name. */
export type DomainUrl<D extends string> = Url &
	(WithDomain<D> | (LabeledUrl & { url: WithDomain<D> }))

/** Get the domain part of a URL. */
export function getDomain(url: Url): string {
	let hostname = new URL(isLabeledUrl(url) ? url.url : url).hostname

	if (hostname.startsWith('www.')) {
		hostname = hostname.substring('www.'.length)
	}

	return hostname
}

/**
 * Unlabeled URLs have their labels default to their domain name.
 * However, if an entry for this domain name exists in this map, it
 * will be used as label instead.
 */
const wellKnownDomainsToLabels: Record<string, string> = {
	'crunchbase.com': 'Crunchbase',
	'github.com': 'GitHub',
	'warpcast.com': 'Farcaster',
	'farcaster.xyz': 'Farcaster',
}

function getDefaultUrlLabel(url: string): string {
	const hostname = getDomain(url)

	if (Object.hasOwn(wellKnownDomainsToLabels, hostname)) {
		return wellKnownDomainsToLabels[hostname]
	}

	return hostname
}

/** Return the label for a URL. */
export function getUrlLabel(url: Url): string {
	if (isLabeledUrl(url)) {
		return url.label
	}

	return getDefaultUrlLabel(url)
}

/**
 * Label a URL automatically.
 * @param url The URL to label.
 * @param defaultLabel The label to use if no label exists in the URL.
 *                     If undefined, use `getUrlLabel(url)`.
 * @return A labeled URL.
 */
export function labeledUrl(url: Url, defaultLabel?: string): LabeledUrl {
	if (typeof url === 'string') {
		return { label: defaultLabel ?? getUrlLabel(url), url }
	}

	return url
}

/** Type predicate for `LabeledUrl`. */
export function isLabeledUrl(obj: unknown): obj is LabeledUrl {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		Object.hasOwn(obj, 'label') &&
		Object.hasOwn(obj, 'url') &&
		Object.values(obj).every(val => typeof val === 'string')
	)
}

/** Type predicate for `Url`. */
export function isUrl(obj: unknown): obj is Url {
	return typeof obj === 'string' || isLabeledUrl(obj)
}

/**
 * Merge a labeled URL into an array of URLs.
 * If the new URL already exists in `urls`, it will be used to possibly update
 * the label. If the new URL doesn't already exist in `urls`, it will be added
 * to the end. `urls` is not modified.
 */
export function mergeLabeledUrls(
	urls: LabeledUrl[],
	newUrl: LabeledUrl,
): NonEmptyArray<LabeledUrl> {
	if (!isNonEmptyArray(urls)) {
		return [newUrl]
	}

	let foundMatch = false
	const merged = nonEmptyMap(urls, oldUrl => {
		if (oldUrl.url !== newUrl.url) {
			return oldUrl
		}

		foundMatch = true
		const defaultLabel = getDefaultUrlLabel(newUrl.url)
		const betterLabel =
			oldUrl.label !== '' || oldUrl.label !== defaultLabel
				? oldUrl.label
				: newUrl.label !== ''
					? newUrl.label
					: defaultLabel

		return {
			label: betterLabel,
			url: newUrl.url,
		}
	})

	// The cast to `boolean` is necessary here as ESLint does not realize that
	// the function passed above can modify `foundMatch` as a side-effect.
	if (!(foundMatch as boolean)) {
		return [...merged, newUrl]
	}

	return merged
}

/**
 * A Markdown-formatted link to a URL.
 */
export function markdownUrlLink(
	url: Url,
	options?: { defaultLabel?: string; forceLabel?: string; bold?: boolean },
): string {
	let labeled = labeledUrl(url, options?.defaultLabel)

	if (options !== undefined) {
		if (options.forceLabel !== undefined) {
			labeled = {
				url: labeled.url,
				label: options.forceLabel,
			}
		}

		if (options.bold ?? false) {
			labeled = {
				url: labeled.url,
				label: `**${labeled.label}**`,
			}
		}
	}

	return `[${labeled.label}](${labeled.url})`
}
