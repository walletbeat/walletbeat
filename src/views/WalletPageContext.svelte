<script lang="ts">
	import type { ImageMetadata } from 'astro'
	import type { HardwareModelSummary } from '@/data/hardware-wallets'
	import { attributeTreeForWallet, rateWalletOfType, type WalletOfType } from '@/data/wallet-rating'
	import { allWalletLadders } from '@/schema/ladders'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import WalletPage from './WalletPage.svelte'

	const {
		walletIcon,
		walletOfType,
		hardwareModels,
		showStage = true,
		showScores = false,
		codeSnippets = {},
	}: {
		walletIcon: ImageMetadata,
		walletOfType: WalletOfType,
		hardwareModels: HardwareModelSummary[],
		showStage?: boolean,
		showScores?: boolean,
		// The stored code snippets this wallet's data references (see `codeSnippetsForWallet`).
		codeSnippets?: CodeSnippetIndex,
	} = $props()

	setCodeSnippetContext(() => codeSnippets)

	const wallet = $derived(rateWalletOfType(walletOfType))

	const attributeTree = $derived(attributeTreeForWallet(wallet))
</script>

<WalletPage
	{walletIcon}
	ladders={allWalletLadders}
	{attributeTree}
	{wallet}
	allHardwareModels={hardwareModels}
	{showStage}
	{showScores}
/>
