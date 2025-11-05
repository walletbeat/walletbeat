<script lang="ts">
	// Types/constants
	import type { Value } from '@/schema/attributes'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'


	// Props
	// eslint-disable-next-line svelte/no-unused-props -- Consistent prop types for all content components.
	const {
		wallet,
	}: {
		wallet: RatedWallet
		value: Value
	} = $props()


	// Components
	import Typography from '@/components/Typography.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: `Walletbeat's database does not have the necessary information on **{{WALLET_NAME}}** to assess this question.

Please help us by contributing your knowledge on our repository!`
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>

<a href="https://github.com/walletbeat/walletbeat" target="_blank" rel="noopener noreferrer" class="repo-link">
	GitHub Repository
</a>


<style>
	.repo-link {
		margin-top: 0.5rem;
		display: inline-block;
	}
</style>
