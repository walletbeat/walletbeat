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

/** Get the full URL. */
export function getUrl(url: Url): string {
	return labeledUrl(url).url
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

/** A full 40-character git commit hash. */
const fullCommitHashRegExp = /^[0-9a-f]{40}$/

/**
 * A GitHub line-anchor URL fragment: `L123`, `L123-L456`,
 * or the column-qualified form `L123C4-L456C7`.
 */
const lineFragmentRegExp = /^L(?<first>\d+)(?:C\d+)?(?:-L(?<last>\d+)(?:C\d+)?)?$/

/** Format a GitHub line-anchor fragment as `L123` / `L123-456`, or null if not one. */
function gitHubLineRange(fragment: string): string | null {
	const match = lineFragmentRegExp.exec(fragment)

	if (match?.groups === undefined) {
		return null
	}

	const { first, last } = match.groups

	if (last === undefined || last === first) {
		return `L${first}`
	}

	return `L${first}-${last}`
}

/**
 * GitHub top-level routes that are site pages, not org/user profiles.
 * Not exhaustive; covers routes plausibly used as references.
 */
const gitHubReservedTopLevelRoutes = new Set([
	'about',
	'collections',
	'features',
	'marketplace',
	'orgs',
	'pricing',
	'search',
	'sponsors',
	'topics',
	'trending',
])

/** Abbreviate a git ref for display: short hash for commit hashes, as-is otherwise. */
function shortGitRef(ref: string): string {
	return fullCommitHashRegExp.test(ref) ? ref.substring(0, 7) : ref
}

/**
 * Generate a concrete label for a GitHub URL.
 * Code permalinks get a `foo.ts L123-156 @abcdef1` style label
 * (filename + line range + abbreviated ref); other repo-scoped URLs
 * fall back to `org/repo` plus the page type (`org/repo releases`,
 * `org/repo #123`), and org/user profile pages to `GitHub: org`.
 * Returns null for URLs with no more concrete label than the domain
 * (github.com root, search, other site pages).
 *
 * Note: for `blob`/`tree` URLs, the segment right after the view is taken
 * as the ref. Branch names containing slashes are thus truncated, which is
 * acceptable: references are expected to pin a commit hash instead
 * (enforced for wallet data by tests/github-ref-commit-hash.test.ts).
 */
function getGitHubUrlLabel(url: URL): string | null {
	const segments = url.pathname
		.split('/')
		.filter(segment => segment !== '')
		.map(segment => {
			try {
				return decodeURIComponent(segment)
			} catch {
				return segment
			}
		})

	if (segments.length === 0) {
		return null
	}

	if (segments.length === 1) {
		// A single path segment is an org/user profile page, unless it is
		// one of GitHub's reserved top-level routes.
		if (gitHubReservedTopLevelRoutes.has(segments[0])) {
			return null
		}

		return `GitHub: ${segments[0]}`
	}

	const [org, repo, view, ref, ...pathSegments] = segments
	const orgRepo = `${org}/${repo}`

	switch (view) {
		case 'blob': {
			if (ref === undefined || pathSegments.length === 0) {
				return orgRepo
			}

			const filename = pathSegments[pathSegments.length - 1]
			const lineRange = gitHubLineRange(url.hash.replace(/^#/, ''))

			return `${filename}${lineRange === null ? '' : ` ${lineRange}`} @${shortGitRef(ref)}`
		}
		case 'tree': {
			if (ref === undefined) {
				return orgRepo
			}

			if (pathSegments.length === 0) {
				return `${orgRepo} @${shortGitRef(ref)}`
			}

			return `${pathSegments[pathSegments.length - 1]}/ @${shortGitRef(ref)}`
		}
		case 'commit': {
			if (ref === undefined) {
				return orgRepo
			}

			return `${orgRepo} @${shortGitRef(ref)}`
		}
		case undefined:
			// Repo root.
			return orgRepo
		case 'issues':
		case 'pull':
		case 'discussions':
			// Numbered items get GitHub's own #N idiom.
			if (ref !== undefined && /^\d+$/.test(ref)) {
				return `${orgRepo} #${ref}`
			}

			return `${orgRepo} ${view}`
		case 'releases':
			// The repo name plus the page type is still more informative
			// than the bare domain label.
			return `${orgRepo} ${view}`
		default:
			throw new Error(
				`Unhandled GitHub URL path type "${view}" in ${url.href}; ` +
					'add it to getGitHubUrlLabel() in src/schema/url.ts.',
			)
	}
}

function getDefaultUrlLabel(url: string): string {
	const hostname = getDomain(url)

	if (hostname === 'github.com') {
		const gitHubLabel = getGitHubUrlLabel(new URL(url))

		if (gitHubLabel !== null) {
			return gitHubLabel
		}
	}

	if (Object.hasOwn(wellKnownDomainsToLabels, hostname)) {
		return wellKnownDomainsToLabels[hostname]
	}

	return hostname
}

/**
 * A commit-hash version pin inside an auto-generated GitHub label,
 * e.g. the `@fa9d098` in `controller.ts L402-407 @fa9d098`.
 * Hashes are either the 7-character git abbreviation or the full
 * 40 characters, never a length in between.
 * Kept in sync with the "Git commit ref pins" pattern in .cspell.json.
 */
export const gitCommitRefPinRegExp = /@(?:[0-9a-f]{40}|[0-9a-f]{7})\b/g

/** File extensions of URLs that browsers render as images. */
const imageFileExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']

/**
 * Whether a URL points to an image file hosted in the Walletbeat repo
 * itself, i.e. the root-relative URL that a file-based reference under
 * `public/` qualifies to. External (absolute or protocol-relative) image
 * URLs do not match.
 */
export function isRepoImageUrl(url: Url): boolean {
	const path = (isLabeledUrl(url) ? url.url : url).split(/[?#]/)[0].toLowerCase()

	// Root-relative, but not protocol-relative (`//host/...`), URLs are
	// served from this site's own origin.
	if (!path.startsWith('/') || path.startsWith('//')) {
		return false
	}

	return imageFileExtensions.some(extension => path.endsWith(extension))
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
