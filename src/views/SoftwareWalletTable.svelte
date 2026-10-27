<script lang="ts">
	// Types/constants
	import {
		ratedSoftwareWallets,
		softwareWalletAttributeTree,
	} from '@/data/software-wallets'
	import { softwareLadders } from '@/schema/ladders'
	import WalletTable from './WalletTable.svelte'
	import type { SortState } from '@/components/table-sort'
	import type { StageQualificationId } from './wallet-table-stage'

	const wallets = Object.values(ratedSoftwareWallets)


	// Props
	let {
		tableId,
		title,
		initialStageSelection,
		initialSort,
		stageNavigationBase,
	}: {
		tableId?: string
		title?: string
		initialStageSelection?: StageQualificationId
		initialSort?: SortState<string>
		stageNavigationBase?: string
	} = $props()
</script>

<WalletTable
	{tableId}
	{title}
	{initialStageSelection}
	{initialSort}
	{stageNavigationBase}
	ladders={softwareLadders}
	{wallets}
	attributeTree={softwareWalletAttributeTree}
/>
