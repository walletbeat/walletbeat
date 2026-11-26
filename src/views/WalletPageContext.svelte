<script lang="ts">
	import type { ImageMetadata } from 'astro'
	import { allRatedWalletsBySlug, attributeTreeForWallet } from '@/data/wallets'
	import { allWalletLadders } from '@/schema/ladders'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import { type ImageSizeIndex, setImageSizeContext } from '@/utils/image-size-index'
	import WalletPage from './WalletPage.svelte'

	const {
		walletIcon,
		walletId,
		showStage = true,
		showScores = false,
		codeSnippets = {},
		imageSizes = {},
	}: {
		walletIcon: ImageMetadata,
		walletId: string,
		showStage?: boolean,
		showScores?: boolean,
		// The stored code snippets this wallet's data references (see `codeSnippetsForWallet`).
		codeSnippets?: CodeSnippetIndex,
		// The dimensions of the images this wallet's data references (see `imageSizesForWallet`).
		imageSizes?: ImageSizeIndex,
	} = $props()

	setCodeSnippetContext(() => codeSnippets)
	setImageSizeContext(() => imageSizes)

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
	{walletIcon}
	ladders={allWalletLadders}
	{attributeTree}
	{wallet}
	{showStage}
	{showScores}
/>
