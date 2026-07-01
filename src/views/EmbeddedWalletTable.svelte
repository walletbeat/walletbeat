<script lang="ts">
	// Types/constants
	import {
		embeddedWalletAttributeTree,
		ratedEmbeddedWallets,
	} from '@/data/embedded-wallets'
	import { embeddedLadders } from '@/schema/ladders'
	import WalletTable from './WalletTable.svelte'

	const wallets = Object.values(ratedEmbeddedWallets)


	// Props
	let {
		tableId,
		title,
	}: {
		tableId?: string
		title?: string
	} = $props()
</script>

<WalletTable
	{tableId}
	{title}
	ladders={embeddedLadders}
	{wallets}
	attributeTree={embeddedWalletAttributeTree}
/>
