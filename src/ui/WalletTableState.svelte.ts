// Types
import type { Variant } from '@/schema/variants'


// State
import { SvelteSet } from 'svelte/reactivity'

export class WalletTableState {
	displayMode: 'separated' | 'combined' = $state(
		'separated'
	)

	toggleDisplayMode() {
		this.displayMode = this.displayMode === 'separated' ? 'combined' : 'separated'
	}


	selectedVariant: Variant | undefined = $state(undefined)

	selectVariant(variant: Variant) {
		this.selectedVariant = (this.selectedVariant === variant) ? undefined : variant
	}


	selectedEvaluationAttribute: string | undefined = $state(undefined)


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
