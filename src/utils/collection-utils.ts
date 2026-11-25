import { type CollectionEntry, getCollection } from 'astro:content'

import {
	MARKDOWN_ASTRO_COLLECTIONS,
	type MarkdownAstroCollection,
	markdownPageSlug,
} from '@/constants/rendered-collections'
import type { WBIconID } from '@/styles/wbicons'
import { nonEmptyKeys } from '@/types/utils/non-empty'

export type MarkdownAstroCollectionName = keyof typeof MARKDOWN_ASTRO_COLLECTIONS

export type CollectionPage = {
	collection: MarkdownAstroCollectionName
	slug: string
	href: string
	source:
		| { kind: 'markdown'; entry: CollectionEntry<MarkdownAstroCollectionName> }
		| { kind: 'directory' }
		| { kind: 'static' }
	metadata: { title: string; description?: string }
	listTitle: string
	/**
	 * Present only when the page is part of the site navigation: pages opt in
	 * by declaring `shortTitle` in their frontmatter (or their static
	 * page presentation), and the title is used for the navigation entry.
	 */
	shortTitle?: string
	icon?: WBIconID
	children: CollectionPage[]
}

const buildCollectionPages = (
	entries: CollectionEntry<MarkdownAstroCollectionName>[],
	collection: MarkdownAstroCollectionName,
): CollectionPage => {
	const definition: MarkdownAstroCollection = MARKDOWN_ASTRO_COLLECTIONS[collection]
	const entriesBySlug = new Map(entries.map(entry => [markdownPageSlug(entry.id), entry]))

	if (entriesBySlug.size !== entries.length) {
		throw new Error(`Multiple Markdown entries publish at the same URL in /${collection}`)
	}

	for (const slug of Object.keys(definition.staticPages ?? {})) {
		if (entriesBySlug.has(slug)) {
			throw new Error(`Static page /${collection}/${slug}/ also has a Markdown source`)
		}
	}

	const slugs = new Set(
		[...entriesBySlug.keys(), ...Object.keys(definition.staticPages ?? {})].flatMap(slug =>
			slug.split('/').map((_, index, parts) => parts.slice(0, index + 1).join('/')),
		),
	)

	const childrenByParent = Map.groupBy([...slugs], slug =>
		slug.slice(0, Math.max(0, slug.lastIndexOf('/'))),
	)

	const childrenOf = (parent: string): CollectionPage[] => {
		const orderOf = (slug: string) =>
			entriesBySlug.get(slug)?.data.order ?? definition.staticPages?.[slug]?.order ?? Infinity

		return (childrenByParent.get(parent) ?? [])
			.sort((a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b))
			.map(slug => {
				const entry = entriesBySlug.get(slug) ?? null
				const staticPage = definition.staticPages?.[slug]
				const segment = slug.slice(slug.lastIndexOf('/') + 1)
				const title =
					entry?.data.title ?? segment.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

				return {
					collection,
					slug,
					href: `/${collection}/${slug}/`,
					source: entry
						? { kind: 'markdown', entry }
						: { kind: staticPage ? 'static' : 'directory' },
					metadata: { title, description: entry?.data.description },
					listTitle: entry?.data.listTitle ?? staticPage?.listTitle ?? title,
					shortTitle: entry?.data.shortTitle ?? staticPage?.shortTitle,
					icon: entry?.data.icon ?? staticPage?.icon,
					children: childrenOf(slug),
				}
			})
	}

	return {
		collection,
		slug: '',
		href: `/${collection}/`,
		source: { kind: 'directory' },
		metadata: { title: definition.indexTitle, description: definition.indexDescription },
		listTitle: definition.indexTitle,
		shortTitle: definition.shortTitle ?? definition.indexTitle,
		icon: definition.icon,
		children: childrenOf(''),
	}
}

export const collectionPages = await Promise.all(
	nonEmptyKeys(MARKDOWN_ASTRO_COLLECTIONS).map(async name =>
		buildCollectionPages(await getCollection(name), name),
	),
)

export const flattenCollectionPages = (page: CollectionPage): CollectionPage[] => [
	page,
	...page.children.flatMap(flattenCollectionPages),
]
