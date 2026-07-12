import type { Eip, EipNumber } from '@/schema/eips'

/**
 * Returns the relative URL of the wallet adoption tracker page for an EIP.
 * EIP-7702 has its own richer tracker page rather than a generic one.
 */
export function getEipTrackerUrl(eip: EipNumber | Eip): string {
	const eipNumber = typeof eip === 'string' ? eip : eip.number

	if (eipNumber === '7702') {
		return '/wallet/7702/'
	}

	return `/wallet/eip/${eipNumber}/`
}
