import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency'
import type { AtLeastOneVariant } from '@/schema/variants'
import { markdown, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.transparency.fee_transparency'

export type FeeTransparencyValue = Value & {
	feeTransparencyLevel: FeeTransparencyLevel
	disclosesWalletFees: boolean
	showsTransactionPurpose: boolean
	__brand: 'attributes.transparency.fee_transparency'
}

function noFeeTransparency(): Evaluation<FeeTransparencyValue> {
	return {
		value: {
			id: 'no_fee_transparency',
			rating: Rating.FAIL,
			displayName: 'No fee transparency',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not provide clear information about transaction fees.',
			),
			feeTransparencyLevel: FeeTransparencyLevel.NONE,
			disclosesWalletFees: false,
			showsTransactionPurpose: false,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} does not provide clear information about transaction fees before users confirm transactions. Users cannot easily understand how much they will pay in network fees or if there are any additional fees charged by the wallet.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement fee transparency by clearly displaying network fees before transaction confirmation and disclosing any additional fees charged by the wallet.',
		),
	}
}

function basicFeeTransparency(
	disclosesWalletFees: boolean,
	showsTransactionPurpose: boolean,
): Evaluation<FeeTransparencyValue> {
	return {
		value: {
			id: 'basic_fee_transparency',
			rating: Rating.PARTIAL,
			displayName: 'Basic fee transparency',
			shortExplanation: sentence(
				'{{WALLET_NAME}} provides basic information about transaction fees.',
			),
			feeTransparencyLevel: FeeTransparencyLevel.BASIC,
			disclosesWalletFees,
			showsTransactionPurpose,
			__brand: brand,
		},
		details: paragraph(
			`{{WALLET_NAME}} provides basic information about network fees before transaction confirmation, but the information is limited. ${disclosesWalletFees ? 'The wallet does disclose any additional fees it charges.' : 'The wallet does not clearly disclose if it charges any additional fees.'} ${showsTransactionPurpose ? 'The wallet clearly shows the purpose of the transaction.' : 'The wallet does not clearly show the purpose of the transaction.'}`,
		),
		howToImprove: paragraph(
			`{{WALLET_NAME}} should improve fee transparency by providing more detailed breakdowns of network fees${!disclosesWalletFees ? ', clearly disclosing any additional wallet fees' : ''}${!showsTransactionPurpose ? ', and clearly showing the purpose of each transaction' : ''}.`,
		),
	}
}

function detailedFeeTransparency(
	disclosesWalletFees: boolean,
	showsTransactionPurpose: boolean,
): Evaluation<FeeTransparencyValue> {
	return {
		value: {
			id: 'detailed_fee_transparency',
			rating: Rating.PARTIAL,
			displayName: 'Detailed fee transparency',
			shortExplanation: sentence(
				'{{WALLET_NAME}} provides detailed information about transaction fees.',
			),
			feeTransparencyLevel: FeeTransparencyLevel.DETAILED,
			disclosesWalletFees,
			showsTransactionPurpose,
			__brand: brand,
		},
		details: paragraph(
			`{{WALLET_NAME}} provides detailed information about network fees before transaction confirmation, including a breakdown of gas costs. ${disclosesWalletFees ? 'The wallet does disclose any additional fees it charges.' : 'The wallet does not clearly disclose if it charges any additional fees.'} ${showsTransactionPurpose ? 'The wallet clearly shows the purpose of the transaction.' : 'The wallet does not clearly show the purpose of the transaction.'}`,
		),
		howToImprove: paragraph(
			`{{WALLET_NAME}} should improve fee transparency by ${!disclosesWalletFees ? 'clearly disclosing any additional wallet fees' : !showsTransactionPurpose ? 'clearly showing the purpose of each transaction' : 'providing comprehensive fee information including all components of the transaction cost'}.`,
		),
	}
}

function comprehensiveFeeTransparency(): Evaluation<FeeTransparencyValue> {
	return {
		value: {
			id: 'comprehensive_fee_transparency',
			rating: Rating.PASS,
			displayName: 'Comprehensive fee transparency',
			shortExplanation: sentence(
				'{{WALLET_NAME}} provides comprehensive information about all transaction fees.',
			),
			feeTransparencyLevel: FeeTransparencyLevel.COMPREHENSIVE,
			disclosesWalletFees: true,
			showsTransactionPurpose: true,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} provides comprehensive information about all fees before transaction confirmation. This includes a detailed breakdown of network fees, clear disclosure of any additional fees charged by the wallet, and a clear explanation of the transaction purpose. Users can make fully informed decisions about the cost of their transactions.',
		),
	}
}

