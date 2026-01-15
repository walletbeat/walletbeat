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
			path: string
			totalAngle: number
			midAngle: number
			outerR: number
			innerR: number
			gap: number
			level: number
			offset: number
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

	const polarToCartesian = (
		centerX: number,
		centerY: number,
		radius: number,
		angleInDegrees: number,
	) => {
		const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0

		return {
			x: centerX + radius * Math.cos(angleInRadians),
			y: centerY + radius * Math.sin(angleInRadians),
		}
	}

	const getSlicePath = ({
		cx = 0,
		cy = 0,
		gap,
		outerR,
		innerR,
		startAngle,
		endAngle,
	}: {
		cx: number
		cy: number
		gap: number
		outerR: number
		innerR: number
		startAngle: number
		endAngle: number
	}) => {
		const angleDiff = Math.abs(endAngle - startAngle)
		const orientation = Math.sign(endAngle - startAngle)

		// Handle full circles (or nearly full circles)
		if (angleDiff >= 359.99) {
			return [
				`M ${cx + outerR} ${cy}`,
				`A ${outerR} ${outerR} 0 1 0 ${cx - outerR} ${cy}`,
				`A ${outerR} ${outerR} 0 1 0 ${cx + outerR} ${cy}`,
				`M ${cx + innerR} ${cy}`,
				`A ${innerR} ${innerR} 0 1 1 ${cx - innerR} ${cy}`,
				`A ${innerR} ${innerR} 0 1 1 ${cx + innerR} ${cy}`,
			].join(' ')
		}

		const outerAngleStart = startAngle + Math.asin((gap / 2) / outerR) * 180 / Math.PI * orientation
		const outerStart = polarToCartesian(cx, cy, outerR, outerAngleStart)

		const outerAngleEnd = endAngle - Math.asin((gap / 2) / outerR) * 180 / Math.PI * orientation
		const outerEnd = polarToCartesian(cx, cy, outerR, outerAngleEnd)

		const innerAngleEnd = endAngle - Math.asin((gap / 2) / innerR) * 180 / Math.PI * orientation
		const innerEnd = polarToCartesian(cx, cy, innerR, innerAngleEnd)

		const innerAngleStart = startAngle + Math.asin((gap / 2) / innerR) * 180 / Math.PI * orientation
		const innerStart = polarToCartesian(cx, cy, innerR, innerAngleStart)

		const largeArcFlag = angleDiff > 180 ? 1 : 0
		const sweepFlag = orientation === 1 ? 1 : 0

		// For equiangular pie slices with n slices (each with angle θ = 360°/n),
		// the distance d they need to be moved from the origin to create gaps of width x is:
		// d = x / (2 * sin(θ / 2))
		// const offset = Math.abs(gap / (2 * Math.sin(Math.abs(endAngle - startAngle) / 2)))

		return (
			[
				`M ${outerStart.x} ${outerStart.y}`,
				`A ${outerR} ${outerR} 0 ${largeArcFlag} ${sweepFlag} ${outerEnd.x} ${outerEnd.y}`,
				`L ${innerEnd.x} ${innerEnd.y}`,
				`A ${innerR} ${innerR} 0 ${largeArcFlag} ${1 - sweepFlag} ${innerStart.x} ${innerStart.y}`,
				`L ${outerStart.x} ${outerStart.y}`,
			]
				.join(' ')
		)
	}

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
					path: getSlicePath({
						cx: 0,
						cy,
						gap: levelConfig.gap,
						outerR,
						innerR,
						startAngle: -totalAngle / 2,
						endAngle: totalAngle / 2,
					}),
					totalAngle,
					midAngle,
					outerR,
					innerR,
					level,
					offset: levelConfig.offset ?? 0,
					gap: levelConfig.gap,
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

	const svgAttributes = $derived.by(() => {
		const maxRadiusMultiplier = Math.max(...levels.map(level => level.outerRadiusFraction))
		const maxOffset = Math.max(...levels.map(level => level.offset ?? 0))
		const maxRadius = radius * maxRadiusMultiplier + maxOffset

		const width = padding * 2 + maxRadius * 2
		const height = padding * 2 + maxRadius * (layout === PieLayout.HalfTop ? 1 : 2)
		const viewBoxX = -(padding + maxRadius)
		const viewBoxY = -(padding + maxRadius)

		return {
			width,
			height,
			viewBox: `${viewBoxX} ${viewBoxY} ${width} ${height}`,
		}
	})
</script>


