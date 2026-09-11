<script module lang="ts">
	export { PieLayout } from './pie-geometry'
	export type { LevelConfig, Slice } from './pie-geometry'
</script>

<script lang="ts">
	import './pie-shape.css'
	import { sliceFill } from './pie-fill'
	// Types
	import {
		computePieSlices,
		pieMaxRadius,
		PieLayout as PieLayoutValue,
		type ComputedSlice,
		type LevelConfig as PieLevelConfig,
		type Slice as PieSlice,
	} from './pie-geometry'
	import { wbIconEmojiSequences } from '@/styles/wbicons'
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'

	// Props
	const {
		// Content
		title,
		slices = [],
		centerLabel,

		// View options
		layout = PieLayoutValue.HalfTop,
		centerFirstSlice = true,
		padding = 0,
		radius = 47,
		labelSize = radius / 4,
		levels = [
			{
				outerRadiusFraction: 0.6,
				innerRadiusFraction: 0.5,
				gap: 8,
				anglePadding: 0,
				angleGap: 0,
				outerCornerRadius: 10,
				innerCornerRadius: 10,
			},
			{
				outerRadiusFraction: 1.1,
				innerRadiusFraction: 1.0,
				gap: 4,
				anglePadding: 0,
				angleGap: 0,
				outerCornerRadius: 8,
				innerCornerRadius: 8,
			},
		],

		// State
		highlightedSliceId = $bindable(null),

		// Events
		onSliceClick,
		onSliceMouseEnter,
		onSliceMouseLeave,
		onSliceFocus,
		onSliceBlur,

		// Snippets
		centerContentSnippet,

		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		// Content
		slices: PieSlice[]
		centerLabel?: string

		// View options
		layout?: (typeof PieLayoutValue)[keyof typeof PieLayoutValue]
		centerFirstSlice?: boolean
		radius?: number
		padding?: number
		labelSize?: number
		levels?: PieLevelConfig[]

		// State
		highlightedSliceId?: string | null

		// Events
		onSliceClick?: (id: string) => void
		onSliceMouseEnter?: (id: string) => void
		onSliceMouseLeave?: (id: string) => void
		onSliceFocus?: (id: string) => void
		onSliceBlur?: (id: string) => void

		// Snippets
		centerContentSnippet?: Snippet
	} = $props()

	// State
	const computedSlices = $derived(
		computePieSlices({ slices, radius, levels, layout, centerFirstSlice, labelSize }),
	)

	const pieMetrics = $derived.by(() => {
		const maxRadius = pieMaxRadius(radius, levels)

		const width = padding * 2 + maxRadius * 2
		const height = padding * 2 + maxRadius * (layout === PieLayoutValue.HalfTop ? 1 : 2)

		return {
			maxRadius,
			width,
			height,
		}
	})
</script>

