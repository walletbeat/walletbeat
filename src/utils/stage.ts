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
export type RatedWalletStageSlice = Pick<
	RatedWallet<string>,
	'types' | 'ladders' | 'stagesByType' | 'variants'
>

export interface WalletStageByType {
	walletType: WalletType
	stage: WalletStage<string> | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES'
	ladderEvaluation: WalletLadderEvaluation<string> | null
}

export function getWalletStagesByType(wallet: RatedWalletStageSlice): WalletStageByType[] {
	if (wallet.types === undefined || wallet.stagesByType === undefined) {
		return []
	}

	return Object.values(WalletType)
		.filter(walletType => setContains<WalletType>(wallet.types, walletType))
		.map(walletType => {
			const ladderEvaluation = wallet.stagesByType[walletType]

			return {
				walletType,
				stage: ladderEvaluation?.stage ?? 'NOT_APPLICABLE',
				ladderEvaluation,
			}
		})
}

export function getWalletStageAndLadder(wallet: RatedWalletStageSlice): {
	stage: WalletStage<string> | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
	ladderEvaluation: WalletLadderEvaluation<string> | null
} {
	const stagesByType = getWalletStagesByType(wallet)

	if (stagesByType.length === 0) {
		return {
			stage: null,
			ladderEvaluation: null,
		}
	}

	const softwareStage = stagesByType.find(
		({ walletType, ladderEvaluation }) =>
			walletType === WalletType.SOFTWARE && ladderEvaluation !== null,
	)
	const firstApplicableStage = stagesByType.find(
		({ ladderEvaluation }) => ladderEvaluation !== null,
	)

	return softwareStage
		? {
				stage: softwareStage.stage,
				ladderEvaluation: softwareStage.ladderEvaluation,
			}
		: {
				stage: firstApplicableStage?.stage ?? null,
				ladderEvaluation: firstApplicableStage?.ladderEvaluation ?? null,
			}
}
