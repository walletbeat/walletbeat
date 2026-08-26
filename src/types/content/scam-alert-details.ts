import type { ReferenceInput } from '@/schema/reference'

export type ScamWarningKind =
	'sendTransaction' | 'contractTransaction' | 'scamUrl' | 'unlimitedApproval'

export interface ScamWarningDetail {
	kind: ScamWarningKind

	/**
	 * Complete sentence containing a `{{WALLET_NAME}}` placeholder.
	 *
	 * Carries light Markdown emphasis, like the shared sentences in `prose.ts`.
	 * Unlike other models this one stores its prose rather than the data behind
	 * it, so the emphasis cannot live in `prose.ts`.
	 */
	description: string

	items?: string[]

	conclusion?: string

	references?: ReferenceInput
}

export interface ScamPreventionDetails {
	type: 'scamPrevention'
	warnings: ScamWarningDetail[]
}
