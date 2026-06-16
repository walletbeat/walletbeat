import { type NonEmptyArray, type NonEmptyRecord, nonEmptyValues } from '@/types/utils/non-empty'

import type { WalletLadder } from './stages'
import { softwareWalletLadder } from './stages/software-wallet-stages'

/**
 * All wallet ladders.
 */
export enum WalletLadderType {
	SOFTWARE = 'SOFTWARE',

	// TODO: Add hardware wallet ladder.
}

/**
 * Record of all wallet ladders.
 */
export const ladders: NonEmptyRecord<WalletLadderType, WalletLadder> = {
	[WalletLadderType.SOFTWARE]: softwareWalletLadder,
}

/**
 * List of all wallet ladders.
 */
export const allLadders: NonEmptyArray<WalletLadder> = nonEmptyValues(ladders)
