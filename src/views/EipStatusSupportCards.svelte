<script lang="ts">
	// Types/constants
	import {
		type EipStatusSupportCard,
		EipSupportStatus,
		eipSupportStatusColor as statusColor,
		eipSupportStatusGroupId,
	} from '@/schema/eip-support'
	import { variantLabel } from '@/schema/variants'
	import { childHeadingLevel } from '@/types/heading'
	import type { CalendarDate } from '@/types/date'
	import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'

	// `--rating-unrated`/`--rating-neutral` are low-alpha, made for badge
	// backgrounds; solid text needs its own, legible color.
	const headingColor: Record<EipSupportStatus, string> = {
		[EipSupportStatus.SUPPORTED]: 'var(--rating-pass-text)',
		[EipSupportStatus.NOT_SUPPORTED]: 'var(--rating-fail-text)',
		[EipSupportStatus.UNKNOWN]: 'var(--text-secondary)',
		[EipSupportStatus.NOT_APPLICABLE]: 'var(--text-secondary)',
	}

	const statusLabel: Array<{ status: EipSupportStatus; label: string }> = [
		{ status: EipSupportStatus.SUPPORTED, label: 'Supported' },
		{ status: EipSupportStatus.NOT_SUPPORTED, label: 'Not Supported' },
		{ status: EipSupportStatus.UNKNOWN, label: 'Unknown' },
	]


	// Props
	let {
		id,
		title,
		cards,
		codeSnippets = {},
		headingLevel = 2,
	}: {
		// Prefix of the status group IDs (see `eipSupportStatusGroupId`).
		id?: string
		title?: string
		headingLevel?: 1 | 2 | 3
		cards: EipStatusSupportCard[]
		// The stored code snippets these cards reference (see `codeSnippetsForReferences`).
		codeSnippets?: CodeSnippetIndex
	} = $props()

	const statusHeadingLevel = $derived(title ? childHeadingLevel[headingLevel] : headingLevel)
	const walletHeadingLevel = $derived(childHeadingLevel[statusHeadingLevel])

	setCodeSnippetContext(() => codeSnippets)


	// Functions
	const cardsForStatus = (status: EipSupportStatus): EipStatusSupportCard[] =>
		cards.filter(card => card.status === status)

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
			<svelte:element this={`h${headingLevel}`}>{title}</svelte:element>
		</header>
	{/if}

	{#each statusLabel as { status, label: label } (status)}
		{@const statusCards = cardsForStatus(status)}

		{#if statusCards.length > 0}
			<div data-column="gap-4">
				<header data-scroll-item='inline-detached'>
					<svelte:element this={`h${statusHeadingLevel}`}
						id={id === undefined ? undefined : eipSupportStatusGroupId(id, status)}
						data-support-status={status}
						style:--accent={headingColor[status]}
					>{label}</svelte:element>
				</header>

				<div data-scroll-item="inline-detached" data-column="gap-5">
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

								<svelte:element this={`h${walletHeadingLevel}`} class="wallet-heading" data-row-item="flexible">
									<a data-link="camouflaged" href={card.url}>{card.displayName}</a>
								</svelte:element>

								<span class="platform-label">{card.variants.map(variantLabel).join(', ')}</span>
							{/snippet}

							<div
								class="wallet-card"
								style:--accent={statusColor[card.status]}
							>
								{#if hasReferences}
									{@const lastVerified = cardLastVerified(card)}

									<details data-card="radius-4 padding-4 border-accent" data-column="gap-0">
										<summary data-row="start wrap gap-3">
											{@render WalletCardHeader()}
										</summary>

										<div class="wallet-card-content" data-column="gap-3">
											<ReferenceLinks parentHeadingLevel={walletHeadingLevel} references={card.references} cardBackground="secondary" />

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
										<div data-row="start wrap gap-3">
											{@render WalletCardHeader()}

										</div>
									</div>
								{/if}
							</div>
						{/each}
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

	[data-support-status] {
		font-size: 1.2rem;
		font-weight: 700;
		margin: 0;
		color: var(--accent);
	}

	.wallet-card {
		:global(summary) {
			min-inline-size: 0;
		}
	}

	.wallet-icon {
		--icon-size: 1.75em;
		flex-shrink: 0;
	}

	.wallet-heading {
		font-size: 0.9rem;
		font-weight: 600;
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

</style>
