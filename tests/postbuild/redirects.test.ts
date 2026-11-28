import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { type HastNode, htmlToHast } from 'satteri'
import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from '@/utils/codebase'

const repo = getRepositoryRoot()
const dist = process.env.DIST_DIR ?? join(repo, 'dist')

/**
 * Redirects declared in `astro.config.mjs`, normalized to plain
 * source-pathname → target-pathname pairs. The config is imported the same way
 * the build loads it, so the test verifies what the site actually declares
 * rather than a copy of the map.
 */
const astroConfig = (await import('../../astro.config.mjs')).default
const redirects: Record<string, string> = Object.fromEntries(
	Object.entries(astroConfig.redirects ?? {}).map(([source, value]) => [
		source,
		typeof value === 'string' ? value : value.destination,
	]),
)

type Element = Extract<HastNode, { type: 'element' }>

const elements = (node: HastNode, tag?: string): Element[] => [
	...(node.type === 'element' && (tag === undefined || node.tagName === tag) ? [node] : []),
	...(node.type === 'element' || node.type === 'root'
		? node.children.flatMap(child => elements(child, tag))
		: []),
]

/** Strip any query string and fragment from a URL. */
const stripSuffix = (url: string): string => url.split(/[?#]/, 1)[0]

/** Normalize a site-internal pathname to trailing-slash directory form. */
const normalizePathname = (pathname: string): string =>
	'/' + stripSuffix(pathname).replace(/^\/+/, '').replace(/\/?$/, '/')

/** Dist-relative file path of the document serving a site-internal pathname. */
const documentFile = (pathname: string): string =>
	stripSuffix(pathname).replace(/^\/+/, '').replace(/\/?$/, '/') + 'index.html'

/**
 * Extract the target of a `<meta http-equiv="refresh">` content value — the
 * part after `<delay>;url=` — or null when the value has no `url` directive.
 */
function refreshTarget(content: string): string | null {
	const separator = content.indexOf(';')

	if (separator === -1) {
		return null
	}

	const directive = content.slice(separator + 1).trim()
	const equals = directive.indexOf('=')

	if (equals === -1 || directive.slice(0, equals).trim().toLowerCase() !== 'url') {
		return null
	}

	return directive
		.slice(equals + 1)
		.trim()
		.replace(/^(['"])(.*)\1$/, '$2')
}

/** Hast tree cache, keyed by dist-relative HTML file path. */
const hastCache = new Map<string, HastNode>()

const parseHtml = (distRelativePath: string): HastNode => {
	let tree = hastCache.get(distRelativePath)

	if (tree === undefined) {
		tree = htmlToHast(readFileSync(join(dist, distRelativePath), 'utf8'))
		hastCache.set(distRelativePath, tree)
	}

	return tree
}

/**
 * The redirect target declared by a document's meta refresh tag, or null when
 * the document is not a redirect stub. In a static build the meta refresh tag
 * is the only redirect mechanism, so its presence is what makes a document a
 * redirect stub.
 */
const documentRedirectTarget = (tree: HastNode): string | null => {
	for (const meta of elements(tree, 'meta')) {
		if (String(meta.properties.httpEquiv).toLowerCase() !== 'refresh') {
			continue
		}

		const target = refreshTarget(String(meta.properties.content ?? ''))

		if (target !== null) {
			return target
		}
	}

	return null
}

/** All built HTML files, as dist-relative paths using `/` separators. */
const htmlFiles: string[] = readdirSync(dist, { recursive: true, withFileTypes: true })
	.filter(file => file.isFile() && file.name.endsWith('.html'))
	.map(file => relative(dist, join(file.parentPath, file.name)).split(sep).join('/'))

/**
 * Dist-relative file paths a site-internal pathname may resolve to, most
 * specific first. Page routes are directories with an `index.html`; assets are
 * files at their own path.
 */
function candidateFiles(pathname: string): string[] {
	const path = stripSuffix(pathname).replace(/^\/+/, '')
	const indexFile = path === '' ? 'index.html' : path.replace(/\/?$/, '/') + 'index.html'

	if (/\.[a-z0-9]+$/i.test(path)) {
		return [path]
	}

	return [indexFile, path]
}

type Resolution =
	| { kind: 'found'; file: string }
	| { kind: 'redirect'; file: string; target: string }
	| { kind: 'missing' }

/**
 * Resolve a site-internal pathname against the built output. Redirect stubs
 * are a terminal resolution result here: following them is the caller's
 * decision, so that chains surface as distinct outcomes rather than being
 * flattened away.
 */
function resolvePathname(pathname: string): Resolution {
	for (const file of candidateFiles(pathname)) {
		const absolute = join(dist, file)

		if (!existsSync(absolute) || !statSync(absolute).isFile()) {
			continue
		}

		if (!file.endsWith('.html')) {
			return { kind: 'found', file }
		}

		const target = documentRedirectTarget(parseHtml(file))

		if (target !== null) {
			return { kind: 'redirect', file, target }
		}

		return { kind: 'found', file }
	}

	return { kind: 'missing' }
}

describe('static redirect stubs', () => {
	it('declares at least one redirect in astro.config.mjs', () => {
		// Guards against the config import silently yielding an empty map,
		// which would vacuously pass every other assertion in this file.
		expect(Object.keys(redirects).length).toBeGreaterThan(0)
	})

	it('emits a compile-time redirect stub document for every declared redirect', () => {
		for (const [source, target] of Object.entries(redirects)) {
			const file = documentFile(source)

			expect(existsSync(join(dist, file)), `${source} has no built document`).toBe(true)

			const tree = parseHtml(file)

			// The meta refresh tag is the redirect: a static deployment sends no
			// Location header, so it must forward to the declared target.
			expect(documentRedirectTarget(tree), `${source} meta refresh target`).toBe(target)

			// Redirect stubs are pure compile-time artifacts: no JavaScript and
			// no client hydration may be involved in forwarding the visitor.
			expect(elements(tree, 'script'), `${source} must not contain scripts`).toHaveLength(0)
			expect(elements(tree, 'astro-island'), `${source} must not hydrate`).toHaveLength(0)

			// Search engines are directed at the target instead of the stub.
			const canonical = elements(tree, 'link').filter(
				node => String(node.properties.rel) === 'canonical',
			)

			expect(canonical, `${source} canonical link`).toHaveLength(1)
			expect(
				new URL(String(canonical[0].properties.href)).pathname,
				`${source} canonical target`,
			).toBe(normalizePathname(target))

			const robots = elements(tree, 'meta').filter(
				node =>
					String(node.properties.name) === 'robots' &&
					String(node.properties.content).includes('noindex'),
			)

			expect(robots, `${source} robots noindex`).toHaveLength(1)

			// Agents that do not follow meta refresh still reach the target.
			const fallback = elements(tree, 'a').filter(
				node => String(node.properties.href) === stripSuffix(target),
			)

			expect(fallback.length, `${source} fallback link to ${target}`).toBeGreaterThan(0)
		}
	})

	it('redirects only to real built pages, never to missing pages or other redirects', () => {
		const sources = new Set(Object.keys(redirects).map(normalizePathname))

		for (const [source, target] of Object.entries(redirects)) {
			// The no-404 invariant is only machine-checkable for site-internal
			// targets; an external target would escape it entirely.
			expect(
				target.startsWith('/') && !target.startsWith('//'),
				`${source} target ${target} is not site-internal`,
			).toBe(true)
			expect(normalizePathname(target), `${source} redirects to itself`).not.toBe(
				normalizePathname(source),
			)
			expect(
				sources.has(normalizePathname(target)),
				`${source} chains through ${target}, itself a declared redirect`,
			).toBe(false)

			const resolution = resolvePathname(target)

			expect(resolution.kind, `${source} target ${target} resolves to ${resolution.kind}`).toBe(
				'found',
			)
		}
	})

	it('has no redirect stub documents in the output beyond the declared redirects', () => {
		const declaredStubs = new Set(Object.keys(redirects).map(documentFile))
		const stray: string[] = []

		for (const file of htmlFiles) {
			if (documentRedirectTarget(parseHtml(file)) !== null && !declaredStubs.has(file)) {
				stray.push(file)
			}
		}

		expect(stray, 'redirect stubs without a matching astro.config.mjs entry').toEqual([])
	})
})

describe('internal link termination', () => {
	it('resolves every internal href to a real document directly or through exactly one redirect', () => {
		const failures: string[] = []
		let internalHrefCount = 0
		let redirectHopCount = 0

		for (const file of htmlFiles) {
			const tree = parseHtml(file)
			const route = '/' + file

			for (const node of elements(tree)) {
				const href = node.properties.href

				if (typeof href !== 'string') {
					continue
				}

				if (!href.startsWith('/') || href.startsWith('//')) {
					continue
				}

				const pathname = stripSuffix(href)

				if (pathname === '') {
					continue
				}

				internalHrefCount++
				const resolution = resolvePathname(pathname)

				if (resolution.kind === 'missing') {
					failures.push(`${route} links to ${pathname}, which has no built document`)
					continue
				}

				if (resolution.kind !== 'redirect') {
					continue
				}

				redirectHopCount++
				const hopTarget = stripSuffix(resolution.target)
				const hop = resolvePathname(hopTarget)

				if (hop.kind === 'missing') {
					failures.push(
						`${route} links to ${pathname}, redirecting to ${hopTarget}, which has no built document`,
					)
				} else if (hop.kind === 'redirect') {
					failures.push(
						`${route} links to ${pathname}, redirecting to ${hopTarget}, itself a redirect (redirect chains are not valid in static hosting)`,
					)
				}
			}
		}

		// Guards against a scan that silently degenerated to matching nothing.
		expect(internalHrefCount).toBeGreaterThan(0)
		// Frozen documents intentionally link through redirects; a count of zero
		// means either the scan degenerated or a redirect relied upon by frozen
		// content was dropped — the missing-document failures above are what
		// reports the latter, so this only fires when nothing hops at all.
		expect(redirectHopCount).toBeGreaterThan(0)
		expect(failures).toEqual([])
	})
})
