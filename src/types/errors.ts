/** Get the error message, including a network error code hidden in its cause. */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		const cause = error.cause

		if (
			typeof cause === 'object' &&
			cause !== null &&
			'code' in cause &&
			typeof cause.code === 'string'
		) {
			return `${error.message} (${cause.code})`
		}

		return error.message
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
