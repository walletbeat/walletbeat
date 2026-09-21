/**
 * Single source of truth for markdown content collections that are rendered as
 * site pages. Each entry records where the source markdown lives in the
 * repository and the URL path prefix where the collection is rendered on the
 * site.
 */

export interface RenderedMarkdownCollection {
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
}

export const RENDERED_MARKDOWN_COLLECTIONS = {
	about: { name: 'about', repoDir: '/src/pages/about', urlPrefix: '/about' },
	docs: { name: 'docs', repoDir: '/resources/docs', urlPrefix: '/docs' },
	governance: { name: 'governance', repoDir: '/governance', urlPrefix: '/governance' },
} as const satisfies Record<string, RenderedMarkdownCollection>
