<script lang="ts">
	// Types/constants
	import { monetizationStrategyName } from '@/schema/features/transparency/monetization'
	import { ContentType } from '@/types/content'
	import type { FundingDetails } from '@/types/content/details/funding'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<FundingDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'

	const sources = $derived(
		details.strategies.length === 0 ?
			'unknown sources'
		:
			details.strategies.map(({ strategy }) => monetizationStrategyName(strategy)).join(', ')
	)
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: `**{{WALLET_NAME}}** is funded by **${sources}**.`
	}}
	strings={context.strings}
/>
