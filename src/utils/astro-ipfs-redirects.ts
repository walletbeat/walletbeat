import { existsSync } from 'node:fs'
import { readdir, rm, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
	AstroIntegration,
	IntegrationResolvedRoute,
	RedirectConfig,
	RoutePart,
	ValidRedirectStatus,
} from 'astro'

/**
 * Name of the redirect rules file that IPFS subdomain and DNSLink gateways
 * (including eth.limo) read from the site root.
 * Spec: https://specs.ipfs.tech/http-gateways/web-redirects-file/
 */
export const IPFS_REDIRECTS_FILENAME = '_redirects'

/** Redirect status codes that both Astro and the IPFS `_redirects` spec accept. */
export type IpfsRedirectStatus = Extract<ValidRedirectStatus, 301 | 302 | 303 | 307 | 308>

/** Status codes the IPFS `_redirects` spec allows on a rule. */
export const ipfsRedirectsFileStatuses: ReadonlySet<number> = new Set([
	200, 301, 302, 303, 307, 308, 404, 410, 451,
])

/** Maximum size of a `_redirects` file that gateways will parse. */
export const IPFS_REDIRECTS_MAX_BYTES = 64 * 1024

/** One line of an IPFS `_redirects` file. */
export interface IpfsRedirectRule {
	from: string
	to: string
	status: IpfsRedirectStatus
}

function isIpfsRedirectStatus(status: ValidRedirectStatus): status is IpfsRedirectStatus {
	return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

/** Converts one Astro route segment to its `_redirects` equivalent. */
function segmentToRedirectsPath(
	segment: RoutePart[],
	isLastSegment: boolean,
	routePattern: string,
): string {
	if (segment.length !== 1) {
		throw new Error(
			`Redirect source ${routePattern}: IPFS _redirects placeholders must span a whole path segment.`,
		)
	}

	const [part] = segment

	if (!part.dynamic) {
		return part.content
	}

	if (part.spread) {
		if (!isLastSegment) {
			throw new Error(
				`Redirect source ${routePattern}: IPFS _redirects only supports a rest parameter as the last path segment.`,
			)
		}

		return '*'
	}

	return `:${part.content}`
}

/**
 * Converts an Astro redirect destination (`/foo/[id]`, `/foo/[...rest]`) to
 * `_redirects` syntax. Page destinations get a trailing slash because pages
 * are built as `<path>/index.html`, which gateways serve at `<path>/`.
 */
function destinationToRedirectsPath(destination: string): string {
	const converted = destination
		.replaceAll(/\[\.\.\.[^\]]+\]/gu, ':splat')
		.replaceAll(/\[([^\]]+)\]/gu, ':$1')
	const lastSegment = converted.split('/').at(-1) ?? ''

	if (!converted.startsWith('/') || converted.endsWith('/') || lastSegment.includes('.')) {
		return converted
	}

	return `${converted}/`
}

function redirectDestination(redirect: RedirectConfig): string {
	return typeof redirect === 'string' ? redirect : redirect.destination
}

function redirectStatus(redirect: RedirectConfig, routePattern: string): IpfsRedirectStatus {
	if (typeof redirect === 'string') {
		return 301
	}

	if (!isIpfsRedirectStatus(redirect.status)) {
		throw new Error(
			`Redirect source ${routePattern}: status ${redirect.status} is not supported by IPFS _redirects.`,
		)
	}

	return redirect.status
}

/** Builds the `_redirects` rule for one Astro redirect route. */
function astroRedirectToIpfsRule(route: IntegrationResolvedRoute): IpfsRedirectRule {
	if (route.redirect === undefined) {
		throw new Error(`Route ${route.pattern} is not a redirect.`)
	}

	const segments = route.segments.map((segment, index) =>
		segmentToRedirectsPath(segment, index === route.segments.length - 1, route.pattern),
	)

	return {
		from: `/${segments.join('/')}`,
		to: destinationToRedirectsPath(redirectDestination(route.redirect)),
		status: redirectStatus(route.redirect, route.pattern),
	}
}

function formatIpfsRedirectsFile(rules: IpfsRedirectRule[]): string {
	return rules.map(rule => `${rule.from} ${rule.to} ${rule.status}\n`).join('')
}

/** Removes `dir` and its ancestors up to (excluding) `root` while they are empty. */
async function removeEmptyDirectories(dir: string, root: string): Promise<void> {
	let current = dir

	while (current.startsWith(root) && current !== root) {
		if ((await readdir(current)).length > 0) {
			return
		}

		await rmdir(current)
		current = path.dirname(current)
	}
}

/**
 * Serves the site's Astro `redirects` as HTTP redirects on IPFS gateways.
 *
 * Writes the redirects to `_redirects` and removes the meta-refresh pages
 * that Astro generates for them, because gateways only apply `_redirects`
 * rules to paths that do not exist in the site's content.
 */
export function ipfsRedirects(): AstroIntegration {
	let redirectRoutes: IntegrationResolvedRoute[] = []

	return {
		name: 'walletbeat:ipfs-redirects',
		hooks: {
			'astro:routes:resolved': ({ routes }) => {
				redirectRoutes = routes.filter(route => route.type === 'redirect')
			},
			'astro:build:done': async ({ dir, assets, logger }) => {
				if (redirectRoutes.length === 0) {
					return
				}

				const distDir = path.resolve(fileURLToPath(dir))
				const redirectsFile = path.join(distDir, IPFS_REDIRECTS_FILENAME)

				if (existsSync(redirectsFile)) {
					throw new Error(
						`${IPFS_REDIRECTS_FILENAME} already exists in the build output; add redirects to the Astro config instead.`,
					)
				}

				const rules = redirectRoutes.map(astroRedirectToIpfsRule)

				for (const route of redirectRoutes) {
					for (const url of assets.get(route.pattern) ?? []) {
						const file = fileURLToPath(url)

						await rm(file, { force: true })
						await removeEmptyDirectories(path.dirname(file), distDir)
					}
				}

				await writeFile(redirectsFile, formatIpfsRedirectsFile(rules))
				logger.info(`Wrote ${rules.length} rules to ${IPFS_REDIRECTS_FILENAME}.`)
			},
		},
	}
}
