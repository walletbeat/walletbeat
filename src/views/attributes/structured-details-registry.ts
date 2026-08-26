import type { Component } from 'svelte'

import type { StructuredDetailsByType, StructuredDetailsType } from '@/types/content/details'
import type { StructuredDetailsContext } from '@/utils/structured-details/context'
import ChainVerificationDetails from '@/views/attributes/security/ChainVerificationDetails.svelte'
import ScamAlertDetails from '@/views/attributes/security/ScamAlertDetails.svelte'

/** Props every structured-details view receives. */
export interface StructuredDetailsViewProps<_Details> {
	details: _Details
	context: StructuredDetailsContext
}

/**
 * Exhaustive web renderer registry.
 *
 * Adding a member to `StructuredDetailsByType` without adding its view here is
 * a compile error. This registry is bundled for the browser only; the Markdown
 * and JSON registries live separately so their dependencies stay server-side.
 */
export const structuredDetailsViews: {
	[_Type in StructuredDetailsType]: {
		view: Component<StructuredDetailsViewProps<StructuredDetailsByType[_Type]>>

		/**
		 * Whether the view renders the model's claim-level references itself.
		 * When it does, the wallet page omits the flat evaluation reference list
		 * so each reference is displayed exactly once.
		 */
		rendersOwnReferences: boolean
	}
} = {
	chainVerification: { view: ChainVerificationDetails, rendersOwnReferences: false },
	scamPrevention: { view: ScamAlertDetails, rendersOwnReferences: true },
}

/** Whether the view for these details renders their references itself. */
export function structuredDetailsRendersOwnReferences(type: StructuredDetailsType): boolean {
	return structuredDetailsViews[type].rendersOwnReferences
}
