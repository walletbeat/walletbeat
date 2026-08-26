<script lang="ts">
	// Types/constants
	import { ContentType } from '@/types/content'
	import type { FundingDetails } from '@/types/content/details/funding'
	import { fundingSentence } from '@/utils/structured-details/prose'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<FundingDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: fundingSentence(details),
	}}
	strings={context.strings}
/>
