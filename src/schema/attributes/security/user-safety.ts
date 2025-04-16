import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import { UserSafetyType, type UserSafetySupport } from '@/schema/features/security/user-safety'
import { popRefs } from '@/schema/reference'

const brand = 'attributes.user_safety'

export type UserSafetyValue = Value & {
	readableAddress: UserSafetyType
	contractLabeling: UserSafetyType
	rawTxReview: UserSafetyType
	readableTx: UserSafetyType
	txCoverageExtensibility: UserSafetyType
	txExpertMode: UserSafetyType
	rawEip712: UserSafetyType
	readableEip712: UserSafetyType
	eip712CoverageExtensibility: UserSafetyType
	eip712ExpertMode: UserSafetyType
	riskAnalysis: UserSafetyType
	riskAnalysisLocal: UserSafetyType
	fullyLocalRiskAnalysis: UserSafetyType
	txSimulation: UserSafetyType
	txSimulationLocal: UserSafetyType
	fullyLocalTxSimulation: UserSafetyType
	__brand: 'attributes.user_safety'
}

function evaluateUserSafety(features: UserSafetySupport): Rating {
	const ratings = [
		features.readableAddress,
		features.contractLabeling,
		features.rawTxReview,
		features.readableTx,
		features.txCoverageExtensibility,
		features.txExpertMode,
		features.rawEip712,
		features.readableEip712,
		features.eip712CoverageExtensibility,
		features.eip712ExpertMode,
		features.riskAnalysis,
		features.riskAnalysisLocal,
		features.fullyLocalRiskAnalysis,
		features.txSimulation,
		features.txSimulationLocal,
		features.fullyLocalTxSimulation,
	]
	const passCount = ratings.filter(r => r === UserSafetyType.PASS).length
	if (passCount > 12) {
		return Rating.PASS
	}
	if (passCount > 6) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const userSafety: Attribute<UserSafetyValue> = {
	id: 'user_safety',
	icon: '🛡️',
	displayName: 'User Safety',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's user safety evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its user safety?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} provide comprehensive user safety features?`,
	),
	why: markdown(
		`User safety covers transaction clarity, risk analysis, simulation, and protection mechanisms for users.`,
	),
	methodology: markdown(
		`Evaluated based on 18 sub-criteria. PASS if >12/18 PASS, PARTIAL if >6/18 PASS, else FAIL.`,
	),
	ratingScale: {
		display: 'pass-partial-fail',
		exhaustive: true,
		pass: ['More than 12 sub-criteria are PASS'],
		partial: ['More than 6 sub-criteria are PASS'],
		fail: ['6 or fewer sub-criteria are PASS'],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<UserSafetyValue>>) => {
		return pickWorstRating<UserSafetyValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<UserSafetyValue> => {
		if (!features.userSafety) {
			return unrated(userSafety, brand, {
				readableAddress: UserSafetyType.FAIL,
				contractLabeling: UserSafetyType.FAIL,
				rawTxReview: UserSafetyType.FAIL,
				readableTx: UserSafetyType.FAIL,
				txCoverageExtensibility: UserSafetyType.FAIL,
				txExpertMode: UserSafetyType.FAIL,
				rawEip712: UserSafetyType.FAIL,
				readableEip712: UserSafetyType.FAIL,
				eip712CoverageExtensibility: UserSafetyType.FAIL,
				eip712ExpertMode: UserSafetyType.FAIL,
				riskAnalysis: UserSafetyType.FAIL,
				riskAnalysisLocal: UserSafetyType.FAIL,
				fullyLocalRiskAnalysis: UserSafetyType.FAIL,
				txSimulation: UserSafetyType.FAIL,
				txSimulationLocal: UserSafetyType.FAIL,
				fullyLocalTxSimulation: UserSafetyType.FAIL,
				__brand: brand,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<UserSafetySupport>(features.userSafety)
		const rating = evaluateUserSafety(withoutRefs)

		return {
			value: {
				id: 'user_safety',
				rating,
				displayName: 'User Safety',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} user safety.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} user safety evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}
