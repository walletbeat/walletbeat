import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { type UserSafetySupport, UserSafetyType } from '@/schema/features/security/user-safety'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

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
	id: 'userSafety',
	icon: '🛡️',
	displayName: 'User Safety',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's user safety evaluated?",
		whatCanWalletDoAboutIts: sentence('What can {{WALLET_NAME}} do to improve its user safety?'),
	},
	question: sentence('Does {{WALLET_NAME}} provide comprehensive user safety features?'),
	why: markdown(`
		User safety features are crucial for ensuring users clearly understand the transactions and messages they are signing on their hardware device.
		This involves presenting information legibly (human-readable addresses/contracts/parameters), providing tools to verify raw data, offering risk analysis and transaction simulation, and preventing unintended actions.
	`),
	methodology: markdown(`
		Evaluated based on the following criteria (mapped to 16 internal sub-criteria):

		- **Human readable addresses:** Are raw addresses easy to review? Is the HWW displaying the ENS linked to an address if available?	 

		- **Human readable identification of well known contracts:** Is the HWW displaying information about well known contracts? How reliable is it (considering rogue proxies)? How independently chosen is it?

		- **Possible to review all TX parameters raw:** Are all raw parameters from a TX displayed? Easy to review (calldata…)?	 

		- **Human readable review of TX parameters:** Is the HWW displaying a human readable version of some/all parameters? Are there restrictions?  

		- **Coverage of human readable TX parameters reviewable:** Describe how extensive/limited the display of human readable TX parameters is. Is it using independent data? How frequently is it collected and updated?

		- **Easy to extend human readable TX parameters:** Is it possible for the user to add support to get a human readable display of an unknown TX parameter? Describe the process.

		- **Expert mode for TX review:** Is there a mode available to sign the transaction quickly while displaying enough information to verify the TX on a secondary trusted computer?

		- **Possible to review all EIP 712 parameters raw:** Are all raw parameters from an EIP 712 message displayed? Easy to review (structures, byte arrays,…)?

		- **Human readable review of EIP 712 parameters:** Is the HWW displaying a human readable version of some/all parameters? Are there restrictions?

		- **Coverage of human readable EIP 712 parameters reviewable:** Describe how extensive/limited the display of human readable EIP 712 message parameters is. Is it using independent data? How frequently is it collected and updated?

		- **Easy to extend human readable EIP 712 parameters:** Is it possible for the user to add support to get a human readable display of an unknown parameter in an EIP 712 message? Describe the process.

		- **Expert mode for EIP 712 review:** Is there a mode available to sign an EIP 712 message quickly while displaying enough information to verify the EIP 712 message on a secondary trusted computer?

		- **Risk analysis support:** Is the HWW displaying a risk evaluation / threat warning to the user when signing transactions or messages? Describe how the evaluation works.

		- **Risk analysis without phoning home possible:** Is it possible to run the risk analysis process without contacting the HWW manufacturer? Describe which external services are involved and if the full TX/message data could be recovered by any party.

		- **Fully local risk analysis possible:** Is it possible to run the risk analysis evaluation locally? Describe the components provided by the HWW provider and the setup.

		- **TX simulation support:** Is the HWW displaying high level simulation results (balance difference…) to the user when signing transactions or messages? Describe how the evaluation works.

		- **TX simulation without phoning home possible:** Is it possible to run the simulation process without contacting the HWW manufacturer? Describe which external services are involved and if the full TX/message data could be recovered by any party.

		- **Fully local TX simulation possible:** Is it possible to run the simulation locally? Describe the components provided by the HWW provider and the setup.

		Rating thresholds: PASS if >=11/16 criteria pass, PARTIAL if >=6/16 pass, else FAIL.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence('The hardware wallet passes 11 or more user safety sub-criteria.'),
				(v: UserSafetyValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The hardware wallet passes 6 to 10 user safety sub-criteria.'),
				(v: UserSafetyValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The hardware wallet passes 5 or fewer user safety sub-criteria.'),
				(v: UserSafetyValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<UserSafetyValue>>) =>
		pickWorstRating<UserSafetyValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<UserSafetyValue> => {
		if (features.type !== WalletType.HARDWARE) {
			return exempt(
				userSafety,
				sentence(
					'This attribute evaluates hardware wallet user safety features and is not applicable for {{WALLET_NAME}}.',
				),
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

		if (userSafetyFeature === null) {
			return unrated(userSafety, {
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

		const rating = evaluateUserSafety(userSafetyFeature)

		const passCount = [
			userSafetyFeature.readableAddress,
			userSafetyFeature.contractLabeling,
			userSafetyFeature.rawTxReview,
			userSafetyFeature.readableTx,
			userSafetyFeature.txCoverageExtensibility,
			userSafetyFeature.txExpertMode,
			userSafetyFeature.rawEip712,
			userSafetyFeature.readableEip712,
			userSafetyFeature.eip712CoverageExtensibility,
			userSafetyFeature.eip712ExpertMode,
			userSafetyFeature.riskAnalysis,
			userSafetyFeature.riskAnalysisLocal,
			userSafetyFeature.fullyLocalRiskAnalysis,
			userSafetyFeature.txSimulation,
			userSafetyFeature.txSimulationLocal,
			userSafetyFeature.fullyLocalTxSimulation,
		].filter(r => r === UserSafetyType.PASS).length

		const detailsText = `{{WALLET_NAME}} user safety evaluation is ${rating.toLowerCase()}.${
			rating !== Rating.EXEMPT ? ` It passes ${passCount} out of 16 sub-criteria.` : ''
		}`

		const howToImproveText =
			rating !== Rating.PASS && rating !== Rating.EXEMPT
				? '{{WALLET_NAME}} should improve sub-criteria related to transaction clarity, risk analysis, and simulation that are rated PARTIAL or FAIL.'
				: ''

		return {
			value: {
				id: 'user_safety',
				rating,
				displayName: 'User Safety',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} user safety.`),
				...userSafetyFeature, // TODO: Filter fields
			},
			details: paragraph(detailsText),
			// TODO: Add references
			howToImprove:
				rating === Rating.PASS || rating === Rating.EXEMPT
					? undefined
					: paragraph(howToImproveText),
		}
	},
}
