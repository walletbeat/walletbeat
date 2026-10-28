<script lang="ts">
	import type { ImageMetadata } from 'astro'
	import { allRatedWalletsBySlug, attributeTreeForWallet } from '@/data/wallets'
	import { allWalletLadders } from '@/schema/ladders'
	import { type ReferenceImageDimensions, setReferenceImageContext } from '@/utils/reference-image-context'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import WalletPage from './WalletPage.svelte'

	const {
		walletIcon,
		walletId,
		showStage = true,
		showScores = false,
		codeSnippets = {},
		imageDimensions = {},
	}: {
		walletIcon: ImageMetadata,
		walletId: string,
		showStage?: boolean,
		showScores?: boolean,
		imageDimensions?: ReferenceImageDimensions,
		// The stored code snippets this wallet's data references (see `codeSnippetsForWallet`).
		codeSnippets?: CodeSnippetIndex,
	} = $props()

	setCodeSnippetContext(() => codeSnippets)
	setReferenceImageContext(() => imageDimensions)

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
