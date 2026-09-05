import { describe, expect, it } from 'vitest'

import { ackee } from '@/data/entities/ackee'
import type { CorporateEntity } from '@/schema/entity'
import { PersonalInfo, WalletInfo } from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { AccountRecoveryDrillType, GuardianType } from '@/schema/features/security/account-recovery'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { EthereumL1LightClient } from '@/schema/features/security/light-client'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import {
	TransactionSubmissionL2Type,
	transactionSubmissionL2TypeName,
} from '@/schema/features/self-sovereignty/transaction-submission'
import {
	MonetizationStrategy,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization'
import { type FullyQualifiedReference, toFullyQualified } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { buildAddressCorrelationDetails } from '@/types/content/address-correlation-details'
import { guardianPolicyBlocks, type GuardianPolicyDetail } from '@/types/content/guardian-policy'
import { inline, inlineCode, inlineEmphasis, inlineLink } from '@/types/content/inline'
import { mergePrivateTransfersDetails } from '@/types/content/private-transfers-details'
import {
	bugBountySentences,
	formatCalendarDate,
	mergeSecurityAuditsDetails,
	type SecurityAuditsDetails,
	securityAuditsSummary,
} from '@/types/content/security-audits-details'
import type { StructuredDetails, StructuredDetailsByType } from '@/types/content/structured-details'
import type { CalendarDate } from '@/types/date'
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

describe('inline authoring', () => {
	it('normalizes authored indentation and keeps interpolated spans intact', () => {
		expect(inline`
			Spending relies on
			${inlineLink('a broadcaster', 'https://example.com/broadcaster')}
			and a ${inlineCode('0zk')} address.
		`).toEqual([
			{ kind: 'text', text: 'Spending relies on ' },
			{ kind: 'link', text: 'a broadcaster', url: 'https://example.com/broadcaster' },
			{ kind: 'text', text: ' and a ' },
			{ kind: 'text', text: '0zk', code: true },
			{ kind: 'text', text: ' address.' },
		])
	})

	it('merges adjacent plain text and drops empty runs', () => {
		expect(inline`One ${'two'} three`).toEqual([{ kind: 'text', text: 'One two three' }])
	})
})

describe('chainVerification structured details', () => {
	const details: StructuredDetails = {
		type: 'chainVerification',
		lightClients: [EthereumL1LightClient.heliosMobi],
	}

	it('renders the canonical light client label rather than the raw enum in Markdown', () => {
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown).toContain('**Test Wallet**')
		expect(markdown).toContain(
			'[Helios-Mobi](https://github.com/hsyodyssey/helios-mobi) light client',
		)
		expect(markdown).not.toContain('heliosMobi')
	})

	it('pluralizes when several light clients are used', () => {
		const markdown = renderStructuredDetailsMarkdown(
			{
				type: 'chainVerification',
				lightClients: [EthereumL1LightClient.helios, EthereumL1LightClient.heliosMobi],
			},
			context,
		)

		expect(markdown).toContain('[Helios](https://helios.a16zcrypto.com/)')
		expect(markdown).toContain('[Helios-Mobi](https://github.com/hsyodyssey/helios-mobi)')
		expect(markdown).toContain('light clients')
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
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown).toContain('**Test Wallet**')
		expect(markdown).toContain(monetizationStrategyName(MonetizationStrategy.DONATIONS))
		expect(markdown).toContain(
			monetizationStrategyName(MonetizationStrategy.HIDDEN_CONVENIENCE_FEES),
		)
	})

	it('falls back to unknown sources when no strategy is active', () => {
		expect(
			renderStructuredDetailsMarkdown(
				{ type: 'funding', strategies: [], revenueBreakdownIsPublic: true },
				context,
			),
		).toContain('**unknown sources**')
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
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown.match(/^- /gmu)).toHaveLength(2)
		expect(markdown).toContain('**Ackee**')
		expect(markdown).toContain('**email address**')
		expect(markdown).toContain('[Ackee policy](https://ackee.example/policy)')
		expect(markdown).toContain('onchain record')
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

describe('privateTransfers structured details', () => {
	const details: StructuredDetails = {
		type: 'privateTransfers',
		technologies: [
			{
				technology: PrivateTransferTechnology.RAILGUN,
				sending: inline`Shielding tokens is done directly to the smart contract.`,
				receiving: inline`The merkle tree is synced on the ${inlineEmphasis('user')}'s device.`,
				spending: inline`Spending relies on ${inlineLink('a broadcaster', 'https://example.com/broadcaster')} and a ${inlineCode('0zk')} address.`,
				notes: [inline`The broadcaster is not user-customizable.`],
			},
		],
		defaultModeNote: inline`{{WALLET_NAME}} supports private token transfers, but transfers are public by default.`,
	}

	it('renders the wallet-wide note before any technology in Markdown', () => {
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown.split('\n\n')[0]).toBe(
			'Test Wallet supports private token transfers, but transfers are public by default.',
		)
		expect(markdown).toContain('#### Railgun')
	})

	it('formats inline spans in each phase of a transfer', () => {
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown).toContain("**Receiving:** The merkle tree is synced on the *user*'s device.")
		expect(markdown).toContain(
			'**Spending:** Spending relies on [a broadcaster](https://example.com/broadcaster) and a `0zk` address.',
		)
		expect(markdown).toContain('The broadcaster is not user-customizable.')
	})

	it('serializes resolved text plus the links of each sentence', () => {
		const json = serializeStructuredDetails(details, context)

		expect(json).toEqual({
			type: 'privateTransfers',
			technologies: [
				{
					technology: 'railgun',
					name: 'Railgun',
					sending: { text: 'Shielding tokens is done directly to the smart contract.' },
					receiving: { text: "The merkle tree is synced on the user's device." },
					spending: {
						text: 'Spending relies on a broadcaster and a 0zk address.',
						links: [{ text: 'a broadcaster', url: 'https://example.com/broadcaster' }],
					},
					notes: [{ text: 'The broadcaster is not user-customizable.' }],
				},
			],
			defaultModeNote: {
				text: 'Test Wallet supports private token transfers, but transfers are public by default.',
			},
		})
	})

	it('keeps the wallet-wide note top-level when merging two evaluations', () => {
		const merged = mergePrivateTransfersDetails(
			{ type: 'privateTransfers', technologies: details.technologies },
			{
				type: 'privateTransfers',
				technologies: [],
				defaultModeNote: inline`Transfers are public by default.`,
			},
		)

		expect(merged.defaultModeNote).toEqual(inline`Transfers are public by default.`)
		expect(merged.technologies[0].notes).toEqual(details.technologies[0].notes)
	})

	it('keeps the first detail of each technology when merging', () => {
		const other = {
			...details.technologies[0],
			notes: [inline`A later, discarded note.`],
		}
		const merged = mergePrivateTransfersDetails(
			{ type: 'privateTransfers', technologies: details.technologies },
			{
				type: 'privateTransfers',
				technologies: [
					other,
					{
						technology: PrivateTransferTechnology.PRIVACY_POOLS,
						sending: inline`Deposits are supported.`,
						receiving: inline`Receiving needs no special support.`,
						spending: inline`Withdrawals use a relayer.`,
						notes: [],
					},
				],
			},
		)

		expect(merged.technologies.map(technology => technology.technology)).toEqual([
			PrivateTransferTechnology.RAILGUN,
			PrivateTransferTechnology.PRIVACY_POOLS,
		])
		expect(merged.technologies[0].notes).toEqual(details.technologies[0].notes)
	})
})

