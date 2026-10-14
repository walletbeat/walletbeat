<script lang="ts">
	// Types/constants
	import { PieLayout } from '@/components/pie-geometry'
	import {
		type EipStatusSupportCard,
		EipSupportStatus,
		eipSupportStatusColor,
		eipSupportStatusGroupId,
	} from '@/schema/eip-support'

	const statusSlices: Array<{ status: EipSupportStatus; description: string }> = [
		{ status: EipSupportStatus.SUPPORTED, description: 'supported' },
		{ status: EipSupportStatus.NOT_SUPPORTED, description: 'not supported' },
		{ status: EipSupportStatus.UNKNOWN, description: 'unknown' },
	]


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
	const walletCount = $derived(new Set(cards.map(card => card.id)).size)

	const supportedWalletCount = $derived(
		new Set(
			cards.filter(card => card.status === EipSupportStatus.SUPPORTED).map(card => card.id),
		).size,
	)

	const slices = $derived(
		statusSlices.flatMap(({ status, description }) => {
			const count = cards.filter(card => card.status === status).length

			return count === 0
				? []
				: [
						{
							id: status,
							color: eipSupportStatusColor[status],
							weight: count,
							arcLabel: String(count),
							ariaLabel: `${count} ${description}`,
							href: `#${eipSupportStatusGroupId(listId, status)}`,
						},
					]
		}),
	)


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
		levels={[
			{
				outerRadiusFraction: 1,
				innerRadiusFraction: 0.58,
				gap: 0,
				angleGap: slices.length > 1 ? 4 : 0,
				outerCornerRadius: 6,
				innerCornerRadius: 4,
			},
		]}
		{slices}
	>
		{#snippet centerContentSnippet()}
			<span><strong class="center-count">{supportedWalletCount}/{walletCount}</strong></span>
		{/snippet}
	</Pie>

	<figcaption>
		{supportedWalletCount} of {walletCount} {walletTypeLabel} support {eipLabel}
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
