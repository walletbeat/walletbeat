import { allWalletLadders, WalletLadderType } from '@/schema/ladders'
import {
	evaluateWalletOnLadder,
	type WalletLadderEvaluation,
	type WalletStage,
} from '@/schema/stages'
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
	'types' | 'variants' | 'variantSpecificity' | 'overall' | 'overrides'
> &
	Partial<Pick<RatedWallet<string>, 'ladders'>>

function isStage(stage: WalletLadderEvaluation<string>['stage']): stage is WalletStage<string> {
	return typeof stage === 'object'
}

function canonicalizeLadderEvaluation(
	ladderType: WalletLadderType,
	ladderEvaluation: WalletLadderEvaluation<string>,
): WalletLadderEvaluation<string> {
	const ladder = allWalletLadders[ladderType]

	if (!ladder) {
		return ladderEvaluation
	}

	if (!isStage(ladderEvaluation.stage)) {
		return {
			...ladderEvaluation,
			ladder,
		}
	}

	const evaluatedStage = ladderEvaluation.stage
	const stage = ladder.stages.find(ladderStage => ladderStage.id === evaluatedStage.id)

	return {
		...ladderEvaluation,
		ladder,
		stage: stage ?? ladderEvaluation.stage,
	}
}

function getCanonicalLadderEvaluation(
	wallet: RatedWalletStageSlice,
	ladderType: WalletLadderType,
): WalletLadderEvaluation<string> | undefined {
	const serializedEvaluation = wallet.ladders?.[ladderType]

	if (serializedEvaluation !== undefined) {
		return canonicalizeLadderEvaluation(ladderType, serializedEvaluation)
	}

	const ladder = allWalletLadders[ladderType]

	return ladder ? evaluateWalletOnLadder(wallet, ladder) : undefined
}

export function getWalletStageAndLadder(wallet: RatedWalletStageSlice): {
	stage: WalletStage<string> | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
	ladderEvaluation: WalletLadderEvaluation<string> | null
	ladderType: WalletLadderType | null
} {
	if (wallet.types === undefined) {
		return {
			stage: null,
			ladderEvaluation: null,
			ladderType: null,
		}
	}

	// Prioritize SOFTWARE ladder if the wallet is a software wallet
	if (setContains<WalletType>(wallet.types, WalletType.SOFTWARE)) {
		const softwareLadder = getCanonicalLadderEvaluation(wallet, WalletLadderType.SOFTWARE)

		if (softwareLadder && softwareLadder.stage !== 'NOT_APPLICABLE') {
			return {
				stage: softwareLadder.stage,
				ladderEvaluation: softwareLadder,
				ladderType: WalletLadderType.SOFTWARE,
			}
		}
	}

	// Otherwise, return the first applicable ladder evaluation
	for (const ladderType of Object.values(WalletLadderType)) {
		const ladderEvaluation = getCanonicalLadderEvaluation(wallet, ladderType)

		if (ladderEvaluation === undefined || ladderEvaluation.stage === 'NOT_APPLICABLE') {
			continue
		}

		return {
			stage: ladderEvaluation.stage,
			ladderEvaluation,
			ladderType,
		}
	}

	return {
		stage: null,
		ladderEvaluation: null,
		ladderType: null,
	}
}