describe('securityAudits structured details', () => {
	const audit = (
		auditDate: CalendarDate,
		findings: SecurityAuditsDetails['audits'][number]['findings'],
	): SecurityAuditsDetails['audits'][number] => ({
		auditor: ackee,
		auditDate,
		variants: 'ALL_VARIANTS',
		findings,
		references: [refWithUrl('https://ackee.example/audit.pdf', 'Audit report')],
	})

	it('derives its summary from the audits it carries', () => {
		const details: SecurityAuditsDetails = {
			type: 'securityAudits',
			audits: [
				audit('2019-06-01', { kind: 'allFixed' }),
				audit('2020-01-02', {
					kind: 'flaws',
					flaws: [{ name: 'A flaw', severity: SecurityFlawSeverity.HIGH, status: 'NOT_FIXED' }],
				}),
			],
		}

		const summary = securityAuditsSummary(details)

		expect(summary).toContain('January 2, 2020')
		expect(summary).toContain('unaddressed security flaws')
	})

	it('formats the audit date in UTC, so it never shows the previous day', () => {
		expect(formatCalendarDate('2020-01-01')).toBe('January 1, 2020')
	})

	it('merging variants keeps every audit once and updates the summary', () => {
		const worst: SecurityAuditsDetails = {
			type: 'securityAudits',
			audits: [audit('2019-06-01', { kind: 'allFixed' })],
		}
		const merged = mergeSecurityAuditsDetails(worst, [
			worst,
			{ type: 'securityAudits', audits: [audit('2020-01-02', { kind: 'noneFound' })] },
		])

		expect(merged.audits.map(entry => entry.auditDate)).toEqual(['2019-06-01', '2020-01-02'])
		expect(securityAuditsSummary(merged)).toContain('last audited on January 2, 2020')
	})

	it('renders each audit with its findings and its own references in Markdown', () => {
		const details: StructuredDetails = {
			type: 'securityAudits',
			audits: [
				audit('2020-01-02', {
					kind: 'flaws',
					flaws: [
						{ name: 'A fixed flaw', severity: SecurityFlawSeverity.MEDIUM, status: 'FIXED' },
						{ name: 'A live flaw', severity: SecurityFlawSeverity.CRITICAL, status: 'NOT_FIXED' },
					],
				}),
			],
		}
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown).toContain('#### Audit by Ackee (January 2, 2020)')
		expect(markdown).toContain('The following security flaws were identified:')
		expect(markdown).toContain('- **Medium**: `A fixed flaw` (fixed)')
		expect(markdown).toContain('- **Critical**: `A live flaw` (not fixed)')
		expect(markdown).toContain('[Audit report](https://ackee.example/audit.pdf)')
	})

	it('states which variants a partial audit covered', () => {
		const details: StructuredDetails = {
			type: 'securityAudits',
			audits: [
				{
					...audit('2020-01-02', { kind: 'noneFound' }),
					variants: [Variant.MOBILE, Variant.BROWSER],
				},
			],
		}

		expect(renderStructuredDetailsMarkdown(details, context)).toContain(
			'This audit covered Mobile app and Browser extension.',
		)
	})

	it('describes every configured bug bounty fact', () => {
		const prose = bugBountySentences({
			availability: BugBountyProgramAvailability.ACTIVE,
			coverage: 'FULL_SCOPE',
			platform: BugBountyPlatform.HACKER_ONE,
			rewards: { minimum: 1000, maximum: 50000, currency: 'USD' },
			legalProtection: LegalProtectionType.SAFE_HARBOR,
			disclosureDays: 30,
			upgradePathAvailable: true,
			references: [],
		}).join('\n')

		expect(prose).toContain('all aspects')
		expect(prose).toContain('active')
		expect(prose).toContain('Hacker One')
		expect(prose).toContain('$1,000')
		expect(prose).toContain('$50,000')
		expect(prose).toContain('Safe Harbor')
		expect(prose).toContain('30 days')
		expect(prose).toContain('upgrade path')
	})

	it('serializes audits most recent first, with ISO dates', () => {
		const details: StructuredDetails = {
			type: 'securityAudits',
			audits: [
				audit('2019-06-01', { kind: 'allFixed' }),
				audit('2020-01-02', { kind: 'noneFound' }),
			],
		}
		const json = serializeStructuredDetails(details, context)

		expect(json).toEqual({
			type: 'securityAudits',
			audits: [
				{
					auditor: { id: 'ackee', name: 'Ackee' },
					auditDate: '2020-01-02',
					variants: 'ALL_VARIANTS',
					findings: 'NONE_FOUND',
					references: [
						{ urls: [{ label: 'Audit report', url: 'https://ackee.example/audit.pdf' }] },
					],
				},
				{
					auditor: { id: 'ackee', name: 'Ackee' },
					auditDate: '2019-06-01',
					variants: 'ALL_VARIANTS',
					findings: 'ALL_FIXED',
					references: [
						{ urls: [{ label: 'Audit report', url: 'https://ackee.example/audit.pdf' }] },
					],
				},
			],
		})
	})
})

