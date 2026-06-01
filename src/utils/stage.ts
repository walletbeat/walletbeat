import { WalletLadderType } from '@/schema/ladders'
import type { WalletLadderEvaluation, WalletStage } from '@/schema/stages'
import type { RatedWallet } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { setContains } from '@/types/utils/non-empty'

/**
 * Get the primary stage and ladder evaluation for a wallet.
 * Returns the stage from the most relevant ladder for the wallet.
 * For software wallets, returns the SOFTWARE ladder stage.
 * For other wallet types, returns the first applicable ladder stage.
 */
/**
 * Staging ladder display only depends on these rated-wallet fields.
 * Parameter uses `string` attribute-group IDs so site wallets rated on a subset
 * of groups (software / hardware / embedded trees) are accepted.
 */
export type RatedWalletStageSlice = Pick<RatedWallet<string>, 'types' | 'ladders' | 'variants'>

export function getWalletStageAndLadder(wallet: RatedWalletStageSlice): {
	stage: WalletStage<string> | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
	ladderEvaluation: WalletLadderEvaluation<string> | null
} {
	if (wallet.types === undefined || wallet.ladders === undefined) {
		return {
			stage: null,
			ladderEvaluation: null,
		}
	}

	// Prioritize SOFTWARE ladder if the wallet is a software wallet
	if (setContains<WalletType>(wallet.types, WalletType.SOFTWARE)) {
		const softwareLadder = wallet.ladders[WalletLadderType.SOFTWARE]

		if (softwareLadder && softwareLadder.stage !== 'NOT_APPLICABLE') {
			return {
				stage: softwareLadder.stage,
				ladderEvaluation: softwareLadder,
			}
		}
	}

	// Otherwise, return the first applicable ladder evaluation
	const applicableLadder = Object.values(wallet.ladders).find(
		ladderEvaluation =>
			ladderEvaluation !== undefined && ladderEvaluation.stage !== 'NOT_APPLICABLE',
	)

	return applicableLadder
		? {
				stage: applicableLadder.stage,
				ladderEvaluation: applicableLadder,
			}
		: {
				stage: null,
				ladderEvaluation: null,
			}
}
