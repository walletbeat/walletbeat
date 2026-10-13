<script lang="ts">
	// Types/constants
	import {
		embeddedWalletAttributeTree,
		ratedEmbeddedWallets,
	} from '@/data/embedded-wallets'
	import { embeddedLadders } from '@/schema/ladders'
	import type { WalletTableFocus } from '@/types/wallet-table'
	import WalletTable from './WalletTable.svelte'

	const wallets = Object.values(ratedEmbeddedWallets)


	// Props
	let {
		tableId,
		title,
		titleLevel,
		focus,
	}: {
		tableId?: string
		title?: string
		titleLevel?: 1 | 2
		focus?: WalletTableFocus
	} = $props()
</script>

<WalletTable
	{tableId}
	{title}
	{titleLevel}
	{focus}
	ladders={embeddedLadders}
	{wallets}
	attributeTree={embeddedWalletAttributeTree}
/>
