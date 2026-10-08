import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { cac } from 'cac'

import { base32Decode } from '@/tools/ens-content-hash-checker/ens-content-hash-checker-lib'
import { getErrorMessage } from '@/types/errors'
import { isRecord } from '@/types/utils/record'

/**
 * CLI for checking whether a freshly pinned IPFS CID is retrievable, either
 * directly from the providers announcing it or through a public gateway.
 */

/** Public gateways that serve the site's `index.html` for a CID. */
const GATEWAYS: Array<{ name: string; url: (cid: string) => string }> = [
	{ name: 'filebase', url: cid => `https://ipfs.filebase.io/ipfs/${cid}/` },
]

/** Delegated routing services that list the providers announcing a CID. */
const ROUTERS: Array<{ name: string; url: (cid: string) => string }> = [
	{ name: 'cid.contact', url: cid => `https://cid.contact/routing/v1/providers/${cid}` },
	{
		name: 'delegated-ipfs.dev',
		url: cid => `https://delegated-ipfs.dev/routing/v1/providers/${cid}`,
	},
]

const TIME_BUDGET_MS = 600_000
const MIN_BACKOFF_SECONDS = 10
const MAX_BACKOFF_SECONDS = 60
const MAX_RETRY_AFTER_SECONDS = 600
const MAX_PROVIDER_ADDRESSES = 5
const PROVIDER_TIMEOUT_MS = 30_000
// Filebase gives up on provider discovery after about 55 seconds; wait longer
// so freshly pinned content can be found and its error is logged.
const GATEWAY_TIMEOUT_MS = 60_000

/** Outcome of a single HTTP request. */
interface FetchResult {
	/** HTTP status of the final response, or `null` if no response was received. */
	status: number | null
	/** Body of a successful response, or `null` on failure. */
	body: Uint8Array | null
	/** Why the request failed before or while reading the response, if it did. */
	error: string | null
	/** Delay requested by the final response's `Retry-After` header. */
	retryAfterSeconds: number
}

/** Outcome of one check of an endpoint. */
interface CheckResult extends Omit<FetchResult, 'body'> {
	verified: boolean
}

/** An endpoint polled with its own exponential backoff. */
interface Endpoint {
	name: string
	url: string
	check: () => Promise<CheckResult>
}

function log(message: string): void {
	const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)

	process.stderr.write(`[${timestamp}] ${message}\n`)
}

function sha256Hex(data: Uint8Array): string {
	return createHash('sha256').update(data).digest('hex')
}

/**
 * Extract the sha2-256 digest of the CID's root block. The CID is the
 * multibase prefix `b` plus base32 of `<version><codec><hash>`; only
 * CIDv1 with a single-byte codec and a sha2-256 hash is supported, which is
 * what omnipin produces.
 */
function parseRootDigest(cid: string): string {
	if (!/^b[a-z2-7]+$/u.test(cid)) {
		throw new Error(`CID '${cid}' is not a base32-lowercase multibase string.`)
	}

	const bytes = base32Decode(cid.slice(1))

	if (
		bytes.length !== 36 ||
		bytes[0] !== 0x01 ||
		bytes[1] >= 0x80 ||
		bytes[2] !== 0x12 ||
		bytes[3] !== 0x20
	) {
		throw new Error(
			`CID '${cid}' is not a CIDv1 with a sha2-256 hash; cannot verify provider blocks.`,
		)
	}

	return Buffer.from(bytes.subarray(4)).toString('hex')
}

/** `Retry-After` can be a number of seconds or an HTTP date. */
function parseRetryAfter(value: string | null): number {
	const trimmed = value?.trim() ?? ''

	if (trimmed === '') {
		return 0
	}

	if (/^\d+$/u.test(trimmed)) {
		return Math.min(Number(trimmed), MAX_RETRY_AFTER_SECONDS)
	}

	const retryAt = Date.parse(trimmed)

	if (Number.isNaN(retryAt)) {
		log(`Ignoring invalid Retry-After header: '${trimmed}'.`)

		return 0
	}

	return Math.min(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)), MAX_RETRY_AFTER_SECONDS)
}

