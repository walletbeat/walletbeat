import type { CollectionEntry } from 'astro:content'

/** Union of all content collection entry types used for docs and governance pages */
type ContentCollectionEntry = CollectionEntry<'docs'> | CollectionEntry<'governance'>

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
export function buildSlugToId(entries: ContentCollectionEntry[]): Record<string, string> {
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
	allEntries: ContentCollectionEntry[],
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
	allEntries: ContentCollectionEntry[],
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
