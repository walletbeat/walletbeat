import { describe, expect, it } from 'vitest'

import { ackee } from '@/data/entities/ackee'
import type { CorporateEntity } from '@/schema/entity'
import { PersonalInfo, WalletInfo } from '@/schema/features/privacy/data-collection'
import { EthereumL1LightClient } from '@/schema/features/security/light-client'
import {
	TransactionSubmissionL2Type,
	transactionSubmissionL2TypeName,
} from '@/schema/features/self-sovereignty/transaction-submission'
import {
	MonetizationStrategy,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization'
import { type FullyQualifiedReference, toFullyQualified } from '@/schema/reference'
import type { StructuredDetails } from '@/types/content/details'
import { buildAddressCorrelationDetails } from '@/types/content/details/address-correlation'
import type { StructuredDetailsContext } from '@/utils/structured-details/context'
import { serializeStructuredDetails } from '@/utils/structured-details/json'
import { renderStructuredDetailsMarkdown } from '@/utils/structured-details/markdown'
import { referencesNotIn, structuredDetailsReferences } from '@/utils/structured-details/references'

import { assertValidStructuredDetails } from './utils/assert-valid-json'

const context: StructuredDetailsContext = {
	strings: {
		WALLET_NAME: 'Test Wallet',
		WALLET_PSEUDONYM_SINGULAR: 'pseudonym',
		WALLET_PSEUDONYM_PLURAL: 'pseudonyms',
	},
}

/** A single-URL reference, as evaluators attach to a claim. */
function refWithUrl(url: string, label: string): FullyQualifiedReference {
	return { urls: [{ label, url }] }
}

describe('chainVerification structured details', () => {
	const details: StructuredDetails = {
		type: 'chainVerification',
		lightClients: [EthereumL1LightClient.heliosMobi],
	}

	it('renders the canonical light client label rather than the raw enum in Markdown', () => {
		expect(renderStructuredDetailsMarkdown(details, context)).toBe(
			'**Test Wallet** performs L1 chain state verification using [Helios-Mobi](https://github.com/hsyodyssey/helios-mobi) light client.',
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
			'**Test Wallet** performs L1 chain state verification using [Helios](https://helios.a16zcrypto.com/) and [Helios-Mobi](https://github.com/hsyodyssey/helios-mobi) light clients.',
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
			`**Test Wallet** is funded by **${monetizationStrategyName(MonetizationStrategy.DONATIONS)}, ${monetizationStrategyName(MonetizationStrategy.HIDDEN_CONVENIENCE_FEES)}**.`,
		)
	})

	it('falls back to unknown sources when no strategy is active', () => {
		expect(
			renderStructuredDetailsMarkdown(
				{ type: 'funding', strategies: [], revenueBreakdownIsPublic: true },
				context,
			),
		).toBe('**Test Wallet** is funded by **unknown sources**.')
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
			`**Test Wallet** supports L2 force-inclusion withdrawal transactions on **${opStackName}** L2s.`,
		)
		expect(rendered).toContain(
			`However, it does not support L2 force-inclusion withdrawal transactions on **${transactionSubmissionL2TypeName(TransactionSubmissionL2Type.arbitrum)}** L2s.`,
		)
		expect(rendered).toContain(
			"**Test Wallet** supports connecting to a user's self-hosted Ethereum node",
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

describe('claim references in Markdown', () => {
	it('attaches L1 and L2 references to the claim each supports', () => {
		const markdown = renderStructuredDetailsMarkdown(
			{
				type: 'transactionInclusion',
				l1Broadcast: 'OWN_NODE',
				l2s: [
					{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'ARBITRARY_TRANSACTIONS' },
				],
				l1References: 'https://example.com/l1',
				l2References: 'https://example.com/l2',
			},
			context,
		)
		const [l2Block, l1Block] = markdown.split('\n\n').filter(block => block.includes('example.com'))

		expect(l2Block).toContain('https://example.com/l2')
		expect(l2Block).not.toContain('https://example.com/l1')
		expect(l1Block).toContain('https://example.com/l1')
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
				'- **Test Wallet** helps you stay safe when sending funds by:',
				'  - Warning you about new recipients',
				'',
				'  However, in doing so, it leaks your IP to an external provider. ([example.com](https://example.com/scam-prevention))',
			].join('\n'),
		)
	})

	it('serializes resolved prose and normalized references', () => {
		expect(serializeStructuredDetails(details, context)).toEqual({
			type: 'scamPrevention',
			warnings: [
				{
					kind: 'sendTransaction',
					description: 'Test Wallet helps you stay safe when sending funds by:',
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
			warnings: [{ kind: 'scamUrl', description: 'Test Wallet does not warn you.' }],
		})
	})
})

describe('addressCorrelation structured details', () => {
	const other: CorporateEntity = { ...ackee, id: 'ackee-clone' }
	const ackeeRef = refWithUrl('https://ackee.example/policy', 'Ackee policy')
	const otherRef = refWithUrl('https://clone.example/policy', 'Clone policy')

	it('groups by stable entity identity rather than display name', () => {
		const details = buildAddressCorrelationDetails([
			{ info: WalletInfo.ACCOUNT_ADDRESS, by: ackee, refs: toFullyQualified(ackeeRef) },
			{ info: PersonalInfo.EMAIL, by: other, refs: toFullyQualified(otherRef) },
		])

		// Sources are ordered by their most sensitive leak, so the clone comes first.
		expect(details.leaks).toHaveLength(2)
		expect(
			details.leaks.map(leak =>
				leak.source.kind === 'entity' ? leak.source.entity.id : 'onchain',
			),
		).toEqual(['ackee-clone', 'ackee'])
	})

	it('merges an entity`s leaks, deduplicating information and references', () => {
		const details = buildAddressCorrelationDetails([
			{ info: PersonalInfo.EMAIL, by: ackee, refs: toFullyQualified(ackeeRef) },
			{ info: PersonalInfo.EMAIL, by: ackee, refs: toFullyQualified(ackeeRef) },
			{ info: WalletInfo.ACCOUNT_ADDRESS, by: ackee, refs: toFullyQualified(ackeeRef) },
		])

		expect(details.leaks).toHaveLength(1)
		expect(details.leaks[0].correlatedInfo).toEqual([
			PersonalInfo.EMAIL,
			WalletInfo.ACCOUNT_ADDRESS,
		])
		expect(details.leaks[0].references).toHaveLength(1)
	})

	it('sorts onchain records last', () => {
		const details = buildAddressCorrelationDetails([
			{ info: WalletInfo.ACCOUNT_ADDRESS, by: 'onchain', refs: [] },
			{ info: PersonalInfo.EMAIL, by: ackee, refs: [] },
		])

		expect(details.leaks.map(leak => leak.source.kind)).toEqual(['entity', 'onchain'])
	})

	it('renders one bullet per source, with its own references, in Markdown', () => {
		const details = buildAddressCorrelationDetails([
			{ info: PersonalInfo.EMAIL, by: ackee, refs: toFullyQualified(ackeeRef) },
			{ info: WalletInfo.ACCOUNT_ADDRESS, by: 'onchain', refs: [] },
		])

		expect(renderStructuredDetailsMarkdown(details, context)).toBe(
			[
				'By default, **Test Wallet** allows your wallet address to be correlated with your personal information:',
				'',
				'- **Ackee** ([Privacy policy](https://ackee.xyz/privacy-policy)) may link your wallet address to your **email address**. ([Ackee policy](https://ackee.example/policy))',
				'- An onchain record permanently associates your **wallet address** with your wallet address.',
			].join('\n'),
		)
	})

	it('serializes entity identity separately from its display name', () => {
		const details = buildAddressCorrelationDetails([
			{ info: PersonalInfo.EMAIL, by: ackee, refs: toFullyQualified(ackeeRef) },
		])

		expect(serializeStructuredDetails(details, context)).toEqual({
			type: 'addressCorrelation',
			leaks: [
				{
					source: { kind: 'entity', entityId: 'ackee', entityName: 'Ackee' },
					correlatedInfo: [{ info: 'EMAIL', name: 'email address' }],
					references: [{ urls: [{ label: 'Ackee policy', url: 'https://ackee.example/policy' }] }],
				},
			],
		})
	})

	it('exposes every claim reference so flat lists can drop duplicates', () => {
		const details = buildAddressCorrelationDetails([
			{ info: PersonalInfo.EMAIL, by: ackee, refs: toFullyQualified(ackeeRef) },
			{ info: PersonalInfo.PHONE, by: other, refs: toFullyQualified(otherRef) },
		])
		const claimed = structuredDetailsReferences(details)

		expect(claimed).toHaveLength(2)
		expect(referencesNotIn(toFullyQualified([ackeeRef, otherRef]), claimed)).toEqual([])
	})
})

describe('published JSON schema', () => {
	/** One fixture per structured-details variant; every variant must validate. */
	const variants: StructuredDetails[] = [
		buildAddressCorrelationDetails([
			{
				info: PersonalInfo.EMAIL,
				by: ackee,
				refs: toFullyQualified(refWithUrl('https://ackee.example/policy', 'Ackee policy')),
			},
			{ info: WalletInfo.ACCOUNT_ADDRESS, by: 'onchain', refs: [] },
		]),
		{ type: 'chainVerification', lightClients: [EthereumL1LightClient.helios] },
		{
			type: 'funding',
			strategies: [{ strategy: MonetizationStrategy.DONATIONS, userAligned: true }],
			revenueBreakdownIsPublic: true,
		},
		{
			type: 'scamPrevention',
			warnings: [
				{
					kind: 'scamUrl',
					description: '{{WALLET_NAME}} warns about known scam URLs.',
					items: ['Known phishing domains'],
					conclusion: 'This relies on an external blocklist.',
					references: 'https://example.com/scam-prevention',
				},
			],
		},
		{
			type: 'transactionInclusion',
			l1Broadcast: 'OWN_NODE',
			l2s: [{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'ARBITRARY_TRANSACTIONS' }],
			l1References: 'https://example.com/l1',
		},
	]

	for (const details of variants) {
		it(`validates ${details.type} against the public schema`, () => {
			assertValidStructuredDetails(serializeStructuredDetails(details, context))
		})
	}

	it('rejects a payload whose discriminator is not a published variant', () => {
		expect(() => {
			assertValidStructuredDetails({ type: 'notAVariant', leaks: [] })
		}).toThrow()
	})

	it('rejects a known variant that is missing a required field', () => {
		expect(() => {
			assertValidStructuredDetails({ type: 'funding', strategies: [] })
		}).toThrow()
	})
})
