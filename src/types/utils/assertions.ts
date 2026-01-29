/**
 * EIP-1193 request arguments.
 * @see https://eips.ethereum.org/EIPS/eip-1193
 */
export interface Eip1193RequestArgs {
	method: string
	params?: unknown[]
}

/**
 * EIP-1193 Ethereum Provider interface.
 * Includes optional EIP-2700 EventEmitter methods.
 * @see https://eips.ethereum.org/EIPS/eip-1193
 * @see https://eips.ethereum.org/EIPS/eip-2700
 */
export interface Eip1193Provider {
	request: (args: Eip1193RequestArgs) => Promise<unknown>
	on?: (event: string, listener: (...args: unknown[]) => void) => unknown
	removeListener?: (event: string, listener: (...args: unknown[]) => void) => unknown
	once?: (event: string, listener: (...args: unknown[]) => void) => unknown
	removeAllListeners?: (event?: string) => unknown
}

/**
 * EIP-6963 Provider Info as defined in the spec.
 * @see https://eips.ethereum.org/EIPS/eip-6963
 */
export interface Eip6963ProviderInfo {
	uuid: string
	name: string
	icon: string
	rdns: string
}

/**
 * EIP-6963 Provider Detail containing both info and the provider object.
 */
export interface Eip6963ProviderDetail {
	info: Eip6963ProviderInfo
	provider: unknown
}

/**
 * EIP-6963 Announce Provider Event type.
 */
export type Eip6963AnnounceProviderEvent = CustomEvent<Eip6963ProviderDetail>

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

/**
 * Type guard to check if a value is a plain object (Record).
 * @param value - The value to check
 * @returns True if the value is a non-null, non-array object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
