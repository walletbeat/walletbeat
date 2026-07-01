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
</script>

<WalletTable
	{tableId}
	{title}
	ladders={hardwareLadders}
	{wallets}
	attributeTree={hardwareWalletAttributeTree}
/>