{#snippet Slice(slice: ComputedSlice)}
	<svelte:element
		this={slice.href ? 'a' : onSliceClick ? 'button' : 'div'}
		{...slice.href ? { href: slice.href } : onSliceClick ? { type: 'button' } : {}}
		class="slice"
		title={slice.titleText}
		aria-label={slice.titleText}
		onmouseenter={() => {
			onSliceMouseEnter?.(slice.id)
		}}
		onmouseleave={() => {
			onSliceMouseLeave?.(slice.id)
		}}
		onfocus={() => {
			onSliceFocus?.(slice.id)
		}}
		onblur={() => {
			onSliceBlur?.(slice.id)
		}}
		{...onSliceClick && {
			onclick: (event: MouseEvent) => {
				event.stopPropagation()
				onSliceClick?.(slice.id)
			},
		}}
		style:--slice-midAngle={slice.computed.midAngle}
		style:--slice-offset={slice.computed.offset}
		style:--slice-gap={slice.computed.gap}
		style:--slice-outerR={slice.computed.outerR}
		style:--slice-innerR={slice.computed.innerR}
		style:--slice-outerCornerRadius={slice.computed.outerCornerRadius}
		style:--slice-innerCornerRadius={slice.computed.innerCornerRadius}
		style:--slice-totalAngle={slice.computed.totalAngle}
		style:--slice-color={slice.color}
		style:--slice-opacity={slice.opacity ?? 1}
		style:--slice-fill={sliceFill(slice)}
		style:--slice-backdropFilter={slice.gradient || slice.color === 'var(--rating-unrated)'
			? 'var(--rating-unrated-backdropFilter)'
			: 'none'}
		style:--slice-labelSize={slice.computed.labelSize}
		style:--slice-labelR={slice.computed.labelR}
		data-slice-id={slice.id}
		class:highlighted={highlightedSliceId === slice.id}
	>
		<span class="slice-shape">
			{#if slice.arcIconId}
				<span class="label" aria-hidden="true" data-icon="emoji"
					>{wbIconEmojiSequences[slice.arcIconId]}</span
				>
			{:else}
				<span class="label" aria-hidden="true">{slice.arcLabel}</span>
			{/if}
		</span>
	</svelte:element>

	{#if slice.children?.length}
		{#each slice.children as childSlice (childSlice.id)}
			{@render Slice(childSlice)}
		{/each}
	{/if}
{/snippet}

<div
	{...restProps}
	class="pie-container {'class' in restProps ? restProps.class : ''}"
	data-layout={layout}
	style:--pie-radius={radius}
	style:--pie-padding={padding}
	style:--pie-labelSize={labelSize}
	style:--pie-maxR={pieMetrics.maxRadius}
>
	<div
		class="pie"
		aria-label={title}
		style:width={`${pieMetrics.width}px`}
		style:height={`${pieMetrics.height}px`}
		data-stack
	>
		<div class="slices" data-stack>
			{#each computedSlices as slice (slice.id)}
				{@render Slice(slice)}
			{/each}
		</div>
		<div class="center" data-stack>
			{#if centerContentSnippet}
				{@render centerContentSnippet()}
			{:else}
				<span>
					{centerLabel}
				</span>
			{/if}
		</div>
	</div>
</div>

<style>
	@property --pie-rotate {
		syntax: '<angle>';
		inherits: true;
		initial-value: 0turn;
	}

	@property --slice-totalAngle {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-midAngle {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-outerR {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-innerR {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-outerCornerRadius {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-innerCornerRadius {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-gap {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-offset {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-labelSize {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-labelR {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property --slice-scale {
		syntax: '<number>';
		inherits: true;
		initial-value: 1;
	}

	.pie-container {
		overflow: clip;

		display: grid;
		justify-content: center;

		transition-duration: 0.4s;

		.pie {
			position: relative;
			display: grid;
			max-width: 100%;

			> .slices {
				contain: content;
			}

			.slice {
				--slice-scale: 1;
				--slice-offset: 0;
				--slice-labelSize: var(--pie-labelSize);

				display: grid;
				transition-property:
					--pie-rotate, --slice-totalAngle, --slice-midAngle, --slice-outerR, --slice-innerR,
					--slice-outerCornerRadius, --slice-innerCornerRadius, --slice-gap, --slice-offset,
					--slice-labelSize, --slice-labelR, --slice-scale, filter;

				&:is(button) {
					padding: 0;
					border: 0;
					border-radius: 0;
					background: transparent;
					font: inherit;
					gap: 0;
					align-items: normal;
				}

				pointer-events: none;

				> * {
					pointer-events: auto;
				}

				&:hover,
				&:focus-within,
				&.highlighted {
					--slice-scale: var(--hover-scale);

					filter: var(---pie-highlightFilter);
				}

				&:focus-within {
					outline: none;
				}

				.slice-shape {
					background: var(--slice-fill);
					backdrop-filter: var(--slice-backdropFilter, none);

					@media (prefers-reduced-transparency: reduce) {
						backdrop-filter: none;
					}

					transform-origin: var(--pie-originX) var(--pie-originY);
					transform: rotate(calc(var(--pie-rotate) + var(--slice-midAngle) * 1deg))
						scale(var(--slice-scale)) translateY(calc(var(--slice-offset) * -1px));

					opacity: var(--slice-opacity);

					transition-property: opacity;

					&:hover,
					&:focus-within,
					.slice.highlighted & {
						opacity: 1;
					}

					> .label {
						position: absolute;
						left: var(--pie-originX);
						top: var(--pie-originY);
						display: inline-block;
						white-space: nowrap;
						text-align: center;
						line-height: 1;
						color: currentColor;
						font-size: calc(var(--slice-labelSize) * 1px);
						translate: -50% calc(-50% + (var(--slice-labelR) * -1px));
						rotate: calc(-1 * (var(--pie-rotate) + var(--slice-midAngle) * 1deg));
						transition-property: filter;
					}
				}

				&:not(:hover, :focus-within) > .slice-shape > .label {
					filter: contrast(0.5) brightness(3) opacity(0.5)
						drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.15));
				}
			}

			> .center {
				position: absolute;
				inset: 0;
				display: grid;
				justify-items: center;
				pointer-events: none;

				:global {
					> * {
						pointer-events: auto;

						font-size: 0.8em;
						color: currentColor;
						translate: 0 calc((var(--center-align-offset, 0)) * 1px);
					}
				}
			}
		}

		&[data-layout="TopHalf"] > .pie > .center {
			align-items: end;
			--center-align-offset: calc(-1 * var(--pie-padding));
		}

		&[data-layout="FullLeft"] > .pie > .center,
		&[data-layout="FullTop"] > .pie > .center {
			align-items: center;
		}
	}
</style>
