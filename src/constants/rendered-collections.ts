import type { WBIconID } from '@/styles/wbicons'

/**
 * Single source of truth for markdown content collections that are rendered as
 * site pages. Each entry records where the source markdown lives in the
 * repository; collection names determine the public URL prefixes.
 */

/**
 * Presentation metadata of a statically implemented page that belongs to a
 * collection but has no Markdown source file (e.g. an `.astro` page under
 * `src/pages`). Markdown pages carry this metadata in their frontmatter instead.
 */
type StaticPagePresentation = {
	listTitle?: string
	shortTitle?: string
	icon?: WBIconID
	order?: number
}

export type MarkdownAstroCollection = {
	/**
	 * Repo-root-relative directory holding the source markdown files.
	 */
	repoDir: `/${string}`

	/** Title and description of the collection's root index page. */
	indexTitle: string
	indexDescription?: string
	shortTitle?: string
	icon?: WBIconID

	/**
	 * Statically implemented pages belonging to the collection, keyed by slug.
	 * Presence of `shortTitle` opts the page into the site navigation.
	 */
	staticPages?: Readonly<Record<string, StaticPagePresentation>>
}

export const MARKDOWN_ASTRO_COLLECTIONS = {
	about: {
		repoDir: '/src/content/about',
		indexTitle: 'About',
		icon: 'about',
		staticPages: {
			faq: { listTitle: 'FAQ', shortTitle: 'FAQ', icon: 'question_mark', order: 2 },
		},
	},
	docs: {
		repoDir: '/resources/docs',
		indexTitle: 'Documentation',
		indexDescription: 'Walletbeat documentation and guides',
		icon: 'graduate',
		shortTitle: 'Docs',
	},
	governance: {
		repoDir: '/governance',
		indexTitle: 'Governance',
		indexDescription: 'Walletbeat governance documents and decisions',
		icon: 'security_audits',
	},
} as const satisfies Record<string, MarkdownAstroCollection>

/** The last component of a nested Markdown entry is its source filename. */
export const markdownPageSlug = (id: string) => {
	const separator = id.lastIndexOf('/')

	return separator === -1 ? id : id.slice(0, separator)
}

interface PathMapping {
	repoPrefix: `/${string}/`
	urlPrefix: `/${string}/` | '/'
	stripFilename: boolean
}

/**
 * Ordered path mappings used when rewriting repo-relative URLs to published
 * site URLs. Mappings are matched longest-prefix-first.
 */
export const URL_REWRITE_MAPPINGS = (
	[
		...Object.entries(MARKDOWN_ASTRO_COLLECTIONS).map(
			([name, collection]) =>
				({
					repoPrefix: `${collection.repoDir}/`,
					urlPrefix: `/${name}/`,
					stripFilename: true,
				}) as const satisfies PathMapping,
		),
		{ repoPrefix: '/public/', urlPrefix: '/', stripFilename: false },
		{ repoPrefix: '/src/pages/', urlPrefix: '/', stripFilename: true },
	] as const satisfies readonly PathMapping[]
).toSorted((a, b) => b.repoPrefix.length - a.repoPrefix.length)

/**
 * URL prefixes that are never rewritten (external protocols, anchors, data
 * URLs, etc.). Links starting with these are left untouched.
 */
export const SKIPPED_URL_PREFIXES: ReadonlyArray<string> = [
	'http://',
	'https://',
	'mailto:',
	'tel:',
	'#',
	'//',
	'data:',
]

/**
 * GitHub blob/tree URL prefixes that reference files in this repository.
 * Links starting with these are transformed at generation time to their
 * associated site URLs; links to files the site does not serve are kept as-is.
 */
export const IN_REPO_GITHUB_URL_PREFIXES: ReadonlyArray<string> = [
	'https://github.com/walletbeat/walletbeat/blob/',
	'https://github.com/walletbeat/walletbeat/tree/',
]

/**
 * File extensions that are not served on the site.
 * Rewritten to repository URLs when links to them are rendered on the site.
 *
 * Extensions are lower-case and include the leading dot (e.g. `.sh`).
 */
export const NON_SERVED_EXTENSIONS: ReadonlySet<`.${string}`> = new Set(['.sh'])

/**
 * Repo-root-relative directories whose contents are served as site pages or
 * published assets. A URL resolving to a path under one of these is served by
 * the site (either mapped to a collection URL or served as a static asset).
 */
export const SERVED_REPO_DIRS = [
	...Object.values(MARKDOWN_ASTRO_COLLECTIONS).map(collection =>
		collection.repoDir.replace(/^\//, ''),
	),
	'public',
	'src/pages',
] as const satisfies readonly string[]

/**
 * Repo-root-relative URL prefixes under which rendered markdown collections are
 * published (e.g. `/docs`, `/about`). A URL under one of these prefixes is a
 * valid published site path even when it does not match a source-tree mapping.
 */
export const PUBLISHED_URL_PREFIXES = Object.keys(MARKDOWN_ASTRO_COLLECTIONS)
