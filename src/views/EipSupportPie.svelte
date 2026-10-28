<script lang="ts">
	// Types/constants
	import { PieLayout } from '@/components/pie-geometry'
	import type { EipStatusSupportCard } from '@/schema/eip-support'
	import { eipSupportPie } from '@/components/eip-support-pie'


	// Props
	const {
		cards,
		listId,
		walletTypeLabel,
		eipLabel,
	}: {
		// The cards of the list this pie summarizes.
		cards: EipStatusSupportCard[]
		// The `id` passed to that list's `EipStatusSupportCards`, for slice links.
		listId: string
		// Plural wallet type, e.g. "software wallets".
		walletTypeLabel: string
		eipLabel: string
	} = $props()


	// State
	const summary = $derived(eipSupportPie(cards, listId))


	// Components
	import Pie from '@/components/Pie.svelte'
</script>


<figure data-column="center gap-2">
	<Pie
		title={`${eipLabel} support among ${walletTypeLabel}`}
		layout={PieLayout.FullTop}
		padding={4}
		radius={64}
		labelSize={14}
		levels={summary.levels}
		slices={summary.slices}
	>
		{#snippet centerContentSnippet()}
			<span><strong class="center-count">{summary.supportedWalletCount}/{summary.walletCount}</strong></span>
		{/snippet}
	</Pie>

	<figcaption>
		{summary.supportedWalletCount} of {summary.walletCount} distinct {walletTypeLabel} support {eipLabel} on at least one platform.
		Slices count platform-qualified status entries. A wallet can appear in more than one status.
	</figcaption>
</figure>


<style>
	figure {
		margin: 0 auto;
		inline-size: max-content;
		max-inline-size: 12rem;
		text-align: center;
	}

	.center-count {
		font-size: 1.35rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	figcaption {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
</style>
