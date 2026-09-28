import type { CollectionEntry, CollectionKey, RenderResult } from 'astro:content'
import { render } from 'astro:content'

import type { RenderedMarkdownCollection } from '@/constants/rendered-collections'

/** A content collection entry with the fields the index logic needs. */
type IndexableCollectionEntry = {
	id: string
	data: { title: string; description?: string }
}

// ---------------------------------------------------------------------------
// Index page entry representing a subdirectory or leaf file
// ---------------------------------------------------------------------------

export interface IndexEntry {
	path: `/${string}`
	title: string
	description: string | null
}

function humanizeDirName(name: string): string {
	return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Slug normalization
// ---------------------------------------------------------------------------

/**
 * Map an original collection entry id to its normalized slug.
 *
 * Every directory that contains a markdown file is assumed to hold exactly one,
 * so the entry is always served at the directory URL.  For example,
 * `data-collection/data-collection.md` or `data-collection/anything.md` both
 * normalize to the slug `wallet-testing/data-collection` (served at
 * `/docs/wallet-testing/data-collection/`).
 */
export function normalizeSlug(id: string): string {
	const parts = id.split('/')

	if (parts.length <= 1) {
		return id
	}

	return parts.slice(0, -1).join('/')
}

/**
 * Build a reverse map from normalized slug → original entry id.
 *
 * Entries whose id differs from their normalized slug (i.e. every entry inside
 * a subdirectory) gets a mapping. Entries at the root level are unchanged.
 */
export function buildSlugToId(entries: IndexableCollectionEntry[]): Record<string, string> {
	const slugToId: Record<string, string> = {}

	for (const entry of entries) {
		const normalized = normalizeSlug(entry.id)

		if (normalized !== entry.id) {
			slugToId[normalized] = entry.id
		}
	}

	return slugToId
}

// ---------------------------------------------------------------------------
// Index page children
// ---------------------------------------------------------------------------

/**
 * Compute the children entries for an index page at a given directory level.
 *
 * Each unique immediate subdirectory under `currentDir` becomes an IndexEntry.
 * The frontmatter title/description of the (single) entry inside that
 * subdirectory overrides the humanized directory name.
 */
export function computeIndexEntries(
	allEntries: IndexableCollectionEntry[],
	currentDir: string,
	urlPrefix: string,
): IndexEntry[] {
	const children = new Map<string, IndexEntry>()

	for (const entry of allEntries) {
		const normalized = normalizeSlug(entry.id)
		const parts = normalized.split('/')

		if (currentDir === '') {
			// Root: direct children are top-level directories
			const topDir = parts[0]

			if (!topDir) {
				continue
			}

			if (!children.has(topDir)) {
				children.set(topDir, {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- urlPrefix starts with '/' so the result is a valid slash-prefixed path
					path: `${urlPrefix}/${topDir}/` as `/${string}`,
					title: humanizeDirName(topDir),
					description: null,
				})
			}

			// Entry lives in a direct subdirectory of root (normalized slug
			// is exactly one segment), so use its frontmatter data.
			if (parts.length === 1) {
				const child = children.get(topDir)

				if (child) {
					child.title = entry.data.title
					child.description = entry.data.description ?? null
				}
			}
		} else {
			const dirParts = currentDir.split('/')

			// Check if (normalized) entry is under this directory
			const prefix = parts.slice(0, dirParts.length).join('/')

			if (prefix !== currentDir) {
				continue
			}

			const nextPart = parts[dirParts.length]

			if (!nextPart) {
				continue
			}

			if (!children.has(nextPart)) {
				children.set(nextPart, {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- urlPrefix starts with '/' so the result is a valid slash-prefixed path
					path: `${urlPrefix}/${currentDir}/${nextPart}/` as `/${string}`,
					title: humanizeDirName(nextPart),
					description: null,
				})
			}

			// Leaf entry directly under current dir (normalized), so use its
			// frontmatter data.
			if (parts.length === dirParts.length + 1) {
				const child = children.get(nextPart)

				if (child) {
					child.title = entry.data.title
					child.description = entry.data.description ?? null
				}
			}
		}
	}

	return [...children.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, entry]) => entry)
}

