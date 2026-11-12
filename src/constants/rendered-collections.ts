/**
 * Single source of truth for markdown content collections that are rendered as
 * site pages. Each entry records where the source markdown lives in the
 * repository and the URL path prefix where the collection is rendered on the
 * site.
 */

export type RenderedMarkdownCollection = {
	/** Name of the Astro content collection (must match `content.config.ts`). */
	name: string

	/**
	 * Repo-root-relative directory holding the source markdown files.
	 */
	repoDir: `/${string}`

	/**
	 * URL path prefix where the collection is rendered.
	 */
	urlPrefix: `/${string}`
} & (
	| {
			dirIndex: false
	  }
	| {
			dirIndex: true
			/**
			 * Title of the collection's root index page.
			 */
			indexTitle: string
			/**
			 * Description of the collection's root index page.
			 */
			indexDescription: string
	  }
)

export const RENDERED_MARKDOWN_COLLECTIONS = {
	about: { name: 'about', repoDir: '/src/pages/about', urlPrefix: '/about', dirIndex: false },
	docs: {
		name: 'docs',
		repoDir: '/resources/docs',
		urlPrefix: '/docs',
		dirIndex: true,
		indexTitle: 'Documentation',
		indexDescription: 'Walletbeat documentation and guides',
	},
	governance: {
		name: 'governance',
		repoDir: '/governance',
		urlPrefix: '/governance',
		dirIndex: true,
		indexTitle: 'Governance',
		indexDescription: 'Walletbeat governance documents and decisions',
	},
} as const satisfies Record<string, RenderedMarkdownCollection>

interface PathMapping {
	repoPrefix: `/${string}`
	urlPrefix: `/${string}` | `https://${string}`
	stripFilename: boolean
}

/**
 * Ordered path mappings used when rewriting repo-relative URLs to published
 * site URLs. Mappings are matched longest-prefix-first.
 */
export const URL_REWRITE_MAPPINGS: ReadonlyArray<PathMapping> = [
	...Object.values(RENDERED_MARKDOWN_COLLECTIONS).map((collection): PathMapping => ({
		repoPrefix: `${collection.repoDir}/`,
		urlPrefix: `${collection.urlPrefix}/`,
		stripFilename: true,
	})),
	{ repoPrefix: '/public/', urlPrefix: '/', stripFilename: false },
	{ repoPrefix: '/src/pages/', urlPrefix: '/', stripFilename: true },
]

/**
 * File extensions treated as images by the Markdown URL rewrite plugin.
 * Used to keep image links (which point at the real file) from having
 * their filename stripped, and to detect image URLs during rewriting.
 */
export const IMAGE_EXTENSIONS: ReadonlySet<`.${string}`> = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.webp',
	'.svg',
	'.ico',
	'.mp4',
	'.webm',
])

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
 * GitHub blob/tree URL prefixes that are forbidden in markdown (they would link
 * to the site's own rendered content via GitHub). The only exceptions are
 * {@link ALLOWED_GITHUB_URLS} and links to non-served files (which are
 * intentionally rewritten to GitHub).
 */
export const FORBIDDEN_GITHUB_PREFIXES: ReadonlyArray<string> = [
	'https://github.com/walletbeat/walletbeat/blob/',
	'https://github.com/walletbeat/walletbeat/tree/',
]

/**
 * Full GitHub URLs that are allowed even though they start with a
 * {@link FORBIDDEN_GITHUB_PREFIXES} prefix (e.g. the bare repository URL).
 */
export const ALLOWED_GITHUB_URLS: ReadonlySet<string> = new Set([
	'https://github.com/walletbeat/walletbeat',
])

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
export const SERVED_REPO_DIRS: ReadonlyArray<string> = [
	...Object.values(RENDERED_MARKDOWN_COLLECTIONS).map(collection =>
		collection.repoDir.replace(/^\//, ''),
	),
	'public',
	'src/pages',
]

/**
 * Repo-root-relative URL prefixes under which rendered markdown collections are
 * published (e.g. `/docs`, `/about`). A URL under one of these prefixes is a
 * valid published site path even when it does not match a source-tree mapping.
 */
export const PUBLISHED_URL_PREFIXES = Object.values(RENDERED_MARKDOWN_COLLECTIONS).map(collection =>
	collection.urlPrefix.replace(/^\//, ''),
)
