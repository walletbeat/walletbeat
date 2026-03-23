<script lang="ts">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'


	// Props
	const {
		wallet,
	}: {
		wallet: RatedWallet
	} = $props()

	const githubUrl = $derived(
		`https://github.com/walletbeat/walletbeat/tree/beta/data/${
			wallet.types.SOFTWARE ?
				'software-wallets'
			: wallet.types.HARDWARE ?
				'hardware-wallets'
			: wallet.types.EMBEDDED ?
				'embedded-wallets'
			:
				''
		}/${wallet.metadata.id}.ts`
	)


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
