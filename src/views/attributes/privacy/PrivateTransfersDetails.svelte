<script lang="ts">
	// Types/constants
	import type { PrivateTransfersDetails } from '@/types/content/details/private-transfers'
	import { privateTransferTechnologyName } from '@/types/content/details/private-transfers'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<PrivateTransfersDetails> = $props()

	// Components
	import InlineTextView from '@/views/attributes/InlineTextView.svelte'
</script>


{#if details.defaultModeNote}
	<p><InlineTextView inline={details.defaultModeNote} {context} /></p>
{/if}

{#each details.technologies as technology (technology.technology)}
	<section data-column="gap-4">
		<h4>{privateTransferTechnologyName[technology.technology]}</h4>

		<div data-column="gap-3">
			<div>
				<strong>Sending:</strong>
				<InlineTextView inline={technology.sending} {context} />
			</div>

			<div>
				<strong>Receiving:</strong>
				<InlineTextView inline={technology.receiving} {context} />
			</div>

			<div>
				<strong>Spending:</strong>
				<InlineTextView inline={technology.spending} {context} />
			</div>

			{#if technology.notes.length > 0}
				<div data-column="gap-2">
					{#each technology.notes as note, index (index)}
						<p><InlineTextView inline={note} {context} /></p>
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/each}
