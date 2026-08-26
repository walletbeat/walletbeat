<script lang="ts">
	// Types/constants
	import { ContentType } from '@/types/content'
	import type { ChainVerificationDetails } from '@/types/content/chain-verification-details'
	import { chainVerificationSentence } from '@/utils/structured-details/prose'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<ChainVerificationDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: chainVerificationSentence(details),
	}}
	strings={context.strings}
/>
