import type { ReferenceInput } from '@/schema/reference'

export type ScamWarningKind =
	'sendTransaction' | 'contractTransaction' | 'scamUrl' | 'unlimitedApproval'

export interface ScamWarningDetail {
	kind: ScamWarningKind

	/** Complete sentence containing a `{{WALLET_NAME}}` placeholder. */
	description: string

	items?: string[]

	conclusion?: string

	references?: ReferenceInput
}

export interface ScamPreventionDetails {
	type: 'scamPrevention'
	warnings: ScamWarningDetail[]
}
