/**
 * Asserts that a string is a valid transaction/batch ID with 0x prefix.
 * @throws Error if the string doesn't start with '0x'
 */
export function assertTransactionId(s: string): `0x${string}` {
	if (!s.startsWith('0x')) {
		throw new Error(`Expected transaction ID to start with '0x', got: ${s}`)
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just checked
	return s as `0x${string}`
}