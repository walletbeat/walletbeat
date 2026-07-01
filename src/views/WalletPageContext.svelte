<script lang="ts">
	import { allRatedWalletsBySlug, attributeTreeForWallet } from '@/data/wallets'
	import { allWalletLadders } from '@/schema/ladders'
	import WalletPage from './WalletPage.svelte'

	const {
		walletId,
		showStage = true,
		showScores = false,
	}: {
		walletId: string,
		showStage?: boolean,
		showScores?: boolean,
	} = $props()

	const wallet = $derived.by(() => {
		const value = allRatedWalletsBySlug[walletId]

		if(!value) {
			throw new Error(`Unknown wallet ID: ${walletId}`)
		}

		return value
	})

	const attributeTree = $derived(attributeTreeForWallet(wallet))
</script>

<WalletPage
	ladders={allWalletLadders}
	{attributeTree}
	{wallet}
	{showStage}
	{showScores}
/>
