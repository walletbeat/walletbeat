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
		focus,
	}: {
		tableId?: string
		title?: string
		focus?: WalletTableFocus
	} = $props()
</script>

<WalletTable
	{tableId}
	{title}
	{focus}
	ladders={embeddedLadders}
	{wallets}
	attributeTree={embeddedWalletAttributeTree}
/>
