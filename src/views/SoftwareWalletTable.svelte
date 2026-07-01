<script lang="ts">
	// Types/constants
	import {
		ratedSoftwareWallets,
		softwareWalletAttributeTree,
	} from '@/data/software-wallets'
	import { softwareLadders } from '@/schema/ladders'
	import WalletTable from './WalletTable.svelte'

	const wallets = Object.values(ratedSoftwareWallets)


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
	ladders={softwareLadders}
	{wallets}
	attributeTree={softwareWalletAttributeTree}
/>
