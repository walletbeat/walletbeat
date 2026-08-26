import type { Entity } from '@/schema/entity'
import type { Guardian, GuardianPolicy } from '@/schema/features/security/account-recovery'
import { guardianMarkdown, GuardianPolicyType } from '@/schema/features/security/account-recovery'
import { commaListFormat } from '@/types/utils/text'

/**
 * The semantic facts of a wallet's guardian policy.
 *
 * Both account recovery and account unruggability describe the same policy, so
 * they share this model: whichever dimension an attribute reports on, the
 * policy itself reads the same everywhere.
 */
export type GuardianPolicyFacts =
	| {
			kind: 'secretSplit'
			requiredGuardians: Guardian[]
			optionalGuardians: Guardian[]
			optionalGuardiansMinimumConfigurable: number
			optionalGuardiansMinimumNeededForRecovery: number
			secretReconstitution: 'CLIENT_SIDE' | Entity
	  }
	| {
			kind: 'kOfNWithTimelock'
			configuredGuardians: Guardian[]
			requiredGuardians: Guardian[]
			timelockWarningSentByAllOf: Entity[]
			minimumSignaturesWithTimelock: number
			minimumSignaturesBypassTimelock: number
	  }

export interface GuardianPolicyDetail {
	/** The wallet's authored description, one entry per paragraph, markup-free. */
	description: string[]

	facts: GuardianPolicyFacts
}

export function buildGuardianPolicyDetail(policy: GuardianPolicy): GuardianPolicyDetail {
	return {
		description: policyParagraphs(policy.description),
		facts:
			policy.type === GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS
				? {
						kind: 'secretSplit',
						requiredGuardians: policy.requiredGuardians,
						optionalGuardians: policy.optionalGuardians,
						optionalGuardiansMinimumConfigurable: policy.optionalGuardiansMinimumConfigurable,
						optionalGuardiansMinimumNeededForRecovery:
							policy.optionalGuardiansMinimumNeededForRecovery,
						secretReconstitution: policy.secretReconstitution,
					}
				: {
						kind: 'kOfNWithTimelock',
						configuredGuardians: policy.configuredGuardians,
						requiredGuardians: policy.requiredGuardians,
						timelockWarningSentByAllOf: policy.timelockWarningSentByAllOf,
						minimumSignaturesWithTimelock: policy.minimumSignaturesWithTimelock,
						minimumSignaturesBypassTimelock: policy.minimumSignaturesBypassTimelock,
					},
	}
}

function policyParagraphs(description: string): string[] {
	return description
		.split(/\n\s*\n/u)
		.map(paragraph => paragraph.trim().replaceAll(/\s+/gu, ' '))
		.filter(paragraph => paragraph !== '')
}

export type GuardianPolicyBlock =
	{ kind: 'paragraph'; text: string } | { kind: 'list'; lead: string; items: string[] }

function guardianLabel(guardian: Guardian): string {
	return guardianMarkdown(guardian)
}

function secretReconstitutionParagraph(
	reconstitution: 'CLIENT_SIDE' | Entity,
): GuardianPolicyBlock {
	return {
		kind: 'paragraph',
		text:
			reconstitution === 'CLIENT_SIDE'
				? 'The key is reconstituted **client-side**.'
				: `The key is reconstituted on infrastructure **owned by ${reconstitution.name}**.`,
	}
}

export function guardianPolicyBlocks(policy: GuardianPolicyDetail): GuardianPolicyBlock[] {
	const blocks: GuardianPolicyBlock[] = policy.description.map(text => ({
		kind: 'paragraph' as const,
		text,
	}))

	if (policy.facts.kind === 'secretSplit') {
		const {
			requiredGuardians,
			optionalGuardians,
			optionalGuardiansMinimumConfigurable,
			optionalGuardiansMinimumNeededForRecovery,
			secretReconstitution,
		} = policy.facts

		if (requiredGuardians.length > 0) {
			blocks.push(
				listOrSentence(
					'The recovery process **critically depends** on',
					requiredGuardians.map(guardianLabel),
				),
			)
		}

		// A wallet may require no optional guardian at all; saying so is more
		// useful than an empty list, which the previous helper threw on.
		blocks.push(
			optionalGuardians.length === 0
				? {
						kind: 'paragraph',
						text: 'The recovery process does not require setting up any other guardian.',
					}
				: listOrSentence(
						`The recovery process requires setting up recovery with at least ${optionalGuardiansMinimumConfigurable.toString()} of the following:`,
						optionalGuardians.map(guardianLabel),
					),
		)

		if (optionalGuardiansMinimumConfigurable !== optionalGuardiansMinimumNeededForRecovery) {
			blocks.push({
				kind: 'paragraph',
				text: `At least ${optionalGuardiansMinimumNeededForRecovery.toString()} of the above are required for recovery.`,
			})
		}

		blocks.push({
			kind: 'paragraph',
			text: `For evaluation purposes, Walletbeat assumes the user will use the policy requiring the _least amount of effort_ that the wallet allows, i.e. ${
				optionalGuardiansMinimumConfigurable === 1
					? 'a single recovery guardian'
					: `${optionalGuardiansMinimumConfigurable.toString()} recovery guardians`
			}.`,
		})
		blocks.push(secretReconstitutionParagraph(secretReconstitution))

		return blocks
	}

	const {
		configuredGuardians,
		requiredGuardians,
		timelockWarningSentByAllOf,
		minimumSignaturesWithTimelock,
		minimumSignaturesBypassTimelock,
	} = policy.facts

	blocks.push(
		listOrSentence(
			`Recovery requires the approval of at least ${minimumSignaturesWithTimelock.toString()} of the following guardians:`,
			configuredGuardians.map(guardianLabel),
		),
	)

	if (requiredGuardians.length > 0) {
		blocks.push(
			listOrSentence(
				'The recovery process **critically depends** on',
				requiredGuardians.map(guardianLabel),
			),
		)
	}

	blocks.push({
		kind: 'paragraph',
		text:
			minimumSignaturesBypassTimelock === minimumSignaturesWithTimelock
				? 'There is no way to bypass the timelock delay.'
				: `The timelock delay may be bypassed with the approval of at least ${minimumSignaturesBypassTimelock.toString()} guardians.`,
	})

	if (timelockWarningSentByAllOf.length > 0) {
		blocks.push({
			kind: 'paragraph',
			text: `During the timelock delay, the user is warned by ${commaListFormat(
				timelockWarningSentByAllOf.map(entity => `**${entity.name}**`),
			)}.`,
		})
	}

	return blocks
}

function listOrSentence(lead: string, items: string[]): GuardianPolicyBlock {
	const [first] = items

	if (items.length === 1 && first !== undefined) {
		const sentence = lead.endsWith(':') ? `${lead.slice(0, -1)}: ${first}.` : `${lead} ${first}.`

		return { kind: 'paragraph', text: sentence }
	}

	return { kind: 'list', lead: lead.endsWith(':') ? lead : `${lead} the following:`, items }
}
