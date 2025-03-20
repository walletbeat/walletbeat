<script module lang="ts">
	// Types/constants
	export type Slice = {
		id: string
		color: string
		weight: number
		arcLabel: string
		tooltip: string
		tooltipValue: string
	}

	export const Layout = {
		TopHalf: 'TopHalf',
		Full: 'Full',
	}
</script>


<script lang="ts">
	// Props
	let {
		// Content
		slices = [],
		centerLabel,

		// View options
		layout = Layout.TopHalf,
		padding = 0,
		radius = 47,
		gap = 8,
		angleGap = 0,
		outerRadiusFraction = 0.95,
		innerRadiusFraction = 0.5,

		// State
		highlightedSliceId = $bindable(null),

		// Events
		onSliceClick,
		onSliceMouseEnter,
		onSliceMouseLeave,

		// Snippets
		centerContentSnippet,
	}: {
		// Content
		slices: Slice[]
		centerLabel?: string

		// View options
		layout?: typeof Layout[keyof typeof Layout]
		radius?: number
		padding?: number
		gap?: number
		angleGap?: number
		outerRadiusFraction?: number
		innerRadiusFraction?: number

		// State
		highlightedSliceId?: string | null

		// Events
		onSliceClick?: (id: string) => void
		onSliceMouseEnter?: (id: string) => void
		onSliceMouseLeave?: (id: string) => void

		// Snippets
		centerContentSnippet?: Snippet
	} = $props()


	// Functions
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
		outerRadius,
		innerRadius,
		startAngle,
		endAngle,
	}: {
		cx: number
		cy: number
		outerRadius: number
		innerRadius: number
		startAngle: number
		endAngle: number
	}) => {
		const start = polarToCartesian(cx, cy, outerRadius, endAngle)
		const end = polarToCartesian(cx, cy, outerRadius, startAngle)
		const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle)
		const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle)
		const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0

		return (
			[
				`M ${start.x} ${start.y}`,
				`A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
				`L ${innerEnd.x} ${innerEnd.y}`,
				`A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
				`L ${start.x} ${start.y}`,
			]
				.join(' ')
		)
	}


	// State
	let sliceParams = $derived.by(() => {
		const startAngle = (
			layout === Layout.Full ?
				-90 + angleGap / 2 
			:
				-90
		)

		const endAngle = (
			layout === Layout.Full ?
				270 - angleGap / 2 
			:
				90
		)

		const outerRadius = radius * outerRadiusFraction
		const innerRadius = radius * innerRadiusFraction

		const totalAngle = endAngle - startAngle
		const totalAngleGap = Math.min(angleGap * (slices.length - 1), totalAngle * 0.3)
		const sliceAngle = (totalAngle - totalAngleGap) / slices.length
		const actualAngleGap = slices.length > 1 ? totalAngleGap / (slices.length - 1) : 0

		return {
			outerRadius,
			innerRadius,
			rotationAngle: (i: number) => (
				startAngle + i * (sliceAngle + actualAngleGap) + sliceAngle / 2
			),
			path: getSlicePath({
				cx: 0,
				cy: (
					layout === Layout.Full ?
						0 
					:
						// Half arc – origin at center bottom
						radius * (1 - outerRadiusFraction)
				),
				outerRadius,
				innerRadius,
				startAngle: -sliceAngle / 2,
				endAngle: sliceAngle / 2,
			}),
		}
	})

	let width = $derived(padding * 2 + (radius + gap) * 2)
	let height = $derived(padding * 2 + (radius + gap) * (layout === Layout.TopHalf ? 1 : 2))

	let viewBoxParams = $derived(
		[
			-(padding + radius + gap),
			-(padding + radius + gap),
			width,
			height,
		]
			.join(' ')
	)
</script>



{#snippet sliceSnippet(
	slice: Slice,
	i: number,
)}

	<g
		class="slice"
		style:--rotationAngle={sliceParams.rotationAngle(i)}
		class:highlighted={highlightedSliceId === slice.id}
		data-slice-id={slice.id}
		role="button"
		tabindex="0"
		onmouseenter={() => onSliceMouseEnter?.(slice.id)}
		onmouseleave={() => onSliceMouseLeave?.(slice.id)}
		onclick={e => {
			e.stopPropagation()
			onSliceClick?.(slice.id)
		}}
		onkeydown={e => {
			if (e.code === 'Enter' || e.code === 'Space'){
				e.stopPropagation()
				onSliceClick?.(slice.id)
			}
		}}
	>
		<path d={sliceParams.path} fill={slice.color}>
			<title>{slice.tooltip}: {slice.tooltipValue}</title>
		</path>

		<line x1="0" y1="0" x2="0" y2={-sliceParams.innerRadius} class="label-line" />
		<text class="slice-label" aria-hidden="true">
			{slice.arcLabel}
		</text>
	</g>
{/snippet}


<div class="container"
	data-arc-type={layout}
	style:--radius={radius}
	style:--outerRadiusFraction={outerRadiusFraction}
	style:--innerRadiusFraction={innerRadiusFraction}
	style:--gap={gap}
>
	<svg {width} {height} viewBox={viewBoxParams}>
		<g class="slices">
			{#each slices as slice, i}
				{@render sliceSnippet(slice, i)}
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
	.container {
		--highlight-color: rgba(255, 255, 255, 1);
		--highlight-stroke-width: 2;
		--hover-brightness: 1.1;
		--hover-scale: 1.05;

		--sliceLabel-radius: calc(var(--radius) * (var(--outerRadiusFraction) + var(--innerRadiusFraction)) / 2);

		&[data-arc-type="TopHalf"] {
			--center-label-baseline: text-after-edge;
		}
		&[data-arc-type="Full"] {
			--center-label-baseline: central;
		}

		transform: translateZ(0);
		will-change: transform;
		backface-visibility: hidden;

		.slices {
			will-change: transform;

			.slice {
				--slice-scale: 1;

				transform-origin: 0 0;

				transform: rotate(calc(var(--rotationAngle) * 1deg)) scale(var(--slice-scale)) translate(0, calc(var(--gap) * -1px));
				
				will-change: transform, scale;
				transition-property: transform, scale, filter;
				transition-duration: 0.2s;
				transition-timing-function: ease-out;
				cursor: pointer;

				&:hover,
				&:focus {
					filter: brightness(var(--hover-brightness));
					--slice-scale: var(--hover-scale);
				}

				&:focus {
					stroke: var(--highlight-color);
					stroke-width: calc(var(--highlight-stroke-width) * 1px);
					z-index: 2;
					outline: none;
				}

				&.highlighted {
					stroke: var(--highlight-color);
					stroke-width: calc(var(--highlight-stroke-width) * 1px);
					z-index: 2;
				}

				.label-line {
					stroke: none;
					pointer-events: none;
				}

				.slice-label {
					translate: 0 calc(var(--sliceLabel-radius) * -1px);
					rotate: calc(var(--rotationAngle) * -1deg);
					text-anchor: middle;
					dominant-baseline: central;
					fill: currentColor;
					font-size: 10px;
					pointer-events: none;
					will-change: transform;
				}
			}
		}

		.center {
			:global(text) {
				font-size: 0.8em;
				fill: currentColor;

				text-anchor: middle;
				dominant-baseline: var(--center-label-baseline);

				pointer-events: none;
			}
		}
	}
</style>
