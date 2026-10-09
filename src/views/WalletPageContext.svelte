<script lang="ts">
	import { allRatedWalletsBySlug, attributeTreeForWallet } from '@/data/wallets'
	import { allWalletLadders } from '@/schema/ladders'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import WalletPage from './WalletPage.svelte'

	const {
		walletId,
		showStage = true,
		showScores = false,
		codeSnippets = {},
	}: {
		walletId: string,
		showStage?: boolean,
		showScores?: boolean,
		// Only the stored code snippets this wallet's page references, resolved
		// at build time (see `codeSnippetsReferencedBy`).
		codeSnippets?: CodeSnippetIndex,
	} = $props()

	setCodeSnippetContext(() => codeSnippets)

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