function throwUnexpectedPolicyKind(): never {
	throw new Error('Fixture policy must be a secret-split policy')
}

describe('guardian-based details', () => {
	const policy: GuardianPolicyDetail = {
		description: ['The wallet splits the recovery secret across two providers.'],
		facts: {
			kind: 'secretSplit',
			requiredGuardians: [{ type: GuardianType.WALLET_PASSWORD }],
			optionalGuardians: [
				{ type: GuardianType.USER_EXTERNAL_ACCOUNT, description: 'Google account', entity: ackee },
				{ type: GuardianType.USER_EXTERNAL_ACCOUNT, description: 'Apple account', entity: ackee },
			],
			optionalGuardiansMinimumConfigurable: 1,
			optionalGuardiansMinimumNeededForRecovery: 1,
			secretReconstitution: 'CLIENT_SIDE',
		},
	}

	it('describes every guardian policy fact as structured blocks', () => {
		const blocks = guardianPolicyBlocks(policy)

		expect(blocks.map(block => block.kind)).toEqual([
			'paragraph',
			'paragraph',
			// The lead-in to a list is a paragraph of its own, so every adapter
			// lays it out the same way it lays out any other paragraph.
			'paragraph',
			'list',
			'paragraph',
			'paragraph',
		])
		const paragraphs = blocks.filter(block => block.kind === 'paragraph').map(block => block.text)

		expect(paragraphs.some(text => text.includes('wallet password'))).toBe(true)
		expect(paragraphs.some(text => text.includes('client-side'))).toBe(true)
		expect(
			blocks
				.filter(block => block.kind === 'list')
				.map(block => block.items.map(item => item.text)),
		).toEqual([["The user's Google account", "The user's Apple account"]])
	})

	const secretSplitFacts =
		policy.facts.kind === 'secretSplit' ? policy.facts : throwUnexpectedPolicyKind()

	it('states plainly when a policy needs no optional guardian', () => {
		const blocks = guardianPolicyBlocks({
			...policy,
			facts: { ...secretSplitFacts, optionalGuardians: [] },
		})

		expect(blocks).toContainEqual({
			kind: 'paragraph',
			text: 'The recovery process does not require setting up any other guardian.',
		})
	})

	it('account recovery reports the recovery dimension, with no dangling colon', () => {
		const details: StructuredDetails = {
			type: 'accountRecovery',
			guardianPolicy: policy,
			recoverableScenarios: [{ id: 'ok', scenario: 'User forgets their wallet password' }],
			unrecoverableScenarios: [
				{
					id: 'ko',
					scenario: 'User loses access to their Google account',
					consequence: 'Recovery is no longer possible.',
				},
			],
			drills: {
				configured: [
					{
						type: AccountRecoveryDrillType.SEED_PHRASE_QUIZ,
						reminderEveryNDays: 90,
						references: [refWithUrl('https://example.com/drills', 'Drill docs')],
					},
				],
				missing: [AccountRecoveryDrillType.GUARDIAN_ACCOUNT_CHECK],
			},
		}
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown).toContain(
			'Test Wallet implements a Guardian-based account recovery feature which does not pass all the tested scenarios.',
		)
		expect(markdown).toContain(
			'- **User loses access to their Google account**: Recovery is no longer possible.',
		)
		// A successful scenario introduces nothing, so it ends without a colon.
		expect(markdown).toContain('- **User forgets their wallet password**\n')
		expect(markdown).not.toContain('User forgets their wallet password**:')
		expect(markdown).toContain(
			'- seed phrase check-ups (every 90 days) ([Drill docs](https://example.com/drills))',
		)
		expect(markdown).toContain('- guardian account check-ups')
	})

	it('account recovery keeps drill references available for de-duplication', () => {
		const details: StructuredDetails = {
			type: 'accountRecovery',
			recoverableScenarios: [],
			unrecoverableScenarios: [],
			drills: {
				configured: [
					{
						type: AccountRecoveryDrillType.SEED_PHRASE_QUIZ,
						reminderEveryNDays: 90,
						references: [refWithUrl('https://example.com/drills', 'Drill docs')],
					},
				],
				missing: [],
			},
		}

		expect(structuredDetailsReferences(details)).toHaveLength(1)
	})

	it('account unruggability reports takeovers, not recovery failures', () => {
		const details: StructuredDetails = {
			type: 'accountUnruggability',
			guardianPolicy: policy,
			safeScenarios: [{ id: 'ok', scenario: 'User forgets their wallet password' }],
			takeoverScenarios: [
				{
					id: 'ko',
					scenario: 'Ackee turns evil or is compromised',
					consequence: 'Ackee can take over the account on their own.',
				},
			],
		}
		const markdown = renderStructuredDetailsMarkdown(details, context)

		expect(markdown).toContain('#### Account takeover scenarios')
		expect(markdown).toContain(
			'- **Ackee turns evil or is compromised**: Ackee can take over the account on their own.',
		)
		expect(markdown).not.toContain('Account recovery failure scenarios')
	})

	it('serializes guardian policy facts alongside the authored description', () => {
		const json = serializeStructuredDetails(
			{
				type: 'accountUnruggability',
				guardianPolicy: policy,
				safeScenarios: [],
				takeoverScenarios: [
					{ id: 'ko', scenario: 'A guardian turns evil', consequence: 'Rugged.' },
				],
			},
			context,
		)

		expect(json).toEqual({
			type: 'accountUnruggability',
			guardianPolicy: {
				description: ['The wallet splits the recovery secret across two providers.'],
				facts: {
					kind: 'secretSplit',
					requiredGuardians: [
						{ type: GuardianType.WALLET_PASSWORD, description: "The user's wallet password" },
					],
					optionalGuardians: [
						{
							type: GuardianType.USER_EXTERNAL_ACCOUNT,
							description: "The user's Google account",
							entityId: 'ackee',
						},
						{
							type: GuardianType.USER_EXTERNAL_ACCOUNT,
							description: "The user's Apple account",
							entityId: 'ackee',
						},
					],
					optionalGuardiansMinimumConfigurable: 1,
					optionalGuardiansMinimumNeededForRecovery: 1,
					secretReconstitution: 'CLIENT_SIDE',
				},
			},
			safeScenarios: [],
			takeoverScenarios: [{ id: 'ko', scenario: 'A guardian turns evil', consequence: 'Rugged.' }],
		})
	})
})

