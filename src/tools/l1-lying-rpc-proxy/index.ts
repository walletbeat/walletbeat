import * as http from 'http'
import * as https from 'https'

// Configuration
const DEFAULT_PORT = 8545
const DEFAULT_LIE_MULTIPLIER = 1_000_000n // multiply every ERC-20 balance by this

function parseArgs(): { port: number; upstream: string; multiplier: bigint } {
	const args = process.argv.slice(2)
	let port = Number(process.env['PROXY_PORT'] ?? DEFAULT_PORT)
	let upstream = process.env['UPSTREAM_RPC'] ?? ''
	let multiplier = DEFAULT_LIE_MULTIPLIER

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--port' && args[i + 1]) {
			port = Number(args[++i])
		} else if (args[i] === '--upstream' && args[i + 1]) {
			upstream = args[++i]
		} else if (args[i] === '--multiplier' && args[i + 1]) {
			multiplier = BigInt(args[++i])
		}
	}

	if (!upstream) {
		throw new Error('upstream RPC URL is required (--upstream or UPSTREAM_RPC env var)')
	}

	return { port, upstream, multiplier }
}
// ERC-20 detection helpers
const BALANCE_OF_SELECTOR = '70a08231'

interface EthCallParams {
	to?: string
	data?: string
}

function isErc20BalanceOfCall(params: unknown[]): params is [EthCallParams, ...unknown[]] {
	if (params.length === 0) {
		return false
	}

	const callObj = params[0]

	if (typeof callObj !== 'object' || callObj === null) {
		return false
	}

	const data: string = (callObj as EthCallParams).data ?? ''

	return data.toLowerCase().startsWith('0x' + BALANCE_OF_SELECTOR)
}

// Response manipulation
function lieAboutBalance(hexResult: string, multiplier: bigint): string {
	const clean = hexResult.startsWith('0x') ? hexResult.slice(2) : hexResult

	if (clean.length === 0 || clean === '0'.repeat(clean.length)) {
		const lied = 1_000_000n * multiplier

		return '0x' + lied.toString(16).padStart(64, '0')
	}

	const original = BigInt('0x' + clean)
	const lied = original * multiplier

	return '0x' + lied.toString(16).padStart(64, '0')
}
// JSON-RPC types
interface JsonRpcRequest {
	jsonrpc: string
	id: number | string | null
	method: string
	params?: unknown[]
}

interface JsonRpcResponse {
	jsonrpc: string
	id: number | string | null
	result?: unknown
	error?: unknown
}
// Type guards
function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
	return (
		typeof value === 'object' &&
		value !== null &&
		'jsonrpc' in value &&
		'method' in value &&
		typeof (value as Record<string, unknown>)['method'] === 'string'
	)
}

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		'jsonrpc' in value &&
		('result' in value || 'error' in value)
	)
}
// Upstream forwarding
function forwardToUpstream(
	upstreamUrl: string,
	body: Buffer,
): Promise<{ statusCode: number; body: Buffer }> {
	return new Promise((resolve, reject) => {
		const parsed = new URL(upstreamUrl)
		const isHttps = parsed.protocol === 'https:'

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': body.length,
				'User-Agent': 'l1-lying-rpc-proxy/1.0',
			},
		}

		const callback = (res: http.IncomingMessage): void => {
			const chunks: Uint8Array[] = []

			res.on('data', (chunk: Uint8Array) => chunks.push(chunk))
			res.on('end', () => {
				resolve({
					statusCode: res.statusCode ?? 200,
					body: Buffer.concat(chunks),
				})
			})
		}

		const req = isHttps
			? https.request(
					{
						...options,
						hostname: parsed.hostname,
						port: parsed.port || 443,
						path: parsed.pathname + parsed.search,
					},
					callback,
				)
			: http.request(
					{
						...options,
						hostname: parsed.hostname,
						port: parsed.port || 80,
						path: parsed.pathname + parsed.search,
					},
					callback,
				)

		req.on('error', reject)
		req.write(body)
		req.end()
	})
}
// Main request handler
function jsonError(message: string): Buffer {
	return Buffer.from(JSON.stringify({ error: message }), 'utf8')
}

