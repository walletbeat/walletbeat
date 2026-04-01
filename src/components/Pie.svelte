<script module lang="ts">
	// Types/constants
	export type Slice = {
		id: string
		color: string
		weight: number
		arcLabel: string
		titleText: string
		href?: string
		opacity?: number
		children?: Slice[]
	}

	export const PieLayout = {
		HalfTop: 'TopHalf',
		FullLeft: 'FullLeft',
		FullTop: 'FullTop',
	}

	export type LevelConfig = {
		outerRadiusFraction: number
		innerRadiusFraction: number
		offset?: number
		gap: number
		angleGap: number
	}

	// (Internal)
	type ComputedSlice = Slice & {
		computed: {
			totalAngle: number
			orientation: -1 | 1
			midAngle: number
			outerR: number
			innerR: number
			gap: number
			level: number
			offset: number
			arcSize: 'small' | 'large'
			outerSweep: 'cw' | 'ccw'
			innerSweep: 'cw' | 'ccw'
		}
		children?: ComputedSlice[]
	}
</script>


<script lang="ts">
	// Types
	import type { Snippet } from 'svelte'
	import type { SvelteHTMLElements } from 'svelte/elements'


	// Props
	const {
		// Content
		title,
		slices = [],
		centerLabel,

		// View options
		layout = PieLayout.HalfTop,
		padding = 0,
		radius = 47,
		labelSize = radius / 4,
		levels = [
			{
				outerRadiusFraction: 0.6,
				innerRadiusFraction: 0.5,
				gap: 8,
				angleGap: 0,
			},
			{
				outerRadiusFraction: 1.1,
				innerRadiusFraction: 1.0,
				gap: 4,
				angleGap: 0,
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
	}: SvelteHTMLElements['div'] & {
		// Content
		slices: Slice[]
		centerLabel?: string

		// View options
		layout?: (typeof PieLayout)[keyof typeof PieLayout]
		radius?: number
		padding?: number
		labelSize?: number
		levels?: LevelConfig[]

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
	const getLevelConfig = (level: number): LevelConfig => levels[Math.min(level, levels.length - 1)]

	const computeSlices = (
		{
			slices,
			startAngle,
			endAngle,
		}: {
			slices: Slice[]
			startAngle: number
			endAngle: number
		},
		cy = 0,
		level = 0,
	): ComputedSlice[] => {
		const levelConfig = getLevelConfig(level)
		const parentLevelConfig = getLevelConfig(level - 1)

		const outerR = radius * levelConfig.outerRadiusFraction
		const innerR = radius * levelConfig.innerRadiusFraction

		const orientation = Math.sign(endAngle - startAngle)

		const angleGap = levelConfig.angleGap * orientation
		const totalGapAngle = angleGap * (slices.length - 1)

		const angleInsetFromGap = angleGap / 2
		const angleInsetFromParentGap = parentLevelConfig ? (Math.asin((levelConfig.gap / 2) / outerR) - Math.asin((parentLevelConfig.gap / 2) / outerR)) * 180 / Math.PI * orientation : 0

		const effectiveStartAngle = startAngle + (angleInsetFromGap + angleInsetFromParentGap) * orientation
		const effectiveEndAngle = endAngle - (angleInsetFromGap + angleInsetFromParentGap) * orientation
		const effectiveTotalAngle = effectiveEndAngle - effectiveStartAngle - totalGapAngle * orientation

		const totalWeight = slices.reduce((acc, slice) => acc + slice.weight, 0)

		let currentAngle = effectiveStartAngle

		return slices.map(({ children, ...slice }, i) => {
			const totalAngle = effectiveTotalAngle * (slice.weight / totalWeight)
			const startAngle = currentAngle
			const endAngle = currentAngle + totalAngle
			const midAngle = startAngle + totalAngle / 2

			currentAngle = endAngle + (i < slices.length - 1 ? angleGap * orientation : 0)

			return {
				...slice,
				computed: {
					totalAngle,
					orientation: totalAngle >= 0 ? 1 : -1,
					midAngle,
					outerR,
					innerR,
					level,
					offset: levelConfig.offset ?? 0,
					gap: levelConfig.gap,
					arcSize: Math.abs(totalAngle) > 180 ? 'large' : 'small',
					outerSweep: totalAngle >= 0 ? 'cw' : 'ccw',
					innerSweep: totalAngle >= 0 ? 'ccw' : 'cw',
				},
				...children && {
					children: (
						computeSlices(
							{
								slices: children,
								startAngle,
								endAngle,
							},
							cy,
							level + 1,
						)
					),
				},
			}
		})
	}


	// State
	const computedSlices = $derived(
		computeSlices(
			{
				slices,
				...(
					layout === PieLayout.FullLeft ?
						{
							startAngle: -90 + getLevelConfig(0).angleGap / 2,
							endAngle: 270 - getLevelConfig(0).angleGap / 2,
						}
					: layout === PieLayout.FullTop ?
						{
							startAngle: 360 - getLevelConfig(0).angleGap / 2,
							endAngle: 0 + getLevelConfig(0).angleGap / 2,
						}
					: // layout === PieLayout.HalfTop ?
						{
							startAngle: -90,
							endAngle: 90,
						}
				),
			},
		),
	)

	const pieMetrics = $derived.by(() => {
		const maxRadiusMultiplier = Math.max(...levels.map(level => level.outerRadiusFraction))
		const maxOffset = Math.max(...levels.map(level => level.offset ?? 0))
		const maxRadius = radius * maxRadiusMultiplier + maxOffset

		const width = padding * 2 + maxRadius * 2
		const height = padding * 2 + maxRadius * (layout === PieLayout.HalfTop ? 1 : 2)
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


{#snippet sliceSnippet(slice: ComputedSlice)}
	{#snippet slicePathSnippet(slice: ComputedSlice)}
		<div
			class="slice"
			role="button"
			tabindex="0"
			aria-label={slice.titleText}
			onmouseenter={() => { onSliceMouseEnter?.(slice.id) }}
			onmouseleave={() => { onSliceMouseLeave?.(slice.id) }}
			onfocus={() => { onSliceFocus?.(slice.id) }}
			onblur={() => { onSliceBlur?.(slice.id) }}
			onclick={e => {
				e.stopPropagation()
				onSliceClick?.(slice.id)
			}}
			onkeydown={e => {
				if (e.code === 'Enter' || e.code === 'Space')
					onSliceClick?.(slice.id)
			}}
			style:--slice-midAngle={slice.computed.midAngle}
			style:--slice-offset={slice.computed.offset}
			style:--slice-gap={slice.computed.gap}
			style:--slice-outerR={slice.computed.outerR}
			style:--slice-innerR={slice.computed.innerR}
			style:--slice-totalAngle={slice.computed.totalAngle}
			style:--slice-orientation={slice.computed.orientation}
			style:--slice-gapPx={`${slice.computed.gap}px`}
			style:--slice-outerRPx={`${slice.computed.outerR}px`}
			style:--slice-innerRPx={`${slice.computed.innerR}px`}
			style:--slice-totalAngleDeg={`${slice.computed.totalAngle}deg`}
			style:--slice-arcSize={slice.computed.arcSize}
			style:--slice-outerSweep={slice.computed.outerSweep}
			style:--slice-innerSweep={slice.computed.innerSweep}
			style:--slice-fill={slice.color}
			style:--slice-opacity={slice.opacity ?? 1}
			class:highlighted={highlightedSliceId === slice.id}
			data-slice-id={slice.id}
			data-stack
		>
			<span class="label" aria-hidden="true">{slice.arcLabel}</span>
		</div>
	{/snippet}

	{#if slice.href}
		<a
			class="slice-link"
			href={slice.href}
		>
			{@render slicePathSnippet(slice)}
		</a>
	{:else}
		{@render slicePathSnippet(slice)}
	{/if}

	{#if slice.children?.length}
		{#each slice.children as childSlice (childSlice.id)}
			{@render sliceSnippet(childSlice)}
		{/each}
	{/if}
{/snippet}

<div
	{...restProps}
	class="container {'class' in restProps ? restProps.class : ''}"
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
				{@render sliceSnippet(slice)}
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

	.container {
		--highlight-color: rgba(255, 255, 255, 1);
		--highlight-stroke-width: 2;
		--hover-brightness: 1.1;
		--hover-scale: 1.05;

		&[data-layout="TopHalf"] {
			--center-label-baseline: text-after-edge;
		}
		&[data-layout="FullLeft"],
		&[data-layout="FullTop"] {
			--center-label-baseline: central;
		}

		display: grid;
		justify-content: center;
		transform: translateZ(0);
		will-change: transform;
		backface-visibility: hidden;
		transition-duration: 0.4s;

		.pie {
			position: relative;
			display: grid;
			max-width: 100%;

			.slice-link {
				display: contents;

				:is([data-stack] > &) > * {
					grid-area: inherit;
				}
			}

			.slice {
				--slice-scale: 1;
				--slice-offset: 0;

				--slice-labelRadius: calc(var(--pie-labelSize) / 2);
				--slice-labelR: clamp(
					/* Geometric mean of the inner and outer radii (with label radius carved out) */
					pow(
						(
							(var(--slice-outerR) - var(--slice-labelRadius))
							* (var(--slice-innerR) + var(--slice-labelRadius))
						),
						0.5
					),

					/* Centroid of the trimmed annular sector (with inner radius adjusted by label radius) */
					(
						2 / 3
						* (
							(
								pow(var(--slice-outerR), 3)
								- pow(var(--slice-innerR), 3)
							)
							/ (
								pow(var(--slice-outerR), 2)
								- pow(var(--slice-innerR), 2)
							)
						)
						* (
							sin(var(--slice-totalAngle) * 1deg / 2)
							/ (var(--slice-totalAngle) * pi/180 / 2)
						)
					),

					/* Outer radius minus label radius */
					var(--slice-outerR) - var(--slice-labelRadius)
				);

				background-color: var(--slice-fill);
				clip-path: shape(
					from
						calc(var(--slice-cx) + sin(var(--slice-outerStartAngle)) * var(--slice-outerRPx))
						calc(var(--slice-cy) - cos(var(--slice-outerStartAngle)) * var(--slice-outerRPx)),
					arc to
						calc(var(--slice-cx) + sin(var(--slice-outerEndAngle)) * var(--slice-outerRPx))
						calc(var(--slice-cy) - cos(var(--slice-outerEndAngle)) * var(--slice-outerRPx))
						of var(--slice-outerRPx) var(--slice-outerSweep) var(--slice-arcSize),
					line to
						calc(var(--slice-cx) + sin(var(--slice-innerEndAngle)) * var(--slice-innerRPx))
						calc(var(--slice-cy) - cos(var(--slice-innerEndAngle)) * var(--slice-innerRPx)),
					arc to
						calc(var(--slice-cx) + sin(var(--slice-innerStartAngle)) * var(--slice-innerRPx))
						calc(var(--slice-cy) - cos(var(--slice-innerStartAngle)) * var(--slice-innerRPx))
						of var(--slice-innerRPx) var(--slice-innerSweep) var(--slice-arcSize),
					close
				);

				transform-origin: var(--pie-originX) var(--pie-originY);
				transform:
					rotate(calc(var(--pie-rotate) + var(--slice-midAngle) * 1deg))
					scale(var(--slice-scale))
					translateY(calc(var(--slice-offset) * -1px))
				;
				opacity: var(--slice-opacity);

				will-change: transform;
				transition-property:
					clip-path,
					transform,
					opacity
				;

				&:hover,
				&:focus-within {
					filter: brightness(var(--hover-brightness));
					--slice-scale: var(--hover-scale);
					opacity: 1;
				}

				&:focus-within,
				&.highlighted {
					z-index: 2;
					opacity: 1;
				}

				&:focus-within {
					outline: none;
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
					font-size: calc(var(--pie-labelSize) * 1px);
					translate: -50% calc(-50% + (var(--slice-labelR) * -1px));
					rotate: calc(-1 * (var(--pie-rotate) + var(--slice-midAngle) * 1deg));
					transition-property: translate, rotate, filter;
				}
				&:not(:hover, :focus) > .label {
					filter: contrast(0.5) brightness(3) opacity(0.5) drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.15));
				}

				--pie-originX: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
				--pie-originY: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
				--slice-cx: var(--pie-originX);
				--slice-cy: var(--pie-originY);
				--slice-outerInsetAngle: asin((var(--slice-gapPx) / 2) / var(--slice-outerRPx));
				--slice-innerInsetAngle: asin((var(--slice-gapPx) / 2) / var(--slice-innerRPx));
				--slice-outerStartAngle: calc(
					(-1 * var(--slice-totalAngleDeg) / 2)
					+ (var(--slice-outerInsetAngle) * var(--slice-orientation))
				);
				--slice-outerEndAngle: calc(
					(var(--slice-totalAngleDeg) / 2)
					- (var(--slice-outerInsetAngle) * var(--slice-orientation))
				);
				--slice-innerStartAngle: calc(
					(-1 * var(--slice-totalAngleDeg) / 2)
					+ (var(--slice-innerInsetAngle) * var(--slice-orientation))
				);
				--slice-innerEndAngle: calc(
					(var(--slice-totalAngleDeg) / 2)
					- (var(--slice-innerInsetAngle) * var(--slice-orientation))
				);
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