function describeResult({ status, error }: Omit<FetchResult, 'body'>): string {
	const httpStatus = `HTTP ${status ?? 'none'}`

	return error === null ? httpStatus : `${httpStatus}, ${error}`
}

/**
 * Fetch `url`, bounded by both `timeoutMs` and the overall deadline. Error
 * responses and partial transfers never yield a body, so they cannot reach a
 * content hash.
 */
async function fetchEndpoint(
	url: string,
	timeoutMs: number,
	deadline: number,
): Promise<FetchResult> {
	const remainingMs = deadline - performance.now()

	if (remainingMs <= 0) {
		return { status: null, body: null, error: 'time budget exhausted', retryAfterSeconds: 0 }
	}

	let response: Response

	try {
		response = await fetch(url, {
			signal: AbortSignal.timeout(Math.ceil(Math.min(timeoutMs, remainingMs))),
		})
	} catch (error) {
		return { status: null, body: null, error: getErrorMessage(error), retryAfterSeconds: 0 }
	}

	const { status } = response
	const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'))

	try {
		if (!response.ok) {
			await response.body?.cancel()

			return { status, body: null, error: null, retryAfterSeconds }
		}

		return {
			status,
			body: new Uint8Array(await response.arrayBuffer()),
			error: null,
			retryAfterSeconds,
		}
	} catch (error) {
		return { status, body: null, error: getErrorMessage(error), retryAfterSeconds }
	}
}

/**
 * Convert an HTTPS provider address such as `/dns/example.com/tcp/443/https` or
 * `/dns4/example.com/tcp/443/tls/sni/example.com/http` into a base URL.
 */
function providerAddressToUrl(address: string): string | null {
	const match =
		/^\/(?:dns|dns4|dns6|ip4)\/([A-Za-z0-9.-]+)\/tcp\/(\d{1,5})\/(?:https|tls\/http|tls\/sni\/[A-Za-z0-9.-]+\/http)$/u.exec(
			address,
		)

	return match === null ? null : `https://${match[1]}:${match[2]}`
}

/** Addresses of providers that serve the CID over the trustless HTTP gateway protocol. */
function httpProviderAddresses(payload: unknown): string[] {
	if (!isRecord(payload) || !Array.isArray(payload.Providers)) {
		return []
	}

	const addresses: string[] = []

	for (const provider of payload.Providers) {
		if (
			!isRecord(provider) ||
			!Array.isArray(provider.Protocols) ||
			!provider.Protocols.includes('transport-ipfs-gateway-http') ||
			!Array.isArray(provider.Addrs)
		) {
			continue
		}

		for (const address of provider.Addrs) {
			if (typeof address === 'string') {
				addresses.push(address)
			}
		}
	}

	return addresses.slice(0, MAX_PROVIDER_ADDRESSES)
}

/**
 * Bypass public gateways by fetching the root block from providers listed by
 * a delegated router. The block is checked against the CID's digest, so an untrusted
 * provider cannot fake availability.
 */
async function checkProviders(
	routerName: string,
	lookupUrl: string,
	cid: string,
	rootDigest: string,
	deadline: number,
): Promise<CheckResult> {
	const lookup = await fetchEndpoint(lookupUrl, PROVIDER_TIMEOUT_MS, deadline)
	// Report and back off according to the router, not the last provider tried.
	const failure: CheckResult = {
		status: lookup.status,
		error: lookup.error,
		retryAfterSeconds: lookup.retryAfterSeconds,
		verified: false,
	}

	if (lookup.body === null) {
		log(`Failed to look up providers for CID '${cid}' on ${routerName}.`)

		return failure
	}

	let payload: unknown

	try {
		payload = JSON.parse(Buffer.from(lookup.body).toString('utf8'))
	} catch (error) {
		log(`Invalid provider lookup response from ${routerName}: ${getErrorMessage(error)}`)

		return failure
	}

	const providerUrls = httpProviderAddresses(payload)
		.map(providerAddressToUrl)
		.filter(url => url !== null)

	if (providerUrls.length === 0) {
		log(`No HTTP providers found for CID '${cid}' on ${routerName}.`)

		return failure
	}

	for (const providerUrl of providerUrls) {
		const block = await fetchEndpoint(
			`${providerUrl}/ipfs/${cid}?format=raw`,
			PROVIDER_TIMEOUT_MS,
			deadline,
		)

		if (block.body === null) {
			log(`Failed to fetch root block from provider '${providerUrl}' (${describeResult(block)}).`)
			continue
		}

		const actualDigest = sha256Hex(block.body)

		if (actualDigest === rootDigest) {
			log(`Root block of CID '${cid}' verified on provider '${providerUrl}'.`)

			return { ...failure, verified: true }
		}

		log(
			`Root block digest mismatch on provider '${providerUrl}' (expected '${rootDigest}', got '${actualDigest}').`,
		)
	}

	return failure
}

