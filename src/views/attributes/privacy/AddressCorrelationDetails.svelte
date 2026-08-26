<script lang="ts">
	// Types/constants
	import { ContentType } from '@/types/content'
	import type { AddressCorrelationDetails } from '@/types/content/address-correlation-details'
	import {
		addressCorrelationIntro,
		addressCorrelationLeakSentence,
	} from '@/utils/structured-details/prose'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<AddressCorrelationDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: addressCorrelationIntro,
	}}
	strings={context.strings}
/>

<ul data-list="gap-2">
	{#each details.leaks as leak (leak.source.kind === 'entity' ? leak.source.entity.id : 'onchain')}
		<li data-list-item="gap-1">
			<Typography
				content={{
					contentType: ContentType.MARKDOWN,
					markdown: addressCorrelationLeakSentence(leak),
				}}
				strings={context.strings}
			/>

			{#if leak.references.length > 0}
				<ReferenceLinks references={leak.references} />
			{/if}
		</li>
	{/each}
</ul>
