<script module lang="ts">
	import { Rating } from '@/schema/attributes'

	/**
	 * Segment order, best to worst, then unrated.
	 * Exempt attributes don't count towards a score, so the tally leaves them out.
	 */
	const tallyRatings = [Rating.PASS, Rating.PARTIAL, Rating.FAIL, Rating.UNRATED] as const
</script>


<script lang="ts">
	// Functions
	import { ratingToColor, ratingToIcon, ratingToText } from '@/schema/attributes'


	// Props
	const {
		attributes,
		showCounts = false,
		onAttributeHover,
	}: {
		attributes: { id: string, rating: Rating }[]
		showCounts?: boolean
		onAttributeHover?: (attributeId: string | undefined) => void
	} = $props()


	// Derived
	const attributesByRating = $derived(
		tallyRatings
			.map(rating => ({
				rating,
				attributes: attributes.filter(attribute => attribute.rating === rating),
			}))
			.filter(({ attributes }) => attributes.length > 0)
	)

	const summary = $derived(
		attributesByRating
			.map(({ rating, attributes }) => `${attributes.length} ${ratingToText(rating).toLowerCase()}`)
			.join(', ')
	)
</script>


<span
	class="rating-tally"
	role="img"
	aria-label={summary}
>
	{#each attributesByRating as { rating, attributes } (rating)}
		{#each attributes as attribute (attribute.id)}
			<span
				class="segment"
				data-rating={rating}
				style:--segment-color={ratingToColor(rating)}
				onpointerenter={() => onAttributeHover?.(attribute.id)}
				onpointerleave={() => onAttributeHover?.(undefined)}
			></span>
		{/each}
	{/each}
</span>

{#if showCounts}
	<span
		class="rating-counts"
		data-row="start gap-3 wrap"
		aria-hidden="true"
	>
		{#each attributesByRating as { rating, attributes } (rating)}
			<span>{ratingToIcon(rating)} {attributes.length}</span>
		{/each}
	</span>
{/if}


<style>
	/*
	 * By default the segments share the full width. Setting `--ratingTally-segmentInlineSize`
	 * (with `--ratingTally-inlineSize: auto`) gives every segment a fixed width instead.
	 */
	.rating-tally {
		display: flex;
		gap: 2px;
		inline-size: var(--ratingTally-inlineSize, 100%);
		block-size: var(--ratingTally-blockSize, 0.5rem);
	}

	.segment {
		flex: 1 1 0;
		min-inline-size: var(--ratingTally-segmentInlineSize, 0);
		border-radius: 2px;
		background: var(--segment-color);

		&[data-rating='PASS'] {
			box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rating-pass-text) 45%, transparent);
		}

		&[data-rating='PARTIAL'] {
			background: repeating-linear-gradient(
				135deg,
				var(--segment-color) 0 2px,
				color-mix(in srgb, var(--segment-color) 35%, transparent) 2px 4px
			);
			box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rating-partial-text) 45%, transparent);
		}

		&[data-rating='FAIL'] {
			box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rating-fail-text) 45%, transparent);
		}

		&[data-rating='UNRATED'] {
			background: none;
			outline: 1px dashed var(--text-secondary);
			outline-offset: -1px;
			opacity: 0.7;
		}
	}

	.rating-counts {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}
</style>
