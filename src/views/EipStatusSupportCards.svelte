<script lang="ts">
	// Types/constants
	import { type EipStatusSupportCard, EipSupportStatus } from '@/schema/eip-support'
	import { Variant } from '@/schema/variants'
	import type { CalendarDate } from '@/types/date'

	const statusColor: Record<EipSupportStatus, string> = {
		[EipSupportStatus.SUPPORTED]: 'var(--rating-pass)',
		[EipSupportStatus.NOT_SUPPORTED]: 'var(--rating-fail)',
		[EipSupportStatus.UNKNOWN]: 'var(--rating-unrated)',
		[EipSupportStatus.NOT_APPLICABLE]: 'var(--rating-neutral)',
	}

	// `--rating-unrated`/`--rating-neutral` are low-alpha, made for badge
	// backgrounds; solid text needs its own, legible color.
	const headingColor: Record<EipSupportStatus, string> = {
		[EipSupportStatus.SUPPORTED]: 'var(--rating-pass)',
		[EipSupportStatus.NOT_SUPPORTED]: 'var(--rating-fail)',
		[EipSupportStatus.UNKNOWN]: 'var(--text-secondary)',
		[EipSupportStatus.NOT_APPLICABLE]: 'var(--text-secondary)',
	}

	const statusLabel: Array<{ status: EipSupportStatus; label: string }> = [
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
		[Variant.HARDWARE, 'Hardware Wallet'],
		[Variant.EMBEDDED, 'Embedded Wallet'],
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

	const labelForStatus = (status: EipSupportStatus): string =>
		statusLabel.find(entry => entry.status === status)?.label ?? status

	// The most recent date among the card's references, i.e. when this status
	// was last verified.
	const cardLastVerified = (card: EipStatusSupportCard): CalendarDate | undefined => {
		const dates = card.references
			.map(({ lastRetrieved }) => lastRetrieved)
			.filter((date): date is CalendarDate => date !== undefined)

		return dates.length > 0 ? dates.toSorted().at(-1) : undefined
	}

	const formatDate = (date: CalendarDate): string =>
		new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC',
		})


	// Components
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<section data-sticky-container data-column="gap-6">
	{#if title}
		<header
			data-row="wrap"
			data-scroll-item='inline-detached padding-match-start'
		>
			<h2>{title}</h2>
		</header>
	{/if}

	{#each statusLabel as { status, label: label } (status)}
		{@const statusCards = cardsForStatus(status)}

		{#if statusCards.length > 0}
			<div data-column="gap-4">
				<header data-scroll-item='inline-detached'>
					<h3
						data-support-status={status}
						style:--accent={headingColor[status]}
					>{label}</h3>
				</header>

				<div data-scroll-item="inline-attached underflow-center overflow-start">
					<div class="wallet-card-list" data-column="gap-5">
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

								<div class="wallet-heading" data-row-item="flexible" data-row="start gap-2">
									<h5>
										<a data-link="camouflaged" href={card.url}>
											{card.displayName}
										</a>
									</h5>

									<span
										class="status-tag"
										data-badge="small"
										style:--accent={headingColor[card.status]}
									>{labelForStatus(card.status)}</span>
								</div>

								<span class="platform-label">{platformLabel(card.variants)}</span>
							{/snippet}

							<div
								class="wallet-card"
								style:--accent={statusColor[card.status]}
							>
								{#if hasReferences}
									{@const lastVerified = cardLastVerified(card)}

									<details data-card="radius-4 padding-4 border-accent" data-column="gap-0">
										<summary data-row="center gap-3">
											{@render WalletCardHeader()}
										</summary>

										<div class="wallet-card-content" data-column="gap-3">
											<ReferenceLinks references={card.references} cardBackground="secondary" />

											<div class="card-meta" data-row="wrap gap-3">
												{#if lastVerified}
													<span class="last-verified">
														As of <time datetime={lastVerified}>{formatDate(lastVerified)}</time>
													</span>
												{/if}

												<a class="wallet-page-link" href={card.url}>
													View {card.displayName}'s full rating →
												</a>
											</div>
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
		font-size: 1.2rem;
		font-weight: 700;
		margin: 0;
		color: var(--accent);
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
			flex-shrink: 1;
			font-size: 0.9rem;
			font-weight: 600;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.status-tag {
		--badge-backgroundColor: color-mix(in srgb, var(--accent) 14%, transparent);
		--badge-borderColor: color-mix(in srgb, var(--accent) 20%, transparent);
		--badge-textColor: var(--accent);

		flex-shrink: 0;
		font-size: 0.65em;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	/* Matches the "Updated <date>" secondary text on the wallet security news
	   list (src/pages/news/index.astro `.metadata-dates`). */
	.platform-label {
		flex-shrink: 0;
		font-size: 0.9em;
		color: var(--text-secondary);
	}

	.wallet-card-content {
		padding-block-start: 0.5em;
	}

	/* Separated from the sources list by a divider so it reads as a distinct
	   footer rather than another (unlabeled) list item. Matches the "Updated
	   <date>" secondary text on the wallet security news list
	   (src/pages/news/index.astro `.metadata-dates`). */
	.card-meta {
		align-items: center;
		padding-block-start: 0.85em;
		border-block-start: 1px solid var(--border-color);
		font-size: 0.9em;
		color: var(--text-secondary);
	}

	.wallet-page-link {
		white-space: nowrap;
	}
</style>
