import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { TransactionSimulationType } from '@/schema/features/security/transaction-simulation'
import { toFullyQualified } from '@/schema/reference'
import { mdParagraph, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.transaction_simulation'

export type TransactionSimulationValue = Value & {
	__brand: 'attributes.security.transaction_simulation'
}

function localSimulation(features: ResolvedFeatures): Evaluation<TransactionSimulationValue> {
	return {
		value: {
			id: 'local',
			rating: Rating.PASS,
			displayName: 'Local transaction simulation',
			shortExplanation: sentence(`
				{{WALLET_NAME}} simulates transactions locally before submission.
			`),
			__brand: brand,
		},
		details: paragraph(`
			{{WALLET_NAME}} simulates transactions locally on the user's device,
			providing transaction previews without sharing transaction data
			with external services.
		`),
		impact: paragraph(`
			Local simulation provides privacy and security by keeping transaction
			details on the user's device while still offering protection against
			malicious transactions.
		`),
		references: toFullyQualified(features.security.transactionSimulation!.ref),
	}
}

function walletBackendSimulation(
	features: ResolvedFeatures,
): Evaluation<TransactionSimulationValue> {
	return {
		value: {
			id: 'wallet_backend',
			rating: Rating.PASS,
			displayName: 'Wallet-operated transaction simulation',
			shortExplanation: sentence(`
				{{WALLET_NAME}} uses its own backend to simulate transactions.
			`),
			__brand: brand,
		},
		details: paragraph(`
			{{WALLET_NAME}} simulates transactions using infrastructure operated
			by the wallet team, providing transaction previews before submission.
		`),
		impact: paragraph(`
			While this requires trusting the wallet's backend infrastructure,
			it still provides valuable protection against malicious transactions
			and the wallet team has a direct interest in maintaining security.
		`),
		references: toFullyQualified(features.security.transactionSimulation!.ref),
	}
}

function thirdPartySimulation(features: ResolvedFeatures): Evaluation<TransactionSimulationValue> {
	return {
		value: {
			id: 'third_party',
			rating: Rating.PARTIAL,
			displayName: 'Third-party transaction simulation',
			shortExplanation: sentence(`
				{{WALLET_NAME}} uses a third-party service for transaction simulation.
			`),
			__brand: brand,
		},
		details: paragraph(`
			{{WALLET_NAME}} relies on external third-party services to simulate
			transactions and detect potentially malicious transactions.
		`),
		impact: paragraph(`
			This provides some protection but requires trusting external
			infrastructure and may leak transaction data to third parties.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should implement local transaction simulation or
			operate its own simulation infrastructure.
		`),
		references: toFullyQualified(features.security.transactionSimulation!.ref),
	}
}

function noSimulation(features: ResolvedFeatures): Evaluation<TransactionSimulationValue> {
	return {
		value: {
			id: 'not_supported',
			rating: Rating.FAIL,
			displayName: 'No transaction simulation',
			shortExplanation: sentence(`
				{{WALLET_NAME}} does not simulate transactions before submission.
			`),
			__brand: brand,
		},
		details: paragraph(`
			{{WALLET_NAME}} does not provide transaction simulation or preview
			capabilities, leaving users vulnerable to malicious transactions.
		`),
		impact: paragraph(`
			Without transaction simulation, users cannot preview the effects
			of transactions before approving them, making it easier to fall
			victim to phishing attacks and malicious contracts.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should implement transaction simulation to help
			users understand the effects of transactions before signing.
		`),
		references: toFullyQualified(features.security.transactionSimulation!.ref),
	}
}

export const transactionSimulation: Attribute<TransactionSimulationValue> = {
	id: 'transactionSimulation',
	icon: '\u{1f50e}',
	displayName: 'Transaction Simulation',
	wording: {
		midSentenceName: 'transaction simulation',
	},
	question: sentence('Does the wallet simulate transactions before submission?'),
	why: paragraph(`
		Transaction simulation allows users to preview the effects of a transaction
		before signing it. This helps protect against malicious contracts and phishing
		attacks by showing users what assets will be transferred, what permissions
		will be granted, and what the transaction will actually do.
	`),
	methodology: sentence(`
		Wallets are evaluated based on whether they simulate transactions and where
		the simulation occurs (locally, wallet backend, or third-party service).
	`),
	ratingScale: {
		display: 'simple',
		content: mdParagraph(`
			Wallets that simulate transactions locally or using their own backend
			infrastructure pass. Wallets using third-party simulation receive a
			partial rating. Wallets without simulation fail.
		`),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<TransactionSimulationValue> => {
		if (features.security.transactionSimulation === null) {
			return unrated(transactionSimulation, brand, null)
		}

		switch (features.security.transactionSimulation.simulationType) {
			case TransactionSimulationType.LOCAL:
				return localSimulation(features)
			case TransactionSimulationType.WALLET_BACKEND:
				return walletBackendSimulation(features)
			case TransactionSimulationType.THIRD_PARTY:
				return thirdPartySimulation(features)
			case TransactionSimulationType.NOT_SUPPORTED:
				return noSimulation(features)
			default:
				return unrated(transactionSimulation, brand, null)
		}
	},
	aggregate: pickWorstRating<TransactionSimulationValue>,
}
