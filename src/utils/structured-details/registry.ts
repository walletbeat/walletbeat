import type {
	StructuredDetails,
	StructuredDetailsByType,
	StructuredDetailsType,
} from '@/types/content/details'

import type { StructuredDetailsContext } from './context'

/**
 * An exhaustive set of renderers, one per canonical structured detail type.
 *
 * Each adapter (web, Markdown, JSON) declares its own registry of this shape
 * and bundles separately, so adding a member to `StructuredDetailsByType`
 * fails compilation in every adapter that does not handle it, and no adapter
 * drags another adapter's dependencies into its bundle.
 */
export type StructuredDetailsRenderers<_Result> = {
	[_Type in StructuredDetailsType]: (
		details: StructuredDetailsByType[_Type],
		context: StructuredDetailsContext,
	) => _Result
}

/**
 * Look up and run the handler for these details.
 *
 * Throws on an unknown discriminator rather than falling back: a missing
 * handler is a programming error, not a rendering state.
 */
export function dispatchStructuredDetails<_Result>(
	renderers: StructuredDetailsRenderers<_Result>,
	details: StructuredDetails,
	context: StructuredDetailsContext,
): _Result {
	const renderer: unknown = renderers[details.type]

	if (typeof renderer !== 'function') {
		throw new Error(`No handler for structured details type: ${String(details.type)}`)
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The registry is keyed by the discriminator, so the looked-up handler accepts exactly these details.
	const typedRenderer = renderer as (
		details: StructuredDetails,
		context: StructuredDetailsContext,
	) => _Result

	return typedRenderer(details, context)
}
