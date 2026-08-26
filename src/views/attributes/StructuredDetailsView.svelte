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