function createHandler(upstream: string, multiplier: bigint) {
	return async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
		if (req.method !== 'POST') {
			res.writeHead(405, { 'Content-Type': 'application/json' })
			res.end(jsonError('Method not allowed – use POST'))

			return
		}

		const chunks: Uint8Array[] = []

		for await (const chunk of req as AsyncIterable<Uint8Array>) {
			chunks.push(chunk)
		}

		const rawBody = Buffer.concat(chunks)

		let parsed: unknown

		try {
			parsed = JSON.parse(rawBody.toString('utf8')) as unknown
		} catch {
			res.writeHead(400, { 'Content-Type': 'application/json' })
			res.end(jsonError('Invalid JSON'))

			return
		}

		const isBatch = Array.isArray(parsed)
		const rawRequests: unknown[] = isBatch && Array.isArray(parsed) ? Array.from(parsed) : [parsed]
		const requests: JsonRpcRequest[] = []

		for (const r of rawRequests) {
			if (!isJsonRpcRequest(r)) {
				res.writeHead(400, { 'Content-Type': 'application/json' })
				res.end(jsonError('Invalid JSON-RPC request'))

				return
			}

			requests.push(r)
		}

		const lieFlags: boolean[] = requests.map(
			r => r.method === 'eth_call' && isErc20BalanceOfCall(r.params ?? []),
		)
		const anyLie = lieFlags.some(Boolean)

		// Forward to upstream
		let upstreamResult: { statusCode: number; body: Buffer }

		try {
			upstreamResult = await forwardToUpstream(upstream, rawBody)
		} catch {
			res.writeHead(502, { 'Content-Type': 'application/json' })
			res.end(jsonError('Upstream unreachable'))

			return
		}

		// Parse upstream response
		let parsedUpstream: unknown

		try {
			parsedUpstream = JSON.parse(upstreamResult.body.toString('utf8')) as unknown
		} catch {
			// Upstream returned non-JSON. If we need to lie about any response,
			// we cannot do our job — return an error instead of passing garbage through.
			if (anyLie) {
				res.writeHead(502, { 'Content-Type': 'application/json' })
				res.end(jsonError('Upstream returned non-JSON response for a proxied ERC-20 balance query'))

				return
			}

			// No lie needed — pass through verbatim.
			res.writeHead(upstreamResult.statusCode, { 'Content-Type': 'application/json' })
			res.end(upstreamResult.body)

			return
		}

		// Normalize to array and validate each response
		const rawResponses: unknown[] = Array.isArray(parsedUpstream)
			? parsedUpstream
			: [parsedUpstream]

		// Verify the upstream response array is the same length as the request array.
		if (rawResponses.length !== requests.length) {
			res.writeHead(502, { 'Content-Type': 'application/json' })
			res.end(
				jsonError(
					`Upstream response count mismatch: expected ${requests.length}, got ${rawResponses.length}`,
				),
			)

			return
		}

		const responses: JsonRpcResponse[] = []

		for (const r of rawResponses) {
			if (!isJsonRpcResponse(r)) {
				res.writeHead(502, { 'Content-Type': 'application/json' })
				res.end(jsonError('Upstream returned invalid JSON-RPC response'))

				return
			}

			responses.push(r)
		}

		// Mutate ERC-20 balance responses
		for (let i = 0; i < responses.length; i++) {
			if (!lieFlags[i]) {
				continue
			}

			const resp = responses[i]

			if (resp !== undefined && typeof resp.result === 'string' && resp.result.startsWith('0x')) {
				const liedBalance = lieAboutBalance(resp.result, multiplier)

				resp.result = liedBalance
			}
		}

		const finalPayload: JsonRpcResponse | JsonRpcResponse[] = isBatch ? responses : responses[0]
		const finalBody = JSON.stringify(finalPayload)

		res.writeHead(upstreamResult.statusCode, { 'Content-Type': 'application/json' })
		res.end(finalBody)
	}
}
// Entry point
const { port, upstream, multiplier } = parseArgs()

const server = http.createServer((req, res) => {
	createHandler(upstream, multiplier)(req, res).catch((err: unknown) => {
		if (!res.headersSent) {
			res.writeHead(500, { 'Content-Type': 'application/json' })
			res.end(jsonError('Internal proxy error'))
		}

		throw err
	})
})

server.listen(port)
