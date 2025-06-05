<script lang="ts">
	// Types/constants
	import type { SourceVisibilityValue } from '@/schema/attributes/transparency/source-visibility'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'


	// Props
	let {
		wallet,
		value,
	}: {
		wallet: RatedWallet
		value: SourceVisibilityValue
	} = $props()


	// Components
	import Typography from '@/ui/atoms/Typography.svelte'
</script>

<Typography 
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: (
			wallet.metadata.repoUrl === null ?
				'Source code visibility information is not available.'
			:
				`The source code for **{{WALLET_NAME}}** is publicly viewable here.`
		)
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>

{#if wallet.metadata.repoUrl !== null}
	<a 
		href={typeof wallet.metadata.repoUrl === 'string' ? wallet.metadata.repoUrl : wallet.metadata.repoUrl.url}
		target="_blank"
		rel="noopener noreferrer"
		class="repo-link"
	>
		View Source Code
	</a>
{/if}


<style>
	.repo-link {
		margin-top: 0.5rem;
		display: inline-block;
	}
</style> 