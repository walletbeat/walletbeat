import { describe, expect, it } from 'vitest'

import {
	TransactionSubmissionL2Type,
	transactionSubmissionL2TypeName,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { EthereumL1LightClient } from '@/schema/features/security/light-client'
import {
	MonetizationStrategy,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization'
import type { StructuredDetails } from '@/types/content/details'
import type { StructuredDetailsContext } from '@/utils/structured-details/context'
import { serializeStructuredDetails } from '@/utils/structured-details/json'
import { renderStructuredDetailsMarkdown } from '@/utils/structured-details/markdown'

const context: StructuredDetailsContext = {
	strings: {
		WALLET_NAME: 'Testwallet',
		WALLET_PSEUDONYM_SINGULAR: 'pseudonym',
		WALLET_PSEUDONYM_PLURAL: 'pseudonyms',
	},
}

describe('chainVerification structured details', () => {
	const details: StructuredDetails = {
		type: 'chainVerification',
		lightClients: [EthereumL1LightClient.heliosMobi],
	}

	it('renders the canonical light client label rather than the raw enum in Markdown', () => {
		expect(renderStructuredDetailsMarkdown(details, context)).toBe(
			'**Testwallet** performs L1 chain state verification using [Helios-Mobi](https://github.com/hsyodyssey/helios-mobi) light client.',
		)
	})

	it('pluralizes when several light clients are used', () => {
		expect(
			renderStructuredDetailsMarkdown(
				{
					type: 'chainVerification',
					lightClients: [EthereumL1LightClient.helios, EthereumL1LightClient.heliosMobi],
				},
				context,
			),
		).toBe(
			'**Testwallet** performs L1 chain state verification using [Helios](https://helios.a16zcrypto.com/) and [Helios-Mobi](https://github.com/hsyodyssey/helios-mobi) light clients.',
		)
	})

	it('serializes light client identity, label and url', () => {
		expect(serializeStructuredDetails(details, context)).toEqual({
			type: 'chainVerification',
			lightClients: [
				{
					id: 'heliosMobi',
					name: 'Helios-Mobi',
					url: 'https://github.com/hsyodyssey/helios-mobi',
				},
			],
		})
	})
})

describe('funding structured details', () => {
	const details: StructuredDetails = {
		type: 'funding',
		strategies: [
			{ strategy: MonetizationStrategy.DONATIONS, userAligned: true },
			{ strategy: MonetizationStrategy.HIDDEN_CONVENIENCE_FEES, userAligned: false },
		],
		revenueBreakdownIsPublic: false,
	}

	it('lists active funding sources in Markdown', () => {
		expect(renderStructuredDetailsMarkdown(details, context)).toBe(
			`**Testwallet** is funded by **${monetizationStrategyName(MonetizationStrategy.DONATIONS)}, ${monetizationStrategyName(MonetizationStrategy.HIDDEN_CONVENIENCE_FEES)}**.`,
		)
	})

	it('falls back to unknown sources when no strategy is active', () => {
		expect(
			renderStructuredDetailsMarkdown(
				{ type: 'funding', strategies: [], revenueBreakdownIsPublic: true },
				context,
			),
		).toBe('**Testwallet** is funded by **unknown sources**.')
	})

	it('serializes user alignment and revenue breakdown status', () => {
		expect(serializeStructuredDetails(details, context)).toEqual({
			type: 'funding',
			strategies: [
				{
					strategy: MonetizationStrategy.DONATIONS,
					name: monetizationStrategyName(MonetizationStrategy.DONATIONS),
					userAligned: true,
				},
				{
					strategy: MonetizationStrategy.HIDDEN_CONVENIENCE_FEES,
					name: monetizationStrategyName(MonetizationStrategy.HIDDEN_CONVENIENCE_FEES),
					userAligned: false,
				},
			],
			revenueBreakdownIsPublic: false,
		})
	})
})

describe('transactionInclusion structured details', () => {
	const details: StructuredDetails = {
		type: 'transactionInclusion',
		l1Broadcast: 'OWN_NODE',
		l2s: [
			{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'ARBITRARY_TRANSACTIONS' },
			{ l2: TransactionSubmissionL2Type.arbitrum, forceInclusion: 'NONE' },
		],
		l2References: 'https://example.com/l2',
	}

	it('lists each L2 once, without the duplicate caused by overlapping arrays', () => {
		const rendered = renderStructuredDetailsMarkdown(details, context)
		const opStackName = transactionSubmissionL2TypeName(TransactionSubmissionL2Type.opStack)

		expect(rendered.split(opStackName)).toHaveLength(2)
		expect(rendered).toContain(
			`**Testwallet** supports L2 force-inclusion withdrawal transactions on **${opStackName}** L2s.`,
		)
		expect(rendered).toContain(
			`However, it does not support L2 force-inclusion withdrawal transactions on **${transactionSubmissionL2TypeName(TransactionSubmissionL2Type.arbitrum)}** L2s.`,
		)
		expect(rendered).toContain(
			"**Testwallet** supports connecting to a user's self-hosted Ethereum node",
		)
	})

	it('keeps the arbitrary-transactions versus withdrawal-only distinction in JSON', () => {
		expect(serializeStructuredDetails(details, context)).toEqual({
			type: 'transactionInclusion',
			l1Broadcast: 'OWN_NODE',
			l2s: [
				{
					l2: TransactionSubmissionL2Type.opStack,
					name: transactionSubmissionL2TypeName(TransactionSubmissionL2Type.opStack),
					forceInclusion: 'ARBITRARY_TRANSACTIONS',
				},
				{
					l2: TransactionSubmissionL2Type.arbitrum,
					name: transactionSubmissionL2TypeName(TransactionSubmissionL2Type.arbitrum),
					forceInclusion: 'NONE',
				},
			],
			l2References: [{ urls: [{ label: 'example.com', url: 'https://example.com/l2' }] }],
		})
	})
})

describe('scamPrevention structured details', () => {
	const details: StructuredDetails = {
		type: 'scamPrevention',
		warnings: [
			{
				kind: 'sendTransaction',
				description: '{{WALLET_NAME}} helps you stay safe when sending funds by:',
				items: ['Warning you about new recipients'],
				conclusion: 'However, in doing so, it leaks your IP to an external provider.',
				references: 'https://example.com/scam-prevention',
			},
		],
	}

	it('emphasizes the wallet name and nests items in Markdown', () => {
		expect(renderStructuredDetailsMarkdown(details, context)).toBe(
			[
				'- **Testwallet** helps you stay safe when sending funds by:',
				'  - Warning you about new recipients',
				'',
				'  However, in doing so, it leaks your IP to an external provider.',
			].join('\n'),
		)
	})

	it('serializes resolved prose and normalized references', () => {
		expect(serializeStructuredDetails(details, context)).toEqual({
			type: 'scamPrevention',
			warnings: [
				{
					kind: 'sendTransaction',
					description: 'Testwallet helps you stay safe when sending funds by:',
					items: ['Warning you about new recipients'],
					conclusion: 'However, in doing so, it leaks your IP to an external provider.',
					references: [
						{
							urls: [{ label: 'example.com', url: 'https://example.com/scam-prevention' }],
						},
					],
				},
			],
		})
	})

	it('omits optional fields that are absent', () => {
		expect(
			serializeStructuredDetails(
				{
					type: 'scamPrevention',
					warnings: [{ kind: 'scamUrl', description: '{{WALLET_NAME}} does not warn you.' }],
				},
				context,
			),
		).toEqual({
			type: 'scamPrevention',
			warnings: [{ kind: 'scamUrl', description: 'Testwallet does not warn you.' }],
		})
	})
})
