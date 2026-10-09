<script lang="ts">
	// Types/constants
	import {
		hardwareWalletAttributeTree,
		ratedHardwareWallets,
	} from '@/data/hardware-wallets'
	import { hardwareLadders } from '@/schema/ladders'
	import type { WalletTableFocus } from '@/types/wallet-table'
	import WalletTable from './WalletTable.svelte'

	const wallets = Object.values(ratedHardwareWallets)


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

	const titleDisclaimer = 'Hardware wallets are in beta and our methodology is subject to change at any time.'
</script>

<WalletTable
	{tableId}
	{title}
	{titleLevel}
	{focus}
	{titleDisclaimer}
	ladders={hardwareLadders}
	{wallets}
	attributeTree={hardwareWalletAttributeTree}
/>
