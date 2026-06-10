import type { Eip, EipNumber } from '../src/schema/eips'
import { eip712 } from './eips/eip-712'
import { eip1193 } from './eips/eip-1193'
import { eip2700 } from './eips/eip-2700'
import { eip5792 } from './eips/eip-5792'
import { eip6963 } from './eips/eip-6963'
import { eip7702 } from './eips/eip-7702'
import { erc4337 } from './eips/erc-4337'
import { erc5564 } from './eips/erc-5564'
import { erc7730 } from './eips/erc-7730'
import { erc7828 } from './eips/erc-7828'
import { erc7831 } from './eips/erc-7831'
import { erc8213 } from './eips/erc-8213'

/**
 * All EIPs tracked by Walletbeat.
 */
export const eips: Record<EipNumber, Eip> = {
	'1193': eip1193,
	'2700': eip2700,
	'4337': erc4337,
	'5564': erc5564,
	'5792': eip5792,
	'6963': eip6963,
	'712': eip712,
	'7702': eip7702,
	'7730': erc7730,
	'7828': erc7828,
	'7831': erc7831,
	'8213': erc8213,
}

/** Resolve an EIP from an EIP number. */
export function getEip(eip: EipNumber | Eip): Eip {
	if (typeof eip !== 'string') {
		return eip
	}

	return eips[eip]
}

/** Look up EIP information for a given number. */
export function lookupEip(eip: number): Eip | undefined {
	const eipNumber = eip.toString() as EipNumber // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we will check whether this is correct on the very next line.

	if (Object.hasOwn(eips, eipNumber)) {
		return eips[eipNumber]
	}

	return undefined
}
