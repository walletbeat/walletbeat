import type { SoftwareAttributeGroupId } from '@/data/software-wallets'

import type { WalletLadder } from './stages'
import { softwareWalletLadder } from './stages/software-wallet-stages'
import { WalletType } from './wallet-types'
// import type { HardwareAttributeGroupId } from '@/data/hardware-wallets'
// import type { EmbeddedAttributeGroupId } from '@/data/embedded-wallets'

export type Ladders<_AttributeGroupId extends string> = Partial<
	Record<WalletType, WalletLadder<_AttributeGroupId>>
>

export const softwareLadders = {
	[WalletType.SOFTWARE]: softwareWalletLadder,
} as const satisfies Ladders<SoftwareAttributeGroupId>

/**
 * All ladder definitions keyed by ladder type. Stage utilities should read from here
 * so adding hardware/embedded ladders does not scatter `softwareLadders` references.
 */
export const allWalletLadders = softwareLadders

// TODO: Define hardware wallet ladder.
// export const hardwareLadders = {} as const satisfies Ladders<HardwareAttributeGroupId>

// TODO: Define embedded wallet ladder.
// export const embeddedLadders = {} as const satisfies Ladders<EmbeddedAttributeGroupId>