async function checkGateway(
	url: string,
	expectedSha: string,
	deadline: number,
): Promise<CheckResult> {
	const { body, ...result } = await fetchEndpoint(url, GATEWAY_TIMEOUT_MS, deadline)

	if (body === null) {
		log(`Failed to fetch content from '${url}'.`)

		return { ...result, verified: false }
	}

	const actualSha = sha256Hex(body)

	if (actualSha !== expectedSha) {
		log(`Content hash mismatch for '${url}' (expected '${expectedSha}', got '${actualSha}').`)

		return { ...result, verified: false }
	}

	log(`Content verified on '${url}'.`)

	return { ...result, verified: true }
}

/**
 * Retry `endpoint` with exponential backoff until it verifies the CID. Rejects
 * once the next retry would land past the deadline.
 */
async function poll(endpoint: Endpoint, cid: string, deadline: number): Promise<void> {
	let backoffSeconds = MIN_BACKOFF_SECONDS

	for (let attempt = 1; ; attempt++) {
		log(`Checking '${endpoint.name}' for CID '${cid}' (attempt ${attempt}) at '${endpoint.url}'...`)

		const result = await endpoint.check()

		if (result.verified) {
			return
		}

		const retryDelay = Math.max(backoffSeconds, result.retryAfterSeconds)

		backoffSeconds = Math.min(backoffSeconds * 2, MAX_BACKOFF_SECONDS)

		if (performance.now() + retryDelay * 1000 >= deadline) {
			throw new Error(
				`${endpoint.name}: ${describeResult(result)}; retry delay ${retryDelay}s exceeds the remaining budget. Gave up after ${attempt} attempt(s).`,
			)
		}

		log(`${endpoint.name}: ${describeResult(result)}; next retry in ${retryDelay}s.`)
		await sleep(retryDelay * 1000)
	}
}

/**
 * Poll every endpoint concurrently until one verifies the CID or all of them
 * run out of time budget.
 */
async function checkAvailability(cid: string, deployDirectory: string): Promise<boolean> {
	const rootDigest = parseRootDigest(cid)
	const expectedSha = sha256Hex(await readFile(join(deployDirectory, 'index.html')))
	const deadline = performance.now() + TIME_BUDGET_MS
	const endpoints: Endpoint[] = [
		...ROUTERS.map(router => {
			const url = router.url(cid)

			return {
				name: `ipfs-providers (${router.name})`,
				url,
				check: () => checkProviders(router.name, url, cid, rootDigest, deadline),
			}
		}),
		...GATEWAYS.map(gateway => {
			const url = gateway.url(cid)

			return { name: gateway.name, url, check: () => checkGateway(url, expectedSha, deadline) }
		}),
	]

	try {
		await Promise.any(
			endpoints.map(endpoint =>
				poll(endpoint, cid, deadline).catch((error: unknown) => {
					log(getErrorMessage(error))
					throw error
				}),
			),
		)
	} catch {
		log('No endpoint verified CID availability within the ten-minute budget. Failure.')

		return false
	}

	log('CID availability verified. Success.')

	return true
}

const cli = cac('ipfs-availability-check')

cli
	.command(
		'check <cid> <deploy-directory>',
		'Check whether a CID is retrievable from IPFS providers or gateways',
	)
	.action(async (cid: string, deployDirectory: string) => {
		try {
			// Exit explicitly so endpoints still polling don't keep the process alive.
			process.exit((await checkAvailability(cid, deployDirectory)) ? 0 : 1)
		} catch (error) {
			process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
			process.exit(1)
		}
	})

cli.help()

try {
	cli.parse()
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