describe('published JSON schema', () => {
	/** One fixture per structured-details variant; every variant must validate. */
	const variants = {
		addressCorrelation: buildAddressCorrelationDetails([
			{
				info: PersonalInfo.EMAIL,
				by: ackee,
				refs: toFullyQualified(refWithUrl('https://ackee.example/policy', 'Ackee policy')),
			},
			{ info: WalletInfo.ACCOUNT_ADDRESS, by: 'onchain', refs: [] },
		]),
		chainVerification: {
			type: 'chainVerification',
			lightClients: [EthereumL1LightClient.helios],
		},
		funding: {
			type: 'funding',
			strategies: [{ strategy: MonetizationStrategy.DONATIONS, userAligned: true }],
			revenueBreakdownIsPublic: true,
		},
		privateTransfers: {
			type: 'privateTransfers',
			technologies: [
				{
					technology: PrivateTransferTechnology.PRIVACY_POOLS,
					sending: inline`Deposits are supported.`,
					receiving: inline`Receiving needs no special support.`,
					spending: inline`Withdrawals use ${inlineLink('a relayer', 'https://example.com/relayer')}.`,
					notes: [inline`The relayer may censor withdrawals.`],
				},
			],
			defaultModeNote: inline`Transfers are public by default.`,
		},
		securityAudits: {
			type: 'securityAudits',
			audits: [
				{
					auditor: ackee,
					auditDate: '2020-01-02',
					variants: 'ALL_VARIANTS',
					findings: {
						kind: 'flaws',
						flaws: [
							{ name: 'A live flaw', severity: SecurityFlawSeverity.CRITICAL, status: 'NOT_FIXED' },
						],
					},
					references: [refWithUrl('https://ackee.example/audit.pdf', 'Audit report')],
				},
			],
			bugBounty: {
				availability: BugBountyProgramAvailability.INACTIVE,
				coverage: [CoverageBreadth.APP_ONLY],
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: { minimum: 5000, maximum: 5000, currency: 'USD' },
				legalProtection: LegalProtectionType.LEGAL_ASSURANCE,
				disclosureDays: 90,
				upgradePathAvailable: true,
				references: [refWithUrl('https://ackee.example/bounty', 'Bounty page')],
			},
		},
		accountRecovery: {
			type: 'accountRecovery',
			guardianPolicy: {
				description: ['The wallet splits the recovery secret across two providers.'],
				facts: {
					kind: 'secretSplit',
					requiredGuardians: [],
					optionalGuardians: [
						{
							type: GuardianType.USER_EXTERNAL_ACCOUNT,
							description: 'Google account',
							entity: ackee,
						},
					],
					optionalGuardiansMinimumConfigurable: 1,
					optionalGuardiansMinimumNeededForRecovery: 1,
					secretReconstitution: ackee,
				},
			},
			recoverableScenarios: [{ id: 'ok', scenario: 'User forgets their wallet password' }],
			unrecoverableScenarios: [],
			drills: {
				configured: [
					{
						type: AccountRecoveryDrillType.SEED_PHRASE_QUIZ,
						reminderEveryNDays: 90,
						references: [refWithUrl('https://example.com/drills', 'Drill docs')],
					},
				],
				missing: [AccountRecoveryDrillType.GUARDIAN_ACCOUNT_CHECK],
			},
		},
		accountUnruggability: {
			type: 'accountUnruggability',
			safeScenarios: [{ id: 'ok', scenario: 'User forgets their wallet password' }],
			takeoverScenarios: [],
		},
		scamPrevention: {
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
		transactionInclusion: {
			type: 'transactionInclusion',
			l1Broadcast: 'OWN_NODE',
			l2s: [{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'ARBITRARY_TRANSACTIONS' }],
			l1References: 'https://example.com/l1',
		},
	} satisfies StructuredDetailsByType

	for (const details of Object.values(variants)) {
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