{#snippet sliceSnippet(slice: ComputedSlice)}
	<g
		class="slice"
		style:--slice-midAngle={slice.computed.midAngle}
		style:--slice-offset={slice.computed.offset}
		style:--slice-gap={slice.computed.gap}
		style:--slice-outerR={slice.computed.outerR}
		style:--slice-innerR={slice.computed.innerR}
		style:--slice-totalAngle={slice.computed.totalAngle}
		style:--slice-path={`path("${slice.computed.path}")`}
		style:--slice-fill={slice.color}
		style:--slice-opacity={slice.opacity ?? 1}
		class:highlighted={highlightedSliceId === slice.id}
		data-slice-id={slice.id}
		role={slice.href ? 'link' : 'button'}
		tabIndex="0"
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
	>
		<line
			class="label-line"
			x1="0"
			y1={slice.computed.gap}
			x2="0"
			y2={-slice.computed.innerR}
		/>

		{#snippet slicePathSnippet(slice: ComputedSlice)}
			<!-- Safari: set path directly with `d` attribute -->
			<path
				d={slice.computed.path}
				class="slice-path"
			>
				<title>{slice.titleText}</title>
			</path>
		{/snippet}

		{#if slice.href}
			<a href={slice.href}>
				{@render slicePathSnippet(slice)}
			</a>
		{:else}
			{@render slicePathSnippet(slice)}
		{/if}

		<text class="label" aria-hidden="true">
			{slice.arcLabel}
		</text>

		{#if slice.children?.length}
			<g class="slices">
				{#each slice.children as childSlice (childSlice.id)}
					{@render sliceSnippet(childSlice)}
				{/each}
			</g>
		{/if}
	</g>
{/snippet}

<div
	{...restProps}
	class="container {'class' in restProps ? restProps.class : ''}"
	data-layout={layout}
	style:--pie-radius={radius}
	style:--pie-labelSize={labelSize}
>
	<svg {...svgAttributes}>
		{#if title}
			<title>{title}</title>
		{/if}

		<g class="slices">
			{#each computedSlices as slice (slice.id)}
				{@render sliceSnippet(slice)}
			{/each}
		</g>

		<g class="center">
			{#if centerContentSnippet}
				{@render centerContentSnippet()}
			{:else}
				<text>
					{centerLabel}
				</text>
			{/if}
		</g>
	</svg>
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

		svg {
			display: grid;
			max-width: 100%;

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

				transform-origin: 0 0;
				cursor: pointer;
				will-change: transform;

				transform:
					rotate(calc(var(--pie-rotate) + var(--slice-midAngle) * 1deg))
					scale(var(--slice-scale))
					translateY(calc(var(--slice-offset) * -1px))
				;
				opacity: var(--slice-opacity);
				transition-property: transform, opacity;

				&:hover,
				&:focus {
					filter: brightness(var(--hover-brightness));
					--slice-scale: var(--hover-scale);
					opacity: 1;
				}

				&:focus,
				&.highlighted {
					stroke: var(--highlight-color);
					stroke-width: calc(var(--highlight-stroke-width) * 1px);
					z-index: 2;
					opacity: 1;
				}

				&:focus {
					outline: none;
				}

				> .label-line {
					opacity: 0;
					stroke: currentColor;
					stroke-width: 1;
					stroke-dasharray: 1 2;
					pointer-events: none;
				}

				.slice-path {
					d: var(--slice-path);
					fill: var(--slice-fill);
					stroke-linecap: square;
				}

				> .label {
					text-anchor: middle;
					dominant-baseline: central;
					fill: currentColor;
					stroke: none;
					font-size: calc(var(--pie-labelSize) * 1px);
					pointer-events: none;
					translate: 0 calc(var(--slice-labelR) * -1px);
					rotate: calc(-1 * (var(--pie-rotate) + var(--slice-midAngle) * 1deg));
					transition-property: translate, rotate, filter;
				}
				&:not(:hover, :focus) > .label {
					filter: contrast(0.5) brightness(3) opacity(0.5) drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.15));
				}

				> .slices {
					transform: rotate(calc(var(--pie-rotate) + var(--slice-midAngle) * -1deg));
					transform-origin: 0 0;
					will-change: transform;
				}
			}

			> .center {
				:global(text) {
					font-size: 0.8em;
					fill: currentColor;

					text-anchor: middle;
					dominant-baseline: var(--center-label-baseline);

					pointer-events: none;
				}
			}
		}
	}
</style>
