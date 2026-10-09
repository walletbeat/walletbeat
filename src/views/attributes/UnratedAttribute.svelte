<script lang="ts">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import { getWalletDataFileUrl } from '@/utils/urls'


	// Props
	const {
		wallet,
	}: {
		wallet: RatedWallet<string>
	} = $props()

	const githubUrl = $derived(getWalletDataFileUrl(wallet))


	// Components
	import Typography from '@/components/Typography.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: `Walletbeat's database does not have the necessary information on **{{WALLET_NAME}}** to assess this question. Please help us by contributing your knowledge on our [GitHub repository](${githubUrl})!`
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>
