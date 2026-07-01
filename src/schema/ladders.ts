import type { EmbeddedAttributeGroupId } from '@/data/embedded-wallets'
import type { HardwareAttributeGroupId } from '@/data/hardware-wallets'
import type { SoftwareAttributeGroupId } from '@/data/software-wallets'

import type { WalletLadder } from './stages'
import { softwareWalletLadder } from './stages/software-wallet-stages'

/**
 * All wallet ladders.
 */
export enum WalletLadderType {
	SOFTWARE = 'SOFTWARE',

	// TODO: Define hardware wallet ladder.
	// HARDWARE = 'HARDWARE',

	// TODO: Define embedded wallet ladder.
	// EMBEDDED = 'EMBEDDED',
}

export type Ladders<_AttributeGroupId extends string> = Partial<
	Record<WalletLadderType, WalletLadder<_AttributeGroupId>>
>

export const softwareLadders = {
	[WalletLadderType.SOFTWARE]: softwareWalletLadder,
} as const satisfies Ladders<SoftwareAttributeGroupId>

export const hardwareLadders = {} as const satisfies Ladders<HardwareAttributeGroupId>

export const embeddedLadders = {} as const satisfies Ladders<EmbeddedAttributeGroupId>

/**
 * All ladder definitions keyed by ladder type. Stage utilities should read from here
 * so adding hardware/embedded ladders does not scatter `softwareLadders` references.
 */
export const allWalletLadders = {
	...softwareLadders,
	...hardwareLadders,
	...embeddedLadders,
}
