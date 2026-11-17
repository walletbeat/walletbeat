import { request } from 'https'

import { getErrorMessage } from '@/types/errors'

const FETCH_TIMEOUT_MS = 15000

export interface FetchOutcome {
	ok: boolean
	detail: string
}

/**
 * Fetch a URL the way the URL checks do: a plain HTTPS request with default
 * headers, considered valid on a 2xx response carrying at least one byte of
 * data. Redirects are not followed.
 *
 * Always resolves and never rejects: an exception inside a socket event
 * handler would otherwise leave callers hanging until they time out.
 */
export async function fetchUrl(href: string): Promise<FetchOutcome> {
	return new Promise(resolve => {
		let hasData = false

		try {
			const req = request(href, res => {
				res.on('data', () => {
					hasData = true
				})
				res.on('error', err => {
					resolve({ ok: false, detail: `response error: ${getErrorMessage(err)}` })
				})
				res.on('end', () => {
					const statusCode = res.statusCode ?? 0
					const redirect =
						statusCode >= 300 && statusCode <= 399 && res.headers.location !== undefined
							? ` redirecting to ${res.headers.location}`
							: ''

					if (statusCode >= 200 && statusCode <= 299 && hasData) {
						resolve({ ok: true, detail: `HTTP ${statusCode.toString()}` })
					} else {
						resolve({
							ok: false,
							detail: `HTTP ${statusCode === 0 ? 'unknown' : statusCode.toString()}${redirect}${hasData ? '' : ' (received 0 bytes)'}`,
						})
					}
				})
			})

			// Without an explicit socket timeout, a host that accepts the connection
			// but never responds would hang indefinitely.
			req.setTimeout(FETCH_TIMEOUT_MS, () => {
				req.destroy(new Error(`timed out after ${(FETCH_TIMEOUT_MS / 1000).toString()}s`))
			})
			req.on('error', err => {
				resolve({ ok: false, detail: getErrorMessage(err) })
			})
			req.end()
		} catch (err) {
			resolve({ ok: false, detail: getErrorMessage(err) })
		}
	})
}
