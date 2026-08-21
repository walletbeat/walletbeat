<script module lang="ts">
	export { PieLayout } from './pie-geometry'
	export type { LevelConfig, Slice } from './pie-geometry'
</script>


<script lang="ts">
	// Types
	import {
		computePieMaxRadius,
		computePieSlices,
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


	// Functions
	const sliceFill = (slice: ComputedSlice) => {
		if (!slice.children?.length || !slice.gradient) return slice.color

		const colorWeights = slice.gradient.colors
			.map(color => ({
				color,
				weight: slice.children
					.filter(child => child.color === color)
					.reduce((sum, child) => sum + child.weight, 0),
			}))
			.filter(({ weight }) => weight > 0)

		if (colorWeights.length <= 1) {
			const color = colorWeights[0]?.color ?? slice.color

			return color === slice.gradient.transparentStopColor ? 'var(--rating-unrated)' : color
		}

		const areaRadiusStops = slice.gradient.areaRadiusStops
		const totalWeight = colorWeights.reduce((sum, entry) => sum + entry.weight, 0)
		const minimumStopGap = Math.min(8, (slice.computed.outerR - slice.computed.innerR) / Math.max(colorWeights.length - 1, 1))
		const stopPositions = colorWeights
			.map(({ weight }, index, weights) => {
				const areaFraction = (weights.slice(0, index).reduce((sum, entry) => sum + entry.weight, 0) + weight / 2) / totalWeight
				const scaledStopIndex = areaRadiusStops ? areaFraction * (areaRadiusStops.length - 1) : 0
				const stopIndex = Math.floor(scaledStopIndex)
				const normalizedRadius = (
					areaRadiusStops ?
						areaRadiusStops[stopIndex] + (
							areaRadiusStops[Math.min(stopIndex + 1, areaRadiusStops.length - 1)] - areaRadiusStops[stopIndex]
						) * (scaledStopIndex - stopIndex)
					:
						Math.sqrt(
							(
								slice.computed.innerR ** 2
								+ (slice.computed.outerR ** 2 - slice.computed.innerR ** 2) * areaFraction
							),
					)
				)

				return areaRadiusStops ? slice.computed.innerR + (slice.computed.outerR - slice.computed.innerR) * normalizedRadius : normalizedRadius
			})
			.reduce<number[]>(
				(stops, stop, index) => [
					...stops,
					Math.max(stop, index === 0 ? slice.computed.innerR : stops[index - 1] + minimumStopGap),
				],
				[],
			)
			.reduceRight<number[]>(
				(stops, stop, index) => [
					Math.min(
						stop,
						index === colorWeights.length - 1 ? slice.computed.outerR : stops[0] - minimumStopGap,
					),
					...stops,
				],
				[],
			)

		return `radial-gradient(in oklch circle at var(--pie-originX) var(--pie-originY), ${colorWeights.map(({ color }, index) => `${color === slice.gradient.transparentStopColor ? 'transparent' : color} ${stopPositions[index]}px`).join(', ')}), var(--rating-unrated)`
	}

	const sliceBackdropFilter = (slice: ComputedSlice) => (
		slice.gradient || slice.color === 'var(--rating-unrated)'
			? 'var(--rating-unrated-backdropFilter)'
			: 'none'
	)

	// State
	const computedSlices = $derived(
		computePieSlices({ slices, radius, levels, layout, centerFirstSlice, labelSize }),
	)

	const pieMetrics = $derived.by(() => {
		const maxRadius = computePieMaxRadius(radius, levels)

		const width = padding * 2 + maxRadius * 2
		const height = padding * 2 + maxRadius * (layout === PieLayoutValue.HalfTop ? 1 : 2)
		const viewBoxX = -(padding + maxRadius)
		const viewBoxY = -(padding + maxRadius)

		return {
			maxRadius,
			width,
			height,
			viewBox: `${viewBoxX} ${viewBoxY} ${width} ${height}`,
		}
	})

</script>


{#snippet Slice(slice: ComputedSlice)}
	<svelte:element
		this={slice.href ? 'a' : 'div'}
		href={slice.href}

		class="slice"
		title={slice.titleText}

		role={slice.href ? 'link' : 'button'}
		tabindex={slice.href ? undefined : '0'}
		aria-label={slice.titleText}
		onmouseenter={() => { onSliceMouseEnter?.(slice.id) }}
		onmouseleave={() => { onSliceMouseLeave?.(slice.id) }}
		onfocus={() => { onSliceFocus?.(slice.id) }}
		onblur={() => { onSliceBlur?.(slice.id) }}
		onclick={(event: MouseEvent) => {
			if (!onSliceClick) return

			event.stopPropagation()
			onSliceClick(slice.id)
		}}
		onkeydown={(event: KeyboardEvent) => {
			if (slice.href || !onSliceClick) return

			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				onSliceClick(slice.id)
			}
		}}

		style:--slice-midAngle={slice.computed.midAngle}
		style:--slice-offset={slice.computed.offset}
		style:--slice-gap={slice.computed.gap}
		style:--slice-outerR={slice.computed.outerR}
		style:--slice-innerR={slice.computed.innerR}
		style:--slice-outerCornerRadius={slice.computed.outerCornerRadius}
		style:--slice-innerCornerRadius={slice.computed.innerCornerRadius}
		style:--slice-totalAngle={slice.computed.totalAngle}
		style:--slice-arcSize={Math.abs(slice.computed.totalAngle) > 180 ? 'large' : 'small'}

		style:--slice-color={slice.color}
		style:--slice-fill={sliceFill(slice)}
		style:--slice-backdropFilter={sliceBackdropFilter(slice)}
		style:--slice-labelSize={slice.computed.labelSize}
		style:--slice-labelR={slice.computed.labelR}

		data-slice-id={slice.id}
		class:highlighted={highlightedSliceId === slice.id}
	>
		<div
			class="slice-shape"
			data-pie-slice-geometry
			data-pie-slice-full-ring={Math.abs(slice.computed.totalAngle) >= 359.99 ? '' : undefined}
		>
			{#if !slice.href && onSliceClick}
				<noscript><span class="accessible-label">{slice.titleText}</span></noscript>
			{:else if !slice.href}
				<span class="accessible-label">{slice.titleText}</span>
			{/if}

			{#if slice.arcIconId}
				<span class="label" aria-hidden="true" data-icon="emoji">{wbIconEmojiSequences[slice.arcIconId]}</span>
			{:else}
				<span class="label" aria-hidden="true">{slice.arcLabel}</span>
			{/if}
		</div>
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
		syntax: "<angle>";
		inherits: true;
		initial-value: 0turn;
	}

	@property --pie-slice-highlightIndex {
		syntax: "<number>";
		inherits: true;
		initial-value: 0;
	}

	.pie-container {
		--highlight-color: rgba(255, 255, 255, 1);
		--highlight-strokeWidth: 1.5px;
		--hover-brightness: 1.1;
		--hover-scale: 1.05;

		&[data-layout="TopHalf"] {
			--center-label-baseline: text-after-edge;
		}
		&[data-layout="FullLeft"],
		&[data-layout="FullTop"] {
			--center-label-baseline: central;
		}

		overflow: clip;

		display: grid;
		justify-content: center;

		transition-duration: 0.4s;

		.pie {
			--pie-originX: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
			--pie-originY: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);

			position: relative;
			display: grid;
			max-width: 100%;

			> .slices {
				contain: content;
			}

			.slice {
				--slice-brightness: 1;
				--slice-scale: 1;
				--slice-strokeColor: transparent;
				--slice-strokeWidth: 0px;
				--slice-offset: 0;
				--slice-labelSize: var(--pie-labelSize);

				display: grid;

				pointer-events: auto;
				cursor: pointer;

				&:hover,
				&:focus-within,
				&.highlighted {
					--slice-brightness: var(--hover-brightness);
					--slice-scale: var(--hover-scale);
					--slice-strokeColor: var(--highlight-color);
					--slice-strokeWidth: var(--highlight-strokeWidth);
					--slice-filter: var(--slice-hover-filter);

					filter:
						brightness(var(--slice-brightness))
						drop-shadow(var(--slice-strokeWidth) 0 var(--slice-strokeColor))
						drop-shadow(0 calc(-1 * var(--slice-strokeWidth)) var(--slice-strokeColor))
						drop-shadow(calc(-1 * var(--slice-strokeWidth)) 0 var(--slice-strokeColor))
						drop-shadow(0 var(--slice-strokeWidth) var(--slice-strokeColor))
					;
				}

				&:focus-within {
					outline: none;
				}

				.slice-shape {
					position: relative;

					background: var(--slice-fill);
					backdrop-filter: var(--slice-backdropFilter, none);

					@media (prefers-reduced-transparency: reduce) {
						backdrop-filter: none;
					}


					transform-origin: var(--pie-originX) var(--pie-originY);
					transform:
						rotate(calc(var(--pie-rotate) + var(--slice-midAngle) * 1deg))
						scale(var(--slice-scale))
						translateY(calc(var(--slice-offset) * -1px))
					;

					opacity: var(--slice-opacity);

					transition-property:
						clip-path,
						transform,
						opacity
					;

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
						transition-property: translate, rotate, filter;
					}
				}

				.accessible-label {
					position: absolute;
					inline-size: 1px;
					block-size: 1px;
					padding: 0;
					margin: -1px;
					overflow: hidden;
					clip-path: inset(50%);
					white-space: nowrap;
					border: 0;
				}

				&:not(:hover, :focus-within) > .slice-shape > .label {
					filter: contrast(0.5) brightness(3) opacity(0.5) drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.15));
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
