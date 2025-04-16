import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated, exempt } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata, RatedWallet } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import { UserSafetyType, type UserSafetySupport } from '@/schema/features/security/user-safety'
import { popRefs } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { type EvaluationData } from '@/schema/attributes'

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
	if (passCount >= 11) {
		return Rating.PASS
	}
	if (passCount >= 6) {
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
		`User safety features are crucial for ensuring users clearly understand the transactions and messages they are signing on their hardware device.
		This involves presenting information legibly (human-readable addresses/contracts/parameters), providing tools to verify raw data, offering risk analysis and transaction simulation, and preventing unintended actions.`,
	),
	methodology: markdown(
		`Evaluated based on 16 sub-criteria:
		- **Transaction/Message Clarity:** Human-readable display of addresses (e.g., ENS), known contracts, transaction parameters, and EIP-712 message parameters. Ability to review raw data.
		- **Extensibility:** Ease of adding support for human-readable display of new/unknown transaction or EIP-712 types.
		- **Expert Mode:** Availability of modes for advanced users to review essential data quickly.
		- **Risk Analysis:** Support for displaying warnings or risk evaluations for transactions/messages, including options for local or offline analysis.
		- **Transaction Simulation:** Support for simulating transaction outcomes (e.g., balance changes), including options for local or offline simulation.
		
		Rating thresholds: PASS if >=11/16 criteria pass, PARTIAL if >=6/16 pass, else FAIL.`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(() => 'The hardware wallet passes 11 or more user safety sub-criteria.'),
				(v: UserSafetyValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'The hardware wallet passes 6 to 10 user safety sub-criteria.'),
				(v: UserSafetyValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(() => 'The hardware wallet passes 5 or fewer user safety sub-criteria.'),
				(v: UserSafetyValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<UserSafetyValue>>) => {
		return pickWorstRating<UserSafetyValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<UserSafetyValue> => {
		if (features.variant !== Variant.HARDWARE) {
			return exempt(
				userSafety,
				sentence(
					(walletMetadata: WalletMetadata) =>
						`This attribute evaluates hardware wallet user safety features and is not applicable for ${walletMetadata.displayName}.`,
				),
				brand,
				{
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
				},
			)
		}

		const userSafetyFeature = features.security.userSafety
		if (!userSafetyFeature) {
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
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<UserSafetySupport>(userSafetyFeature)
		const rating = evaluateUserSafety(withoutRefs)

		const passCount = [
			withoutRefs.readableAddress,
			withoutRefs.contractLabeling,
			withoutRefs.rawTxReview,
			withoutRefs.readableTx,
			withoutRefs.txCoverageExtensibility,
			withoutRefs.txExpertMode,
			withoutRefs.rawEip712,
			withoutRefs.readableEip712,
			withoutRefs.eip712CoverageExtensibility,
			withoutRefs.eip712ExpertMode,
			withoutRefs.riskAnalysis,
			withoutRefs.riskAnalysisLocal,
			withoutRefs.fullyLocalRiskAnalysis,
			withoutRefs.txSimulation,
			withoutRefs.txSimulationLocal,
			withoutRefs.fullyLocalTxSimulation,
		].filter(r => r === UserSafetyType.PASS).length

		const detailsText = ({ wallet, value }: EvaluationData<UserSafetyValue>) => {
			let desc = `${wallet.metadata.displayName} user safety evaluation is ${rating.toLowerCase()}.`
			if (rating !== Rating.EXEMPT) {
				desc += ` It passes ${passCount} out of 16 sub-criteria.`
			}
			return desc
		}

		const howToImproveText = ({ wallet, value }: EvaluationData<UserSafetyValue>) => {
			if (rating === Rating.PASS || rating === Rating.EXEMPT) {
				return ''
			}
			return `${wallet.metadata.displayName} should improve sub-criteria related to transaction clarity, risk analysis, and simulation that are rated PARTIAL or FAIL.`
		}

		const improvementText = howToImproveText({
			wallet: {} as RatedWallet,
			value: {} as UserSafetyValue,
			references: [],
		})

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
			details: paragraph(detailsText),
			...(improvementText !== '' && { howToImprove: paragraph(howToImproveText) }),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}
