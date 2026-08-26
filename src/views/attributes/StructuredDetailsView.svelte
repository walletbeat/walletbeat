<script lang="ts">
	// Types/constants
	import type { StructuredDetails } from '@/types/content/structured-details'
	import type { StructuredDetailsContext } from '@/utils/structured-details/context'
	import { structuredDetailsViews } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: {
		details: StructuredDetails
		context: StructuredDetailsContext
	} = $props()

	// The single web entry point for canonical structured details.
	// Layout, badges and interactions belong to the per-type views below.
	// An unknown discriminator throws rather than rendering nothing, matching
	// the Markdown and JSON adapters: a detail must never silently disappear.
	const View = $derived.by(() => {
		const view = structuredDetailsViews[details.type]

		if (view === undefined) {
			throw new Error(`No view for structured details type: ${String(details.type)}`)
		}

		return view
	})
</script>

<div data-column>
	<View {details} {context} />
</div>
