<script lang="ts">
	// Types/constants
	import { type EipStatusSupportCard, EipSupportStatus } from '@/schema/eip-support'
	import { variantLabel } from '@/schema/variants'
	import CheckIcon from 'lucide-static/icons/circle-check.svg?raw'
	import XIcon from 'lucide-static/icons/circle-x.svg?raw'

	/** Wallets shown per panel before the rest move behind a "+N more" toggle. */
	const visibleWalletCount = 15

	const panels: Array<{
		status: EipSupportStatus
		label: string
		icon: string
		accent: string
		labelColor: string
	}> = [
		{
			status: EipSupportStatus.SUPPORTED,
			label: 'Supported',
			icon: CheckIcon,
			accent: 'var(--rating-pass)',
			labelColor: 'var(--rating-pass-text)',
		},
		{
			status: EipSupportStatus.NOT_SUPPORTED,
			label: 'Not supported',
			icon: XIcon,
			accent: 'var(--rating-fail)',
			labelColor: 'var(--rating-fail-text)',
		},
	]


	// Props
	const {
		cards,
		eipLabel,
	}: {
		// The cards of the list these grids summarize.
		cards: EipStatusSupportCard[]
		eipLabel: string
	} = $props()


	// State
	const cardsForStatus = (status: EipSupportStatus): EipStatusSupportCard[] =>
		cards.filter(card => card.status === status)

	const unknownCount = $derived(cardsForStatus(EipSupportStatus.UNKNOWN).length)

	// Wallets whose platforms land in different groups get their platforms
	// spelled out, so the same wallet in both panels doesn't read as a contradiction.
	const splitWalletIds = $derived(
		new Set(
			cards
				.filter(card => cards.some(other => other.id === card.id && other.status !== card.status))
				.map(card => card.id),
		),
	)
</script>


{#snippet WalletTile(card: EipStatusSupportCard)}
	<li>
		<a class="wallet-tile" href={card.url} data-column="center gap-1">
			<span class="wallet-icon" data-icon="shadow">
				<img
					src={`/images/wallets/${card.id}.${card.iconExtension}`}
					alt=""
					width="40"
					height="40"
				/>
			</span>
			<span class="wallet-name">{card.displayName}</span>
			{#if splitWalletIds.has(card.id)}
				<span class="wallet-platforms">{card.variants.map(variantLabel).join(', ')}</span>
			{/if}
		</a>
	</li>
{/snippet}

<div class="icon-grids" data-column="gap-3">
	<div class="panels">
		{#each panels as { status, label, icon, accent, labelColor } (status)}
			{@const statusCards = cardsForStatus(status)}

			<div
				class="panel"
				data-card="radius-4 padding-4 border-accent"
				style:--accent={accent}
				style:--labelColor={labelColor}
			>
				<p class="panel-label" data-row="start gap-2">
					<span class="status-icon" aria-hidden="true">{@html icon}</span>
					{label}
					<span class="count">{statusCards.length}</span>
				</p>

				{#if statusCards.length === 0}
					<p class="empty">None.</p>
				{:else}
					<ul class="wallet-grid" data-list="unstyled" aria-label={`${label}: ${eipLabel}`}>
						{#each statusCards.slice(0, visibleWalletCount) as card (card.id)}
							{@render WalletTile(card)}
						{/each}
					</ul>

					{#if statusCards.length > visibleWalletCount}
						<details>
							<summary>+{statusCards.length - visibleWalletCount} more</summary>

							<ul class="wallet-grid" data-list="unstyled">
								{#each statusCards.slice(visibleWalletCount) as card (card.id)}
									{@render WalletTile(card)}
								{/each}
							</ul>
						</details>
					{/if}
				{/if}
			</div>
		{/each}
	</div>

	{#if unknownCount > 0}
		<p class="footnote">
			{unknownCount === 1 ? '1 wallet' : `${unknownCount} wallets`} not yet rated for {eipLabel}; see Unknown below.
		</p>
	{/if}
</div>


<style>
	.icon-grids {
		width: 56rem;
		max-width: 100%;
	}

	.panels {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
		gap: 1rem;
	}

	.panel {
		align-content: start;
	}

	.panel-label {
		align-items: center;
		font-weight: 700;
		color: var(--labelColor);

		.status-icon {
			display: inline-flex;
			inline-size: 1.25em;
			block-size: 1.25em;

			:global(svg) {
				inline-size: 100%;
				block-size: 100%;
			}
		}

		.count {
			font-variant-numeric: tabular-nums;
			color: var(--text-secondary);
			font-weight: 600;
		}
	}

	.wallet-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: 0.75rem 0.5rem;
		margin: 0.75rem 0 0;
	}

	.wallet-tile {
		text-align: center;
		text-decoration: none;
		color: inherit;
	}

	.wallet-icon {
		--icon-size: 2.5rem;
	}

	.wallet-name {
		font-size: 0.75rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	details > summary {
		margin-block-start: 0.75rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.wallet-platforms {
		font-size: 0.65rem;
		color: var(--text-secondary);
	}

	.empty,
	.footnote {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.empty {
		margin-block-start: 0.75rem;
	}
</style>