export const feeTransparency: Attribute<FeeTransparencyValue> = {
	id: 'feeTransparency',
	icon: '\u{1F4B8}', // Money with wings
	displayName: 'Fee transparency',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's fee transparency evaluated?",
		whatCanWalletDoAboutIts: sentence('What can {{WALLET_NAME}} do to improve fee transparency?'),
	},
	question: sentence('Does the wallet clearly display all transaction fees and their purpose?'),
	why: markdown(`
		Fee transparency is crucial for users to understand the full cost of their transactions.
		Without clear fee information, users may be surprised by high transaction costs or
		hidden fees charged by the wallet.
		
		Transparent fee disclosure helps users make informed decisions about when to transact
		and which wallet to use. It also builds trust between users and wallet providers by
		ensuring that all costs are clearly communicated upfront.
		
		Additionally, understanding the purpose of a transaction is important for security.
		When users can clearly see what they're authorizing (e.g., a token swap, NFT purchase,
		or contract interaction), they're less likely to approve malicious transactions.
	`),
	methodology: markdown(`
		Wallets are evaluated based on how transparently they display transaction fees and
		transaction purposes to users.
		
		A wallet receives a passing rating if it provides comprehensive fee information,
		including detailed breakdowns of network fees, clear disclosure of any additional
		wallet fees, and clear explanation of transaction purposes.
		
		A wallet receives a partial rating if it provides some fee information but lacks
		complete transparency in one or more areas.
		
		A wallet fails this attribute if it provides minimal or no fee information before
		transaction confirmation.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(
				'The wallet provides comprehensive fee information, including detailed breakdowns of network fees, clear disclosure of any additional wallet fees, and clear explanation of transaction purposes.',
			),
			comprehensiveFeeTransparency().value,
		),
		partial: [
			exampleRating(
				paragraph(
					'The wallet provides detailed information about network fees, but may not fully disclose additional wallet fees or clearly show transaction purposes.',
				),
				detailedFeeTransparency(true, false).value,
			),
			exampleRating(
				paragraph(
					'The wallet provides basic information about transaction fees, but the information is limited and may not include a breakdown of costs.',
				),
				basicFeeTransparency(false, true).value,
			),
		],
		fail: [
			exampleRating(
				paragraph(
					'The wallet does not provide clear information about transaction fees before users confirm transactions.',
				),
				noFeeTransparency().value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<FeeTransparencyValue> => {
		// TODO: Refactor fee transparency wallet feature data to be more granular.

		if (features.transparency.feeTransparency === null) {
			return unrated(feeTransparency, brand, {
				feeTransparencyLevel: FeeTransparencyLevel.NONE,
				disclosesWalletFees: false,
				showsTransactionPurpose: false,
			})
		}

		const feeTransparencySupport = features.transparency.feeTransparency
		const level = feeTransparencySupport.level
		const disclosesWalletFees = feeTransparencySupport.disclosesWalletFees
		const showsTransactionPurpose = feeTransparencySupport.showsTransactionPurpose

		switch (level) {
			case FeeTransparencyLevel.NONE:
				return noFeeTransparency()
			case FeeTransparencyLevel.BASIC:
				return basicFeeTransparency(disclosesWalletFees, showsTransactionPurpose)
			case FeeTransparencyLevel.DETAILED:
				return detailedFeeTransparency(disclosesWalletFees, showsTransactionPurpose)
			case FeeTransparencyLevel.COMPREHENSIVE:
				// For comprehensive level, both disclosesWalletFees and showsTransactionPurpose must be true
				if (disclosesWalletFees && showsTransactionPurpose) {
					return comprehensiveFeeTransparency()
				} else {
					// If either is false, downgrade to detailed
					return detailedFeeTransparency(disclosesWalletFees, showsTransactionPurpose)
				}
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<FeeTransparencyValue>>) =>
		pickWorstRating<FeeTransparencyValue>(perVariant),
}
