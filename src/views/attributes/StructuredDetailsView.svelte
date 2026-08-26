<script lang="ts">
	// Types/constants
	import type { StructuredDetails } from '@/types/content/details'
	import type { StructuredDetailsContext } from '@/utils/structured-details/context'
	import { structuredDetailsViews } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: {
		details: StructuredDetails
		context: StructuredDetailsContext
	} = $props()

	// The single web entry point for canonical structured details.
	// Layout, badges and interactions belong to the per-type views below.
	const View = $derived(structuredDetailsViews[details.type].view)
</script>

<div data-column>
	<View {details} {context} />
</div>
