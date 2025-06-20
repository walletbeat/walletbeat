// State
import { SvelteSet } from 'svelte/reactivity'

export class WalletTableState {
	selectedAttribute: string | undefined = $state(undefined)

	expandedRowIds = $state(
		new SvelteSet<string>()
	)

	toggleRowExpanded(id: string) {
		if (this.expandedRowIds.has(id))
			this.expandedRowIds.delete(id)
		else
			this.expandedRowIds.add(id)
	}

	isRowExpanded(walletId: string) {
		return this.expandedRowIds.has(walletId)
	}
}
