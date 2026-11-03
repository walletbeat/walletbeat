<script module lang="ts">
	export { PieLayout } from './pie-geometry'
	export type {
		LevelConfig,
		PieTransitionElement,
		PieTransitionElements,
		Slice,
	} from './pie-geometry'
</script>

<script lang="ts">
	import './pie-shape.css'
	import { onMount } from 'svelte'
	import { wbIconEmojiSequences } from '@/styles/wbicons'
	import { sliceFill, sliceLabelBackground } from './pie-fill'
	import { viewTransitionName } from '@/utils/view-transition'
	// Types
	import {
		computePieSlices,
		pieMaxRadius,
		PieLayout as PieLayoutValue,
		type ComputedSlice,
		type LevelConfig as PieLevelConfig,
		type PieTransitionElements as PieTransitionElementsValue,
		type Slice as PieSlice,
	} from './pie-geometry'
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
		transitionNamePrefix,
		transitionElements = 'pie slices center',
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
		/** Unique among mounted pies; reuse across mutually exclusive replacements. */
		transitionNamePrefix?: string
		/** Named parts; use `slices` when one pie may become several with a shared prefix. */
		transitionElements?: PieTransitionElementsValue
		levels?: PieLevelConfig[]

		// State
		highlightedSliceId?: string | null

		// Events
		onSliceClick?: (id: string) => void
		onSliceMouseEnter?: (id: string, event: MouseEvent) => void
		onSliceMouseLeave?: (id: string) => void
		onSliceFocus?: (id: string) => void
		onSliceBlur?: (id: string) => void

		// Snippets
		centerContentSnippet?: Snippet
	} = $props()

	// State
	let interactive = $state(false)
	onMount(() => { interactive = true })

	const computedSlices = $derived(
		computePieSlices({ slices, radius, levels, layout, centerFirstSlice, labelSize }),
	)
	const geometryProperties = [
		'midAngle', 'offset', 'gap', 'outerR', 'innerR', 'outerCornerRadius',
		'innerCornerRadius', 'totalAngle', 'labelR', 'labelSize',
	] as const
	type GeometryProperty = (typeof geometryProperties)[number]

	const geometryDefaults = $derived.by(() => {
		const rendered: ComputedSlice[] = []
		const visit = (entries: ComputedSlice[]) => {
			for (const slice of entries) {
				rendered.push(slice)

				if (slice.children?.length) visit(slice.children)
			}
		}

		visit(computedSlices)

		const defaults: Partial<Record<GeometryProperty, number>> = {}

		for (const property of geometryProperties) {
			if (property === 'labelSize' && rendered.some(slice => slice.computed.labelSize === labelSize)) continue

			if (rendered.some(slice => !Number.isFinite(slice.computed[property]))) continue

			const counts = new Map<string, { value: number; count: number }>()

			for (const slice of rendered) {
				const value = slice.computed[property]
				const serialized = String(value)
				const entry = counts.get(serialized)

				if (entry) entry.count += 1
				else counts.set(serialized, { value, count: 1 })
			}

			let largestCount = 0

			for (const { value, count } of counts.values()) {
				if (count > largestCount) {
					largestCount = count
					defaults[property] = value
				}
			}
		}

		return defaults
	})

	const geometryOverride = (slice: ComputedSlice, property: GeometryProperty) => {
		const value = slice.computed[property]
		const base = geometryDefaults[property]

		return base !== undefined && String(value) === String(base) ? undefined : value
	}

	const transitionedElements = $derived(new Set(transitionElements.split(' ')))
	const transitionsPie = $derived(interactive && !!transitionNamePrefix && transitionedElements.has('pie'))
	const transitionsSlices = $derived(interactive && !!transitionNamePrefix && transitionedElements.has('slices'))
	const transitionsCenter = $derived(interactive && !!transitionNamePrefix && transitionedElements.has('center'))

	const pieMetrics = $derived.by(() => {
		const maxRadius = pieMaxRadius(radius, levels)

		const width = padding * 2 + maxRadius * 2
		const height = padding * 2 + maxRadius * (layout === PieLayoutValue.HalfTop ? 1 : 2)

		return {
			maxRadius,
			origin: { x: padding + maxRadius, y: padding + maxRadius },
			width,
			height,
		}
	})
