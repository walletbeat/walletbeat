<script lang="ts">
	import type { HardwareModelSummary } from '@/data/hardware-wallets'
	import { attributeTreeForWallet, rateWalletOfType, type WalletOfType } from '@/data/wallet-rating'
	import { allWalletLadders } from '@/schema/ladders'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import WalletPage from './WalletPage.svelte'

	// The page passes this wallet's unrated data and the hardware model list
	// as props, and the wallet is rated here. Importing them from `@/data`
	// instead would ship every wallet's data to every wallet page.
	const {
		walletOfType,
		hardwareModels,
		showStage = true,
		showScores = false,
		codeSnippets = {},
	}: {
		walletOfType: WalletOfType,
		hardwareModels: HardwareModelSummary[],
		showStage?: boolean,
		showScores?: boolean,
		// Only the stored code snippets this wallet's page references, resolved
		// at build time (see `codeSnippetsReferencedBy`).
		codeSnippets?: CodeSnippetIndex,
	} = $props()

	setCodeSnippetContext(() => codeSnippets)

	const wallet = $derived(rateWalletOfType(walletOfType))

	const attributeTree = $derived(attributeTreeForWallet(wallet))
</script>

<WalletPage
	ladders={allWalletLadders}
	{attributeTree}
	{wallet}
	allHardwareModels={hardwareModels}
	{showStage}
	{showScores}
/>
