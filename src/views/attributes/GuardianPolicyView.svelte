<script lang="ts">
	// Types/constants
	import { ContentType } from '@/types/content'
	import {
		type GuardianPolicyDetail,
		guardianPolicyBlocks,
	} from '@/types/content/guardian-policy'
	import type { StructuredDetailsContext } from '@/utils/structured-details/context'

	// Props
	const {
		policy,
		context,
	}: {
		policy: GuardianPolicyDetail
		context: StructuredDetailsContext
	} = $props()

	// (Derived)
	const blocks = $derived(guardianPolicyBlocks(policy))

	// Components
	import Typography from '@/components/Typography.svelte'
</script>


{#each blocks as block, index (index)}
	{#if block.kind === 'paragraph'}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: block.text,
			}}
			strings={context.strings}
		/>
	{:else}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: block.lead,
			}}
			strings={context.strings}
		/>
		<ul>
			{#each block.items as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	{/if}
{/each}
