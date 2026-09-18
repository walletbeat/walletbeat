<script lang="ts">
	// Types/constants
	import { type EipStatusSupportCard, EipSupportStatus } from '@/schema/eip-support'
	import { Variant } from '@/schema/variants'

	const statusColor: Record<EipSupportStatus, string> = {
		[EipSupportStatus.SUPPORTED]: 'var(--rating-pass)',
		[EipSupportStatus.NOT_SUPPORTED]: 'var(--rating-fail)',
		[EipSupportStatus.UNKNOWN]: 'var(--rating-unrated)',
		[EipSupportStatus.NOT_APPLICABLE]: 'var(--rating-neutral)',
	}

	const statusSections: Array<{ status: EipSupportStatus; label: string }> = [
		{ status: EipSupportStatus.SUPPORTED, label: 'Supported' },
		{ status: EipSupportStatus.NOT_SUPPORTED, label: 'Not Supported' },
		{ status: EipSupportStatus.UNKNOWN, label: 'Unknown' },
	]

	// Fixed display order and label, independent of the order variants were
	// collected in.
	const platformNames: Array<[Variant, string]> = [
		[Variant.BROWSER, 'Browser Extension'],
		[Variant.MOBILE, 'Mobile App'],
		[Variant.DESKTOP, 'Desktop App'],
	]

	const platformLabel = (variants: Variant[]): string =>
		platformNames
			.filter(([variant]) => variants.includes(variant))
			.map(([, name]) => name)
			.join(' & ')


	// Props
	let {
		title,
		cards,
	}: {
		title?: string
		cards: EipStatusSupportCard[]
	} = $props()


	// Functions
	const cardsForStatus = (status: EipSupportStatus): EipStatusSupportCard[] =>
		cards.filter(card => card.status === status)


	// Components
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<section data-sticky-container data-column="gap-8">
	{#if title}
		<header
			data-row="wrap"
			data-scroll-item='inline-detached padding-match-start'
		>
			<h2>{title}</h2>
		</header>
	{/if}

	{#each statusSections as { status, label: statusLabel } (status)}
		{@const statusCards = cardsForStatus(status)}

		{#if statusCards.length > 0}
			<div data-column="gap-3">
				<header data-scroll-item='inline-detached padding-match-start'>
					<h3 data-support-status={status}>{statusLabel}</h3>
				</header>

				<div data-scroll-item="inline-attached underflow-center overflow-start">
					<div class="wallet-card-list" data-column="gap-3">
						{#each statusCards as card (card.id)}
							{@const hasReferences = card.references.length > 0}

							{#snippet WalletCardHeader()}
								<span class="wallet-icon" data-icon="shadow">
									<img
										src={`/images/wallets/${card.id}.${card.iconExtension}`}
										alt=""
										width="28"
										height="28"
									/>
								</span>

								<div class="wallet-heading" data-row-item="flexible">
									<h5>
										<a data-link="camouflaged" href={card.url}>
											{card.displayName}
										</a>
									</h5>
								</div>

								<span class="platform-label">{platformLabel(card.variants)}</span>
							{/snippet}

							<div
								class="wallet-card"
								style:--accent={statusColor[card.status]}
							>
								{#if hasReferences}
									<details data-card="radius-4 padding-4 border-accent" data-column="gap-0">
										<summary data-row="center gap-3">
											{@render WalletCardHeader()}
										</summary>

										<div class="wallet-card-content">
											<ReferenceLinks references={card.references} cardBackground="secondary" />
										</div>
									</details>
								{:else}
									<div class="wallet-card-static" data-card="radius-4 padding-4 border-accent">
										<div data-row="center gap-3">
											{@render WalletCardHeader()}
											<span class="chevron-spacer" aria-hidden="true"></span>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{/each}
</section>


<style>
	section {
		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 60.5rem;
			--scrollItem-inlineDetached-paddingStart: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
			--scrollItem-inlineDetached-paddingEnd: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
		}
	}

	/*
	 * Fixed width so every card in the list is the same size from the start,
	 * instead of `max-content` sizing to whichever card happens to be widest
	 * (which made the whole column visibly jump wider only once a card was
	 * expanded).
	 */
	.wallet-card-list {
		width: 56rem;
		max-width: 100%;
	}

	h3 {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;

		&[data-support-status='UNKNOWN'],
		&[data-support-status='NOT_APPLICABLE'] {
			color: var(--text-secondary);
		}
	}

	.wallet-card {
		:global(details) {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		}

		:global(summary) {
			min-inline-size: 0;
		}
	}

	.wallet-icon {
		--icon-size: 1.75em;
		flex-shrink: 0;
	}

	/* Matches the chevron's own box (see `details > summary::after` in
	   css-attributes.css) so a non-expandable card's label lines up with the
	   expandable ones instead of drifting to the right edge. */
	.chevron-spacer {
		flex-shrink: 0;
		width: 0.75em;
		height: 1lh;
	}

	.wallet-heading {
		min-inline-size: 0;

		h5 {
			font-size: 0.9rem;
			font-weight: 600;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	/* Matches the "Updated <date>" secondary text on the wallet security news
	   list (src/pages/news/index.astro `.metadata-dates`). */
	.platform-label {
		flex-shrink: 0;
		font-size: 0.9em;
		color: var(--text-secondary);
	}

	.wallet-card-content {
		padding-block-start: 0.75em;
	}
</style>
