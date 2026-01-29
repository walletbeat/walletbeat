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
