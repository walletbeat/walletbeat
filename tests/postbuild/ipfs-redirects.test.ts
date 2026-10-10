import * as fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	IPFS_REDIRECTS_FILENAME,
	IPFS_REDIRECTS_MAX_BYTES,
	ipfsRedirectsFileStatuses,
} from '@/utils/astro-ipfs-redirects'
import {
	CodebaseEntryType,
	crawlCodebase,
	escapeRegExp,
	getRepositoryRoot,
	normalizePath,
} from '@/utils/codebase'

const distDir = path.join(getRepositoryRoot(), 'dist')
const redirectsFile = path.join(distDir, IPFS_REDIRECTS_FILENAME)

interface ParsedRule {
	line: string
	from: string
	to: string
	status: number
}

function readRules(): ParsedRule[] {
	if (!fs.existsSync(redirectsFile)) {
		return []
	}

	return fs
		.readFileSync(redirectsFile, 'utf8')
		.split(/\r?\n/u)
		.map(line => line.trim())
		.filter(line => line !== '' && !line.startsWith('#'))
		.map(line => {
			const [from = '', to = '', status = '301'] = line.split(/\s+/u)

			return { line, from, to, status: Number(status) }
		})
}

/** Regex matching the request paths that a rule's `from` pattern applies to. */
function fromPatternRegex(from: string): RegExp {
	const body = from
		.split('/')
		.map(segment => {
			if (segment === '*') {
				return '.*'
			}

			return segment.startsWith(':') ? '[^/]+' : escapeRegExp(segment)
		})
		.join('/')

	return new RegExp(`^${body}$`, 'u')
}

/** Site paths of every file and directory in the build output, e.g. `/foo/bar`. */
async function distPaths(): Promise<string[]> {
	const paths: string[] = []

	await crawlCodebase({
		root: distDir,
		ignore: [],
		baseTraversalFn: entry => {
			if (entry.type === CodebaseEntryType.FILE || entry.type === CodebaseEntryType.DIRECTORY) {
				paths.push(`/${normalizePath(entry.path)}`)
			}
		},
	})

	return paths
}

describe('IPFS _redirects', () => {
	it('fits within the size limit gateways parse', () => {
		if (!fs.existsSync(redirectsFile)) {
			return
		}

		expect(fs.statSync(redirectsFile).size).toBeLessThanOrEqual(IPFS_REDIRECTS_MAX_BYTES)
	})

	it('every rule follows the gateway spec syntax', () => {
		const violations = readRules().flatMap(rule => {
			const problems: string[] = []
			const fromPlaceholders = new Set(
				rule.from
					.split('/')
					.filter(segment => segment.startsWith(':'))
					.map(segment => segment.slice(1)),
			)

			if (rule.from.endsWith('/*')) {
				fromPlaceholders.add('splat')
			}

			if (!rule.from.startsWith('/')) {
				problems.push('source must start with "/"')
			}

			if (
				rule.from.includes('*') &&
				(!rule.from.endsWith('/*') || rule.from.indexOf('*') !== rule.from.length - 1)
			) {
				problems.push('source may only use "*" as its last segment')
			}

			if (!rule.to.startsWith('/') && !rule.to.startsWith('https://')) {
				problems.push('destination must be a site path or an https URL')
			}

			if (!ipfsRedirectsFileStatuses.has(rule.status)) {
				problems.push(`status ${rule.status} is not allowed`)
			}

			for (const placeholder of rule.to.matchAll(/:([A-Za-z0-9_]+)/gu)) {
				if (!fromPlaceholders.has(placeholder[1])) {
					problems.push(`destination uses :${placeholder[1]}, which the source does not define`)
				}
			}

			return problems.map(problem => `${rule.line}: ${problem}`)
		})

		expect(violations).toEqual([])
	})

	it('every rule source is absent from the build output, so gateways apply it', async () => {
		const paths = await distPaths()
		const violations = readRules().flatMap(rule => {
			const regex = fromPatternRegex(rule.from)

			return paths
				.filter(sitePath => regex.test(sitePath))
				.map(sitePath => `${rule.line}: ${sitePath} exists in dist/`)
		})

		expect(violations).toEqual([])
	})

	it('every rule destination points into an existing part of the site', () => {
		const violations = readRules()
			.filter(rule => rule.to.startsWith('/'))
			.filter(rule => {
				const staticPrefix = rule.to.split(':')[0]

				return !fs.existsSync(path.join(distDir, ...staticPrefix.split('/')))
			})
			.map(rule => `${rule.line}: destination ${rule.to} does not exist in dist/`)

		expect(violations).toEqual([])
	})
})
