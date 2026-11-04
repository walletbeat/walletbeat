<script lang="ts">
	import type { ImageMetadata } from 'astro'
	import { type ReferenceImageDimensions, setReferenceImageContext } from '@/utils/reference-image-context'
	import { allHardwareModels } from '@/data/hardware-wallets'
	import { getNewsForWallet } from '@/data/news'
	import { allWalletLadders } from '@/schema/ladders'
	import WalletPage from '@/views/WalletPage.svelte'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
	import { walletFixtures, walletFixtureAttributeTree } from './wallet-fixtures'

	const { name, codeSnippets, walletIcon, imageDimensions }: { imageDimensions: ReferenceImageDimensions; walletIcon: ImageMetadata; name: keyof typeof walletFixtures; codeSnippets: CodeSnippetIndex } = $props()
	setCodeSnippetContext(() => codeSnippets)
	setReferenceImageContext(() => imageDimensions)
	const wallet = $derived(walletFixtures[name]())
	const attributeTree = $derived(walletFixtureAttributeTree(name, wallet))
</script>

<WalletPage hardwareModels={allHardwareModels} walletNews={getNewsForWallet(wallet.metadata.id)} {walletIcon} {wallet} {attributeTree} ladders={allWalletLadders} showScores />
