/**
 * Get the error message, including a network error code carried by the
 * error itself or hidden in its cause.
 * Node.js system errors may carry their code with an empty message (e.g. an
 * `AggregateError` when every address of a dual-stack host refuses the
 * connection), so the code alone is used as the message in that case.
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		const cause = error.cause
		let code: string | null = null

		if ('code' in error && typeof error.code === 'string') {
			code = error.code
		} else if (
			typeof cause === 'object' &&
			cause !== null &&
			'code' in cause &&
			typeof cause.code === 'string'
		) {
			code = cause.code
		}

		if (error.message === '') {
			return code ?? '<unknown error>'
		}

		if (code === null || error.message.includes(code)) {
			return error.message
		}

		return `${error.message} (${code})`
	}

	if (typeof error === 'string') {
		return error
	}

	if (
		error &&
		typeof error === 'object' &&
		'message' in error &&
		error.message !== undefined &&
		error.message !== null
	) {
		return getErrorMessage(error.message)
	}

	const str = String(error)

	if (str === '') {
		return '<unknown error>'
	}

	return str
}

/** Prefix an existing error with a given prefix message. */
export function prefixError(prefix: string, e: unknown): Error {
	return new Error(`${prefix}: ${getErrorMessage(e)}`)
}
