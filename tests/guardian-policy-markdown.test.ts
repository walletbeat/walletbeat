import { micromark } from 'micromark'
import { describe, expect, it } from 'vitest'

import { exampleCex, exampleWalletDevelopmentCompany } from '@/data/entities/example'
import {
	guardianPolicyMarkdown,
	type GuardianPolicySecretSplitAcrossGuardians,
	GuardianPolicyType,
	GuardianType,
} from '@/schema/features/security/account-recovery'

const policy = (
	overrides: Partial<GuardianPolicySecretSplitAcrossGuardians> = {},
): GuardianPolicySecretSplitAcrossGuardians => ({
	type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
	descriptionMarkdown: 'Example policy.',
	requiredGuardians: [
		{ type: GuardianType.WALLET_PASSWORD },
		{
			type: GuardianType.WALLET_PROVIDER,
			entity: exampleWalletDevelopmentCompany,
			description: 'Example data store service',
		},
	],
	optionalGuardians: [
		{
			type: GuardianType.USER_EXTERNAL_ACCOUNT,
			description: 'Example account',
			entity: exampleCex,
		},
		{ type: GuardianType.PASSKEY },
	],
	optionalGuardiansMinimumConfigurable: 1,
	optionalGuardiansMinimumNeededForRecovery: 1,
	secretReconstitution: 'CLIENT_SIDE',
	...overrides,
})

/** @returns The text of each `<li>` in the rendered HTML. */
const listItems = (html: string): string[] =>
	Array.from(html.matchAll(/<li>([\s\S]*?)<\/li>/g), match =>
		match[1].trim().replaceAll('&#x27;', "'"),
	)

describe('guardianPolicyMarkdown', () => {
	it('keeps each list item separate from the paragraph that follows it', () => {
		const html = micromark(guardianPolicyMarkdown(policy()))

		expect(listItems(html)).toEqual([
			"The user's wallet password",
			'Example data store service',
			"The user's Example account",
			"The user's passkey device",
		])
		expect(html).toContain('<p>The recovery process requires setting up recovery')
		expect(html).toContain('<p>For evaluation purposes')
		expect(html).toContain('<p>The key is reconstituted <strong>client-side</strong>.</p>')
	})

	it('keeps the "at least N" note out of the optional guardian list', () => {
		const html = micromark(
			guardianPolicyMarkdown(
				policy({
					optionalGuardiansMinimumConfigurable: 2,
					optionalGuardiansMinimumNeededForRecovery: 1,
				}),
			),
		)

		expect(html).toContain('<p>At least 1 of the above are required for recovery.</p>')
		expect(listItems(html).every(item => !item.includes('At least'))).toBe(true)
	})
})
