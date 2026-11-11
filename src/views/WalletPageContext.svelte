<script lang="ts">
	import type { ImageMetadata } from 'astro'
	import { allRatedWalletsBySlug, attributeTreeForWallet } from '@/data/wallets'
	import { allWalletLadders } from '@/schema/ladders'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import WalletPage from './WalletPage.svelte'

	const {
		walletIcon,
		walletId,
		initialVariant,
		initialModel,
		showStage = true,
		showScores = false,
		codeSnippets = {},
	}: {
		walletIcon: ImageMetadata,
		walletId: string,
		initialVariant?: import('@/schema/variants').Variant,
		initialModel?: string,
		showStage?: boolean,
		showScores?: boolean,
		// The stored code snippets this wallet's data references (see `codeSnippetsForWallet`).
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
	{walletIcon}
	{initialVariant}
	{initialModel}
	ladders={allWalletLadders}
	{attributeTree}
	{wallet}
	{showStage}
	{showScores}
/>
