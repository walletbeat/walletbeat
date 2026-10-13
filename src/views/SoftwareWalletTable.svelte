<script lang="ts">
	// Types/constants
	import {
		ratedSoftwareWallets,
		softwareWalletAttributeTree,
	} from '@/data/software-wallets'
	import { softwareLadders } from '@/schema/ladders'
	import type { WalletTableFocus } from '@/types/wallet-table'
	import WalletTable from './WalletTable.svelte'

	const wallets = Object.values(ratedSoftwareWallets)


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
	ladders={softwareLadders}
	{wallets}
	attributeTree={softwareWalletAttributeTree}
/>
