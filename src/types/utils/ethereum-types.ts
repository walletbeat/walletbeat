import type { Eip6963AnnounceProviderEvent } from '../eip'

/**
 * Type predicate to check if an Event is an EIP-6963 Announce Provider Event.
 * @param event - The event to check
 * @returns True if the event is an EIP-6963 Announce Provider Event
 */
export function isEip6963AnnounceProviderEvent(
	event: Event,
): event is Eip6963AnnounceProviderEvent {
	if (!('detail' in event)) {
		return false
	}

	const detail: unknown = event.detail

	if (typeof detail !== 'object' || detail === null) {
		return false
	}

	if (!('info' in detail) || !('provider' in detail)) {
		return false
	}

	const { info, provider } = detail

	if (typeof info !== 'object' || info === null) {
		return false
	}

	if (!('uuid' in info) || !('name' in info) || !('icon' in info) || !('rdns' in info)) {
		return false
	}

	return (
		typeof info.uuid === 'string' &&
		typeof info.name === 'string' &&
		typeof info.icon === 'string' &&
		typeof info.rdns === 'string' &&
		provider !== undefined
	)
}

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
