<script lang="ts">
	// Types/constants
	import { toFullyQualified } from '@/schema/reference'
	import { ContentType } from '@/types/content'
	import type { TransactionInclusionDetails } from '@/types/content/details/transaction-inclusion'
	import { transactionInclusionProse } from '@/utils/structured-details/prose'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<TransactionInclusionDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'

	const blocks = $derived(transactionInclusionProse(details))
	const references = $derived(
		toFullyQualified([
			...toFullyQualified(details.l2References),
			...toFullyQualified(details.l1References),
		])
	)
</script>


{#each blocks as block (block)}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: block,
		}}
		strings={context.strings}
	/>
{/each}

{#if references.length > 0}
	<ReferenceLinks references={references} />
{/if}
