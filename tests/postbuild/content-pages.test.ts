import { readdirSync, readFileSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'

import { type HastNode, htmlToHast } from 'satteri'
import { describe, expect, it } from 'vitest'

import {
	MARKDOWN_ASTRO_COLLECTIONS,
	type MarkdownAstroCollection,
	NON_SERVED_EXTENSIONS,
} from '@/constants/rendered-collections'
import { assertStringHasPrefix } from '@/types/utils/text'
import { getRepositoryRoot } from '@/utils/codebase'
import { parseMarkdownWithFrontmatter } from '@/utils/markdown-utils'
import { rewriteUrl } from '@/utils/satteri-url-rewrite-plugin'

const repo = getRepositoryRoot()
const dist = process.env.DIST_DIR ?? join(repo, 'dist')
const COLLECTIONS = Object.entries<MarkdownAstroCollection>(MARKDOWN_ASTRO_COLLECTIONS)
const COLLECTION_ROOTS = COLLECTIONS.map(([name]) => `/${name}/`)

type PagePresentation = {
	listTitle?: string
	shortTitle?: string
	order?: number
}

const stripQuotes = (value: string | undefined): string | undefined =>
	value?.replace(/^(['"])(.*)\1$/, '$2')

const pagePresentation = new Map<string, PagePresentation>()

const OLD_ROUTES = {
	'/faq/': '/about/faq/',
	'/docs/impact/': '/about/impact/',
	'/docs/social-proof/': '/about/social-proof/',
} as const satisfies Record<`/${string}/`, `/${string}/`>

type Element = Extract<HastNode, { type: 'element' }>

const elements = (node: HastNode, tag?: string): Element[] => [
	...(node.type === 'element' && (tag === undefined || node.tagName === tag) ? [node] : []),
	...(node.type === 'element' || node.type === 'root'
		? node.children.flatMap(child => elements(child, tag))
		: []),
]

const directElements = (node: Element, tag: string) =>
	node.children.filter(
		(child): child is Element => child.type === 'element' && child.tagName === tag,
	)

const one = (nodes: Element[], context: string) => {
	expect(nodes, context).toHaveLength(1)

	return nodes[0]
}

const text = (node: HastNode): string =>
	node.type === 'text'
		? node.value
		: node.type === 'element' || node.type === 'root'
			? node.children.map(text).join('')
			: ''

const pageTitle = (main: Element, route: string) =>
	text(one(elements(one(directElements(main, 'header'), route), 'h1'), route)).trim()

const page = (route: string) => htmlToHast(readFileSync(join(dist, route, 'index.html'), 'utf8'))

const linkDestinations = (node: HastNode) =>
	elements(node, 'a').flatMap(link =>
		typeof link.properties.href === 'string' ? [link.properties.href] : [],
	)

const authored = COLLECTIONS.flatMap(([name, { repoDir }]) => {
	const sourceRoot = join(repo, repoDir)

	return readdirSync(sourceRoot, { recursive: true, withFileTypes: true })
		.filter(file => file.isFile() && file.name.endsWith('.md'))
		.map(file => {
			const source = join(file.parentPath, file.name)
			const path = relative(sourceRoot, source).split(sep).join('/')
			const directory = posix.dirname(path)
			// Nested documents own their directory URL; files in the collection root own their basename.
			const route = `/${name}/${directory === '.' ? posix.basename(path, '.md') : directory}/`
			const { frontmatter } = parseMarkdownWithFrontmatter<{ title: string }>(
				readFileSync(source, 'utf8'),
				{ title: true },
			)
			const presentation: {
				title: string
				listTitle?: string
				shortTitle?: string
				order?: string
			} = frontmatter
			const order = presentation.order === undefined ? undefined : Number(presentation.order)

			pagePresentation.set(route, {
				listTitle: stripQuotes(presentation.listTitle),
				shortTitle: stripQuotes(presentation.shortTitle),
				...(order !== undefined && !Number.isNaN(order) ? { order } : {}),
			})

			return {
				source: '/' + relative(repo, source).split(sep).join('/'),
				route,
				title: stripQuotes(frontmatter.title) ?? frontmatter.title,
			}
		})
})

for (const [name, collection] of COLLECTIONS) {
	for (const [slug, staticPage] of Object.entries(collection.staticPages ?? {})) {
		pagePresentation.set(`/${name}/${slug}/`, staticPage)
	}
}

const leafRoutes = new Set([
	...authored.map(entry => entry.route),
	...COLLECTIONS.flatMap(([name, collection]) =>
		Object.keys(collection.staticPages ?? {}).map(slug => `/${name}/${slug}/`),
	),
])
const collectionRoutes = new Set([
	...COLLECTION_ROOTS,
	...Array.from(leafRoutes).flatMap(route =>
		route
			.split('/')
			.filter(Boolean)
			.map((_, index, segments) => '/' + segments.slice(0, index + 1).join('/') + '/'),
	),
])

describe('rendered content collections', () => {
	it('renders each authored Markdown document once at its public URL', () => {
		expect(COLLECTION_ROOTS).toEqual(expect.arrayContaining(['/about/', '/docs/', '/governance/']))
		expect(authored.length).toBeGreaterThan(0)
		expect(new Set(authored.map(entry => entry.route)).size).toBe(authored.length)

		expect(
			COLLECTION_ROOTS.flatMap(prefix =>
				readdirSync(join(dist, prefix), { recursive: true, withFileTypes: true })
					.filter(file => file.isFile() && file.name === 'index.html')
					.map(file => '/' + relative(dist, file.parentPath).split(sep).join('/') + '/'),
			).sort(),
		).toEqual(
			[
				...collectionRoutes,
				...Object.keys(OLD_ROUTES).filter(route =>
					COLLECTION_ROOTS.some(prefix => route.startsWith(prefix)),
				),
			].sort(),
		)

		for (const { source, route, title } of authored) {
			expect(rewriteUrl(source, '/'), source).toEqual({ url: route, matched: true })
			const main = one(elements(page(route), 'main'), route)

			expect(pageTitle(main, route), route).toBe(title)
			expect(text(one(elements(main, 'article'), route)).trim(), route).not.toBe('')
		}
	})

	it('serves each collection asset at its source-relative URL', () => {
		for (const [name, { repoDir }] of COLLECTIONS) {
			const sourceRoot = join(repo, repoDir)

			for (const file of readdirSync(sourceRoot, { recursive: true, withFileTypes: true }).filter(
				file => file.isFile(),
			)) {
				const extension = posix.extname(file.name).toLowerCase()

				if (
					!extension ||
					extension === '.md' ||
					NON_SERVED_EXTENSIONS.has(assertStringHasPrefix(extension, '.'))
				) {
					continue
				}

				const source = join(file.parentPath, file.name)
				const destination = join(dist, name, relative(sourceRoot, source))

				expect(readFileSync(destination).equals(readFileSync(source)), destination).toBe(true)
			}
		}
	})

	it('lists all immediate child pages in directory indexes', () => {
		for (const route of collectionRoutes) {
			if (leafRoutes.has(route)) {
				continue
			}

			const links = elements(
				one(elements(one(elements(page(route), 'main'), route), 'ul'), route),
				'li',
			).map(card => one(elements(card, 'a'), route))

			expect(
				links.map(link => String(link.properties.href)),
				route,
			).toEqual(
				Array.from(collectionRoutes)
					.filter(child => child !== route && posix.dirname(child.slice(0, -1)) + '/' === route)
					.sort(
						(a, b) =>
							(pagePresentation.get(a)?.order ?? Infinity) -
								(pagePresentation.get(b)?.order ?? Infinity) || a.localeCompare(b),
					),
			)

			for (const link of links) {
				const child = String(link.properties.href)

				expect(text(one(elements(link, 'h2'), child)).trim(), child).toBe(
					pagePresentation.get(child)?.listTitle ??
						pageTitle(one(elements(page(child), 'main'), child), child),
				)
			}
		}
	})

	it('exposes exactly the opted-in collection routes in the site navigation', () => {
		const nav = one(
			elements(page('/'), 'nav').filter(node => node.properties.id === 'nav'),
			'Site navigation',
		)
		const navigationRoutes = new Set([
			...COLLECTION_ROOTS,
			...Array.from(pagePresentation)
				.filter(([, presentation]) => presentation.shortTitle !== undefined)
				.map(([route]) => route),
		])
		const navLinks = linkDestinations(nav).filter(href =>
			COLLECTION_ROOTS.some(prefix => href.startsWith(prefix)),
		)

		expect(navLinks.sort()).toEqual(Array.from(navigationRoutes).sort())

		for (const route of navigationRoutes) {
			const entry = one(
				elements(nav, 'a').filter(link => link.properties.href === route),
				route,
			)
			const root = COLLECTIONS.find(([name]) => route === `/${name}/`)
			const expectedTitle =
				root !== undefined
					? (root[1].shortTitle ?? root[1].indexTitle)
					: pagePresentation.get(route)?.shortTitle

			if (expectedTitle === undefined) {
				throw new Error(`No expected navigation title for ${route}`)
			}

			expect(text(entry).trim(), route).toBe(expectedTitle)
		}
	})

	const disclosuresAt = (route: string) => {
		const disclosures = elements(one(elements(page(route), 'main'), route), 'details')

		expect(disclosures.length, route).toBeGreaterThan(0)

		return disclosures
	}

	it.each(['/about/faq/', '/news/', '/wallet-eips/'])(
		'uses native disclosure headings on %s',
		route => {
			for (const disclosure of disclosuresAt(route)) {
				expect(
					text(
						one(elements(one(directElements(disclosure, 'summary'), route), 'h2'), route),
					).trim(),
					route,
				).not.toBe('')

				for (const section of elements(disclosure, 'section')) {
					expect(directElements(section, 'h3'), route).toHaveLength(1)
				}
			}
		},
	)

	it('renders FAQ answers without client hydration', () => {
		for (const disclosure of disclosuresAt('/about/faq/')) {
			const answer = one(directElements(disclosure, 'div'), 'FAQ answer')

			expect(text(answer).trim()).not.toBe('')
			expect(elements(answer, 'astro-island')).toHaveLength(0)
		}
	})

	it.each([
		{ route: '/news/', required: ['Impact'] },
		{
			route: '/wallet-eips/',
			required: ['Summary', 'Why it matters for wallets', 'Implemented by'],
		},
	])('uses section headings on $route', ({ route, required }) => {
		for (const disclosure of disclosuresAt(route)) {
			for (const title of required) {
				expect(
					elements(disclosure, 'h3').filter(node => text(node).trim() === title),
					route,
				).toHaveLength(1)
			}
		}
	})

	it('uses a Sources heading for every incident with sources', () => {
		for (const disclosure of disclosuresAt('/news/')) {
			for (const footer of elements(disclosure, 'footer')) {
				expect(text(one(elements(footer, 'h3'), 'Incident sources')).trim()).toBe('Sources')
			}
		}
	})

	it('serializes exactly the links rendered in the navigation island', () => {
		const island = one(
			elements(page('/'), 'astro-island').filter(node =>
				String(node.properties['component-url']).includes('/NavigationItems.'),
			),
			'Site navigation',
		)
		const serialized: string[] = []

		JSON.parse(String(island.properties.props), (key: string, value: unknown) => {
			if (key === 'href' && Array.isArray(value)) {
				const tuple: unknown[] = value

				if (tuple[0] === 0 && typeof tuple[1] === 'string') {
					serialized.push(tuple[1])
				}
			}

			return value
		})
		expect(linkDestinations(island).length).toBeGreaterThan(0)
		expect(serialized.sort()).toEqual(linkDestinations(island).sort())
	})
})

describe('content migrations', () => {
	it('redirects old routes and excludes them from the sitemap', () => {
		const urls = readdirSync(dist)
			.filter(name => /^sitemap-\d+\.xml$/.test(name))
			.flatMap(name =>
				Array.from(
					readFileSync(join(dist, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g),
					match => new URL(match[1]).pathname,
				),
			)

		for (const route of collectionRoutes) {
			expect(urls, route).toContain(route)
		}

		for (const [source, target] of Object.entries(OLD_ROUTES)) {
			const redirect = page(source)

			expect(
				new URL(
					String(
						one(
							elements(redirect, 'link').filter(
								node => String(node.properties.rel) === 'canonical',
							),
							source,
						).properties.href,
					),
				).pathname,
				source,
			).toBe(target)
			expect(linkDestinations(redirect), source).toContain(target)
			expect(
				one(
					elements(redirect, 'meta').filter(
						node => String(node.properties.httpEquiv) === 'refresh',
					),
					source,
				).properties.content,
			).toBe('0;url=' + target)
			expect(urls, source).not.toContain(source)
			expect(urls, target).toContain(target)
			expect(elements(page(target), 'main'), target).toHaveLength(1)
		}
	})
})
