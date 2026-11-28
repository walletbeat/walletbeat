<script lang="ts">
	import type { ImageMetadata } from 'astro'
	import { allHardwareModels } from '@/data/hardware-wallets'
	import { allWalletLadders } from '@/schema/ladders'
	import WalletPage from '@/views/WalletPage.svelte'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import { walletFixtures, walletFixtureAttributeTree } from './wallet-fixtures'

	const { name, codeSnippets, walletIcon }: { walletIcon: ImageMetadata; name: keyof typeof walletFixtures; codeSnippets: CodeSnippetIndex } = $props()
	setCodeSnippetContext(() => codeSnippets)
	const wallet = $derived(walletFixtures[name]())
	const attributeTree = $derived(walletFixtureAttributeTree(name, wallet))
</script>

<WalletPage {walletIcon} {wallet} {attributeTree} {allHardwareModels} ladders={allWalletLadders} showScores />