/**
 * Given a slug and collection entries, find the first entry whose ID starts
 * with the given directory slug. Used to derive a description for index pages.
 */
export function findIndexDescription(
	allEntries: IndexableCollectionEntry[],
	currentDir: string,
): string | null {
	if (currentDir === '') {
		return null
	}

	const dirParts = currentDir.split('/')

	for (const entry of allEntries) {
		const parts = entry.id.split('/')
		const prefix = parts.slice(0, dirParts.length).join('/')

		if (prefix === currentDir && parts.length === dirParts.length + 1) {
			return entry.data.description ?? null
		}
	}

	return null
}

/**
 * Configuration needed to render a markdown collection as site pages. Only
 * collections that render a directory index (`dirIndex: true`) can be
 * resolved as a page, so this is the corresponding union branch.
 */
export type MarkdownCollectionConfig = RenderedMarkdownCollection & { dirIndex: true }

/** A resolved content page: renders a single markdown entry. */
export interface ResolvedCollectionContentPage {
	kind: 'content'
	metadata: { title: string; description?: string }
	content: RenderResult['Content']
}

/** A resolved index page: lists the children of a directory. */
export interface ResolvedCollectionIndexPage {
	kind: 'index'
	metadata: { title: string; description: string }
	entries: IndexEntry[]
	currentDir: string
	parentUrl?: string
}

export type ResolvedCollectionPage = ResolvedCollectionContentPage | ResolvedCollectionIndexPage

/**
 * Build the `getStaticPaths` result for a markdown collection: one path per
 * entry (its normalized slug) plus one path per directory index.
 *
 * `entries` must already be loaded via `getCollection` in the calling page.
 */
export function buildCollectionPaths(
	entries: IndexableCollectionEntry[],
): { params: { slug?: string } }[] {
	const paths: { params: { slug?: string } }[] = []

	for (const entry of entries) {
		paths.push({ params: { slug: normalizeSlug(entry.id) } })
	}

	const dirPaths = new Set<string>()

	for (const entry of entries) {
		const parts = entry.id.split('/')

		for (let i = 1; i < parts.length; i++) {
			dirPaths.add(parts.slice(0, i).join('/'))
		}
	}

	dirPaths.add('')

	for (const dir of dirPaths) {
		paths.push({ params: { slug: dir || undefined } })
	}

	return paths
}

/**
 * Resolve a normalized slug back to the original collection entry id, or
 * undefined when the slug has no matching entry (i.e. it is a directory).
 */
export function resolveEntryId(
	entries: IndexableCollectionEntry[],
	slug: string | undefined,
): string | undefined {
	if (!slug) {
		return undefined
	}

	const slugToId = buildSlugToId(entries)

	return slugToId[slug] ?? slug
}

/**
 * Resolve a page to either a content page (a rendered markdown entry) or an
 * index page (the children of a directory).
 */
export async function resolveCollectionPage<_Entry extends CollectionEntry<CollectionKey>>(
	entry: _Entry | undefined,
	entries: _Entry[],
	slug: string | undefined,
	collection: MarkdownCollectionConfig,
): Promise<ResolvedCollectionPage> {
	if (entry) {
		const { Content } = await render(entry)

		return {
			kind: 'content',
			metadata: { title: entry.data.title, description: entry.data.description },
			content: Content,
		}
	}

	const currentDir = slug ?? ''

	return {
		kind: 'index',
		metadata: {
			title: slug ? humanizeDirName(slug.split('/').pop() ?? '') : collection.indexTitle,
			description: collection.indexDescription,
		},
		entries: computeIndexEntries(entries, currentDir, collection.urlPrefix),
		currentDir,
		parentUrl: parentUrl(collection.urlPrefix, slug),
	}
}

/**
 * URL of the parent directory index for a given slug, or undefined when there
 * is no parent (root level).
 */
function parentUrl(urlPrefix: `/${string}`, s: string | undefined): string | undefined {
	if (!s) {
		return undefined
	}

	const parts = s.split('/')

	if (parts.length <= 1) {
		return undefined
	}

	return `${urlPrefix}/${parts.slice(0, -1).join('/')}/`
}
