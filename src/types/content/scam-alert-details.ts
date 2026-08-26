import type { ReferenceInput } from '@/schema/reference'

/** Which scam-prevention warning a detail describes. */
export type ScamWarningKind =
	'sendTransaction' | 'contractTransaction' | 'scamUrl' | 'unlimitedApproval'

/** Format-neutral content for one scam-prevention warning. */
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

	/** Optional list displayed between the description and conclusion. */
	items?: string[]

	/** Optional sentence displayed after the description and list. */
	conclusion?: string

	references?: ReferenceInput
}

/** Canonical detailed content produced by the scam-prevention attribute. */
export interface ScamPreventionDetails {
	type: 'scamPrevention'
	warnings: ScamWarningDetail[]
}
