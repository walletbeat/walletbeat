import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import { ackee } from '@/data/entities/ackee'
import { PersonalInfo } from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { AccountRecoveryDrillType, GuardianType } from '@/schema/features/security/account-recovery'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import { toFullyQualified } from '@/schema/reference'
import type { StructuredDetails } from '@/types/content/details'
import { buildAddressCorrelationDetails } from '@/types/content/details/address-correlation'
import { inline, inlineCode, inlineLink } from '@/types/content/details/inline'
import type { StructuredDetailsContext } from '@/utils/structured-details/context'
import StructuredDetailsView from '@/views/attributes/StructuredDetailsView.svelte'

/**
 * Semantic assertions on the web adapter's server-rendered output.
 *
 * These check what a reader ends up with — the resolved wallet name, the
 * links, the claim references — rather than the markup around it, so styling
 * changes do not break them.
 */

const context: StructuredDetailsContext = {
	strings: {
		WALLET_NAME: 'Test Wallet',
		WALLET_PSEUDONYM_SINGULAR: 'pseudonym',
		WALLET_PSEUDONYM_PLURAL: 'pseudonyms',
	},
}

function renderDetails(details: StructuredDetails): string {
	return render(StructuredDetailsView, { props: { details, context } }).body
}

describe('structured details web adapter', () => {
	it('dispatches on the discriminator and resolves the wallet name', () => {
		expect(
			renderDetails({
				type: 'funding',
				strategies: [],
				revenueBreakdownIsPublic: false,
			}),
		).toContain('Test Wallet')
	})

	it('throws rather than guessing when handed an unknown discriminator', () => {
		expect(() => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Deliberately invalid, to check the adapter refuses it.
			renderDetails({ type: 'notAVariant' } as unknown as StructuredDetails)
		}).toThrow()
	})

	it('renders each address-correlation source with its own references', () => {
		const body = renderDetails(
			buildAddressCorrelationDetails([
				{
					info: PersonalInfo.EMAIL,
					by: ackee,
					refs: toFullyQualified({
						urls: [{ label: 'Ackee policy', url: 'https://ackee.example/policy' }],
					}),
				},
			]),
		)

		expect(body).toContain('email address')
		expect(body).toContain('https://ackee.example/policy')
	})

	it('renders private transfer inline spans as links and code, not as markup text', () => {
		const body = renderDetails({
			type: 'privateTransfers',
			technologies: [
				{
					technology: PrivateTransferTechnology.RAILGUN,
					sending: inline`Shielding is direct.`,
					receiving: inline`Syncing is local.`,
					spending: inline`Spending uses ${inlineLink('a broadcaster', 'https://example.com/b')} and a ${inlineCode('0zk')} address.`,
					notes: [],
				},
			],
		})

		expect(body).toContain('Railgun')
		expect(body).toContain('href="https://example.com/b"')
		expect(body).toContain('<code>0zk</code>')
		expect(body).not.toContain('[a broadcaster]')
	})

	it('shows a security audit with its findings and reference', () => {
		const body = renderDetails({
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
					references: toFullyQualified({
						urls: [{ label: 'Audit report', url: 'https://ackee.example/audit.pdf' }],
					}),
				},
			],
		})

		expect(body).toContain('Ackee')
		// The date is formatted in UTC, so it never slips to the previous day.
		expect(body).toContain('January 2, 2020')
		expect(body).toContain('A live flaw')
		expect(body).toContain('https://ackee.example/audit.pdf')
	})

	it('introduces nothing after a scenario that passed', () => {
		const body = renderDetails({
			type: 'accountRecovery',
			guardianPolicy: {
				description: ['The secret is split across guardians.'],
				facts: {
					kind: 'secretSplit',
					requiredGuardians: [],
					optionalGuardians: [{ type: GuardianType.WALLET_PASSWORD }],
					optionalGuardiansMinimumConfigurable: 1,
					optionalGuardiansMinimumNeededForRecovery: 1,
					secretReconstitution: 'CLIENT_SIDE',
				},
			},
			recoverableScenarios: [{ id: 'ok', scenario: 'User forgets their wallet password' }],
			unrecoverableScenarios: [],
			drills: {
				configured: [
					{
						type: AccountRecoveryDrillType.SEED_PHRASE_QUIZ,
						reminderEveryNDays: 90,
						references: toFullyQualified({
							urls: [{ label: 'Drill docs', url: 'https://example.com/drills' }],
						}),
					},
				],
				missing: [],
			},
		})

		expect(body).toContain('User forgets their wallet password')
		expect(body).not.toContain('User forgets their wallet password</strong>:')
		expect(body).toContain('seed phrase check-ups')
		expect(body).toContain('https://example.com/drills')
	})

	it('reports takeovers, not recovery failures, for account unruggability', () => {
		const body = renderDetails({
			type: 'accountUnruggability',
			safeScenarios: [],
			takeoverScenarios: [
				{
					id: 'ko',
					scenario: 'Ackee turns evil or is compromised',
					consequence: 'Ackee can take over the account on their own.',
				},
			],
		})

		expect(body).toContain('Account takeover scenarios')
		expect(body).toContain('Ackee can take over the account on their own.')
		expect(body).not.toContain('Account recovery failure scenarios')
	})
})
