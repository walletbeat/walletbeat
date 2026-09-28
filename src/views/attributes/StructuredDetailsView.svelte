<script lang="ts">
	// Types/constants
	import type { Component } from 'svelte'
	import type {
		StructuredDetails,
		StructuredDetailsByType,
		StructuredDetailsType,
	} from '@/types/content/structured-details'
	import type { StructuredDetailsContext } from '@/utils/structured-details/context'
	import {
		structuredDetailsViews,
		type StructuredDetailsViewProps,
	} from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: {
		details: StructuredDetails
		context: StructuredDetailsContext
	} = $props()

	function viewFor<_Type extends StructuredDetailsType>(
		type: _Type,
	): Component<StructuredDetailsViewProps<StructuredDetailsByType[_Type]>> {
		return structuredDetailsViews[type]
	}

	const View = $derived.by(() => {
		const view = viewFor(details.type)

		if (view === undefined) {
			throw new Error(`No view for structured details type: ${String(details.type)}`)
		}

		return view
	})
</script>

<div data-column>
	<View {details} {context} />
</div>
