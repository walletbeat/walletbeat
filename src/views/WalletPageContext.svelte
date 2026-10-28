<script lang="ts">
	import type { ImageMetadata } from 'astro'
	import type { allHardwareModels } from '@/data/hardware-wallets'
	import type { WalletSecurityNews } from '@/types/content/news'
	import { restoreWalletPageData, walletPageAttributeTree, type WalletPageData } from './wallet-page-data'
	import { allWalletLadders } from '@/schema/ladders'
	import { type ReferenceImageDimensions, setReferenceImageContext } from '@/utils/reference-image-context'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import WalletPage from './WalletPage.svelte'

	const {
		walletIcon,
		data,
		hardwareModels,
		walletNews,
		showStage = true,
		showScores = false,
		codeSnippets = {},
		imageDimensions = {},
	}: {
		walletIcon: ImageMetadata,
		data: WalletPageData,
		hardwareModels: typeof allHardwareModels,
		walletNews: WalletSecurityNews[],
		showStage?: boolean,
		showScores?: boolean,
		imageDimensions?: ReferenceImageDimensions,
		// The stored code snippets this wallet's data references (see `codeSnippetsForWallet`).
		codeSnippets?: CodeSnippetIndex,
	} = $props()

	setCodeSnippetContext(() => codeSnippets)
	setReferenceImageContext(() => imageDimensions)

	const wallet = $derived(restoreWalletPageData(data))
	const attributeTree = $derived(walletPageAttributeTree(data))
</script>

<WalletPage
	{walletIcon}
	{hardwareModels}
	{walletNews}
	ladders={allWalletLadders}
	{attributeTree}
	{wallet}
	{showStage}
	{showScores}
/>
