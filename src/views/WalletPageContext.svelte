<script lang="ts">
	import type { HardwareModelSummary } from '@/data/hardware-wallets'
	import { attributeTreeForWallet, rateWalletOfType, type WalletOfType } from '@/data/wallet-rating'
	import { allWalletLadders } from '@/schema/ladders'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import { type ImageSizeIndex, setImageSizeContext } from '@/utils/image-size-index'
	import WalletPage from './WalletPage.svelte'

	const {
		walletOfType,
		hardwareModels,
		showStage = true,
		showScores = false,
		codeSnippets = {},
		imageSizes = {},
	}: {
		walletOfType: WalletOfType,
		hardwareModels: HardwareModelSummary[],
		showStage?: boolean,
		showScores?: boolean,
		// The stored code snippets this wallet's data references (see `codeSnippetsForWallet`).
		codeSnippets?: CodeSnippetIndex,
		// The dimensions of the images this wallet's data references (see `imageSizesForWallet`).
		imageSizes?: ImageSizeIndex,
	} = $props()

	setCodeSnippetContext(() => codeSnippets)
	setImageSizeContext(() => imageSizes)

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