</script>

{#snippet Slice(slice: ComputedSlice)}
	{@const fill = sliceFill(slice)}
	{@const labelBackground = sliceLabelBackground(slice)}
	<svelte:element
		this={slice.href ? 'a' : onSliceClick ? 'button' : 'div'}
		{...slice.href ? { href: slice.href } : onSliceClick ? { type: 'button', disabled: !interactive } : {}}
		class="slice"
		title={slice.arcIconId ? `${wbIconEmojiSequences[slice.arcIconId]} ${slice.ariaLabel}` : slice.ariaLabel}
		aria-label={slice.ariaLabel}
		onmouseenter={(event: MouseEvent) => {
			onSliceMouseEnter?.(slice.id, event)
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
		style:--slice-midAngle={geometryOverride(slice, 'midAngle')}
		style:--slice-offset={geometryOverride(slice, 'offset')}
		style:--slice-gap={geometryOverride(slice, 'gap')}
		style:--slice-outerR={geometryOverride(slice, 'outerR')}
		style:--slice-innerR={geometryOverride(slice, 'innerR')}
		style:--slice-outerCornerRadius={geometryOverride(slice, 'outerCornerRadius')}
		style:--slice-innerCornerRadius={geometryOverride(slice, 'innerCornerRadius')}
		style:--slice-totalAngle={geometryOverride(slice, 'totalAngle')}
		style:--slice-opacity={slice.opacity === 1 ? undefined : slice.opacity}
		style:--slice-fill={fill}
		style:--slice-labelBackground={labelBackground === fill ? undefined : labelBackground}
		style:--slice-labelSize={slice.computed.labelSize === labelSize ? undefined : geometryOverride(slice, 'labelSize')}
		style:--slice-labelR={geometryOverride(slice, 'labelR')}
		data-slice-id={slice.id}
		data-view-transition={transitionsSlices ? 'named' : undefined}
		style:--view-transition-name={transitionsSlices ?
			viewTransitionName(transitionNamePrefix ?? '', 'slice', slice.id)
			: undefined}
		class:highlighted={highlightedSliceId === slice.id}
	>
		<span class="slice-shape" data-pressable={slice.href || onSliceClick ? 'paint' : undefined}>
			{#if slice.arcIconId}
				<span class="label" aria-hidden="true" data-icon="wbicons-simple {slice.arcIconId}"></span>
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
	style:---pg0={geometryDefaults.midAngle}
	style:---pg1={geometryDefaults.offset}
	style:---pg2={geometryDefaults.gap}
	style:---pg3={geometryDefaults.outerR}
	style:---pg4={geometryDefaults.innerR}
	style:---pg5={geometryDefaults.outerCornerRadius}
	style:---pg6={geometryDefaults.innerCornerRadius}
	style:---pg7={geometryDefaults.totalAngle}
	style:---pg8={geometryDefaults.labelR}
	style:---pg9={geometryDefaults.labelSize}
>
	<div
		class="pie"
		aria-label={title}
		data-view-transition={transitionsPie ? 'named' : undefined}
		style:width={`${pieMetrics.width}px`}
		style:height={`${pieMetrics.height}px`}
		style:--view-transition-name={transitionsPie ?
			viewTransitionName(transitionNamePrefix ?? '', 'pie')
			: undefined}
		data-stack
	>
		<div class="slices" data-stack>
			{#each computedSlices as slice (slice.id)}
				{@render Slice(slice)}
			{/each}
		</div>
		<div
			class="center"
			data-stack
			data-view-transition={transitionsCenter ? 'named' : undefined}
			style:--view-transition-name={transitionsCenter ?
				viewTransitionName(transitionNamePrefix ?? '', 'center')
				: undefined}
		>
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
		---pg0: initial;
		---pg1: initial;
		---pg2: initial;
		---pg3: initial;
		---pg4: initial;
		---pg5: initial;
		---pg6: initial;
		---pg7: initial;
		---pg8: initial;
		---pg9: initial;

		overflow: clip;
		&:has(:global([data-layout-transition])) {
			overflow: visible;
		}

		display: grid;
		justify-content: center;

		transition-duration: 0.4s;

		.pie {
			&[data-view-transition~="named"] {
				--view-transition-class: pie;
			}

			position: relative;
			display: grid;
			max-width: 100%;

			> .slices {
				contain: content;
				pointer-events: none;
				&:has(> :global([data-layout-transition])) {
					contain: layout style;
				}
			}

			.slice {
				&[data-view-transition~="named"] {
					--view-transition-class: pie-slice;
				}

				--slice-opacity: 1;
				--slice-labelBackground: var(--slice-fill);
				--slice-scale: 1;
				--slice-midAngle: var(---pg0, inherit);
				--slice-offset: var(---pg1, 0);
				--slice-gap: var(---pg2, inherit);
				--slice-outerR: var(---pg3, inherit);
				--slice-innerR: var(---pg4, inherit);
				--slice-outerCornerRadius: var(---pg5, inherit);
				--slice-innerCornerRadius: var(---pg6, inherit);
				--slice-totalAngle: var(---pg7, inherit);
				--slice-labelR: var(---pg8, inherit);
				--slice-labelSize: var(---pg9, var(--pie-labelSize));

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

				&:not(:disabled) > * {
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

				&:is(button:not(:disabled), a[href])::before {
					content: '';
					position: absolute;
					inset: 0;
					pointer-events: auto;
				}

				/* A common center lets the paint-only press scale compose with the slice rotation. */
				.slice-shape,
				&::before {
					transform-origin: 50% 50%;
					transform:
						translate(calc(var(--pie-originX) - 50%), calc(var(--pie-originY) - 50%))
						rotate(calc(var(--pie-rotate) + var(--slice-midAngle) * 1deg))
						scale(var(--slice-scale)) translateY(calc(var(--slice-offset) * -1px))
						translate(calc(50% - var(--pie-originX)), calc(50% - var(--pie-originY)));
				}

				&:is(a)[data-pressable-state~='pressed'] {
					---pressable-opacity: var(--pressable-pressed-opacity);
				}

				&:is(button:not(:disabled), a[href]):not([aria-disabled='true']):has(> .slice-shape[data-pressable~='paint']) {
					opacity: var(---pressable-opacity, 1);
				}

				.slice-shape,
				&:is(button:not(:disabled), a[href]):not([aria-disabled='true']):has(> .slice-shape[data-pressable~='paint']) > .slice-shape {
					position: static;
					display: block;
					outline: none;
					background: var(--slice-fill);

					opacity: var(--slice-opacity);

					transition-property: opacity;

					&:hover,
					&:focus-within,
					.slice:hover &,
					.slice:focus-within &,
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

						font-size: calc(var(--slice-labelSize) * 1px);
						translate: -50% calc(-50% + (var(--slice-labelR) * -1px));
						rotate: calc(-1 * (var(--pie-rotate) + var(--slice-midAngle) * 1deg));
						transition-property: filter;
					}
				}

			}

			> .center {
				&[data-view-transition~="named"] {
					--view-transition-class: pie-center;
				}

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

	@media (prefers-reduced-motion: reduce) {
		.pie-container,
		.pie-container .slice {
			/* Motion preference takes precedence over shared pressable durations. */
			transition-duration: 0s !important;
		}
	}
</style>
