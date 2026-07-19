<script lang="ts">
	// Types/constants
	import {
		hardwareWalletAttributeTree,
		ratedHardwareWallets,
	} from '@/data/hardware-wallets'
	import { hardwareLadders } from '@/schema/ladders'
	import WalletTable from './WalletTable.svelte'

	const wallets = Object.values(ratedHardwareWallets)


	// Props
	let {
		tableId,
		title,
	}: {
		tableId?: string
		title?: string
	} = $props()

	const titleDisclaimer = 'Hardware wallets are in beta and our methodology is subject to change at any time.'
</script>

<WalletTable
	{tableId}
	{title}
	{titleDisclaimer}
	ladders={hardwareLadders}
	{wallets}
	attributeTree={hardwareWalletAttributeTree}
/>
