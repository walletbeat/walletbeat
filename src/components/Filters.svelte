<script module lang="ts">
	export type { FilterChoice, FilterSet } from './filters'
</script>

<script lang="ts" generics="Item">
	import type { SvelteHTMLElements } from 'svelte/elements'
	import { flushSync, onMount } from 'svelte'
	import { viewTransitionName, type TransitionUpdate } from '@/utils/view-transition'
	import { SvelteSet } from 'svelte/reactivity'
	type FiltersTransitionUpdate = TransitionUpdate<'filters'>
	const directTransitionUpdate: FiltersTransitionUpdate = update => update()
	const instanceId = $props.id()
	let interactive = $state(false)
	onMount(() => { interactive = true })
	import {
		applyFilterSets,
		changeFilterChoice,
		resetFilterSets,
		type FilterChoice,
		type FilterSet,
	} from './filters'

	let {
		items,
		filterSets,
		contextFilterSets = filterSets,
		visibleSetIds,
		activeChoices = $bindable(new SvelteSet<FilterChoice<Item>>()),
		toggleFilter = $bindable(),
		toggleFilterById = $bindable(),
		transitionUpdate = directTransitionUpdate,
		onreset,
		closedAnchorPrefix,
		...restProps
	}: SvelteHTMLElements['form'] & {
		items: Item[]
		filterSets: FilterSet<Item>[]
		contextFilterSets?: FilterSet<Item>[]
		visibleSetIds?: string[]
		activeChoices?: Set<FilterChoice<Item>>
		toggleFilter?: typeof _toggleFilter
		toggleFilterById?: typeof _toggleFilterById
		transitionUpdate?: FiltersTransitionUpdate
		closedAnchorPrefix?: string
	} = $props()

	const filtered = (choices: Set<FilterChoice<Item>>) => applyFilterSets(items, contextFilterSets, choices)
	const defaultChoices = $derived(resetFilterSets(filterSets, new Set()))

	const updateFilters = (update: () => void) => {
		transitionUpdate(() => flushSync(update), 'filters')
	}

	const _toggleFilter = (choice: FilterChoice<Item>, exclusive = false) => {
		updateFilters(() => {
			activeChoices = changeFilterChoice(filterSets, activeChoices, choice, exclusive)
		})
	}
	toggleFilter = _toggleFilter

	const _toggleFilterById = (choiceId: string, exclusive = false) => {
		const choice = filterSets.flatMap(set => set.choices).find(candidate => candidate.id === choiceId)
		if (choice) toggleFilter(choice, exclusive)
	}
	toggleFilterById = _toggleFilterById

	const visibleChoices = (set: FilterSet<Item>) => set.alwaysShowChoices
		? set.choices
		: set.choices.filter(choice => !choice.matches || filtered(new Set([choice])).length > 0)

	const choiceCount = (set: FilterSet<Item>, choice: FilterChoice<Item>) => {
		const setChoices = new Set(set.choices)
		return filtered(activeChoices.difference(setChoices).union(new Set([choice]))).length
	}

	const reset = (sets = filterSets.filter(set => !visibleSetIds || visibleSetIds.includes(set.id))) => {
		updateFilters(() => {
			activeChoices = resetFilterSets(sets, activeChoices)
		})
	}
</script>

<form
	class="menu"
	data-anchored={closedAnchorPrefix ? '' : undefined}
	data-row="gap-6 wrap align-start"
	onreset={event => {
		onreset?.(event)
		if (event.defaultPrevented) return
		event.preventDefault()
		reset()
	}}
	{...restProps}
>
	{#each filterSets as set (set.id)}
		{@const choices = visibleChoices(set)}
		{@const activeInSet = choices.filter(choice => activeChoices.has(choice) && choice.id !== '')}

		{#if choices.filter(choice => choice.id).length > 1}
			{@const closedAnchor = closedAnchorPrefix ? `${closedAnchorPrefix}-${set.id}` : undefined}
			<fieldset
				data-filter-set={set.id}
				data-panel-member={!visibleSetIds || visibleSetIds.includes(set.id) ? '' : undefined}
				data-cardinality={set.cardinality}
				data-match={set.match}
				data-active-count={activeInSet.length}
				data-column="gap-1"
				style:--closed-anchor={closedAnchor}
				style:--closed-block-timeline={closedAnchor ? `${closedAnchor}-block` : undefined}
				style:--active-count={activeInSet.length}
			>
				<legend>{set.label}</legend>

				<div class="choices" data-column="gap-1">
					{#each choices as choice (choice.id)}
						{@const navigates = !interactive && choice.href !== undefined}
						{@const checked = activeChoices.has(choice) || (set.cardinality === 'exclusive' && choice.id === '' && !set.choices.some(candidate => activeChoices.has(candidate)))}
						{@const activeIndex = activeInSet.indexOf(choice)}
						{@const count = choiceCount(set, choice)}
						{@const choiceAnchor = `--${viewTransitionName('filter-choice', instanceId, set.id, choice.id)}`}
						<svelte:element
							this={navigates ? 'a' : 'label'}
							href={navigates ? choice.href : undefined}
							aria-current={navigates && checked ? 'page' : undefined}
							data-input={navigates ? '' : undefined}
							data-link={navigates ? 'camouflaged' : undefined}
							data-filter-choice={choice.id || 'all'}
							data-has-icon={choice.icon ? '' : undefined}
							data-active-choice={checked && choice.id ? '' : undefined}
							data-row="gap-3"
							style:--active-index={activeIndex}
						>
							{#if !navigates}<input
								type={set.cardinality === 'exclusive' ? 'radio' : 'checkbox'}
								name={set.id}
								value={choice.id}
								defaultChecked={defaultChoices.has(choice)}
								{checked}
									disabled={!interactive}
								onchange={() => {
									updateFilters(() => {
										activeChoices = changeFilterChoice(filterSets, activeChoices, choice)
									})
								}}
							/>{/if}

							<span
								class="choice-icon-helipad"
								style:--choice-anchor={choiceAnchor}
								style:--choice-block-timeline={`${choiceAnchor}-block`}
							>
								<span class="choice-position" data-view-transition="named" style:--choice-motion-name={viewTransitionName(instanceId, set.id, choice.id)}>
								<span class="choice-icon" data-icon={choice.icon ? '' : undefined} aria-hidden="true">
									{#if choice.icon}{@html choice.icon}{:else}{choice.compactLabel ?? choice.label}{/if}
								</span>
								</span>
							</span>

							<span class="label" data-row-item="flexible">{choice.label}</span>
							<span class="count"><span hidden>(</span>{count}<span hidden>)</span></span>
						</svelte:element>
					{/each}
				</div>
			</fieldset>
		{/if}
	{/each}

	<button type="reset" data-reset="group" disabled={!interactive}>Reset filters</button>
	<button type="button" data-reset="all" disabled={!interactive} aria-label={`Reset ${restProps['aria-label'] ?? 'filters'}`} onclick={() => reset(filterSets)}>Reset filters</button>
</form>

<style>
	@property ---filter-inlineFraction {
		syntax: '<number>';
		inherits: true;
		initial-value: 1;
	}
	@property ---filter-blockFraction {
		syntax: '<number>';
		inherits: true;
		initial-value: 1;
	}
	@property ---filter-closedInlineFraction {
		syntax: '<number>';
		inherits: true;
		initial-value: 1;
	}
	@property ---filter-closedBlockFraction {
		syntax: '<number>';
		inherits: true;
		initial-value: 1;
	}
	@keyframes filter-inline-measure {
		from { ---filter-inlineFraction: 0; }
		to { ---filter-inlineFraction: 1; }
	}
	@keyframes filter-block-measure {
		from { ---filter-blockFraction: 0; }
		to { ---filter-blockFraction: 1; }
	}
	@keyframes filter-closed-inline-measure {
		from { ---filter-closedInlineFraction: 0; }
		to { ---filter-closedInlineFraction: 1; }
	}
	@keyframes filter-closed-block-measure {
		from { ---filter-closedBlockFraction: 0; }
		to { ---filter-closedBlockFraction: 1; }
	}
	[data-reset="all"] { display: none; }

	fieldset {
		&[data-column] { ---column-gap: 0.33em; }
	}

	@container wallet-table (width >= 42rem) {
		fieldset:not([data-panel-member]) {
			position: fixed;
			visibility: hidden;
			pointer-events: none;
			[data-active-choice] .choice-icon { visibility: visible; }
		}
	}

	legend {
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.75em;
		color: var(--text-secondary);
	}

	[data-filter-choice] {
		transition-property: background-color, border-color, color, opacity;

		&:hover { background-color: color-mix(in srgb, currentColor 10%, transparent); }

		&:is(:has(input:checked), [aria-current="page"]) {
			background-color: var(--accent-backgroundColor);
			border-color: var(--accent);
			color: var(--accent);
		}
	}

	input {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		opacity: 0;
	}

	.choice-icon-helipad {
		display: grid;
		place-items: center;
		inline-size: 1.25em;
		block-size: 1.25em;
		anchor-name: var(--choice-anchor);
	}

	.choice-position {
		display: contents;
		--view-transition-name: none;
	}

	.choice-icon {
		display: grid;
		place-items: center;
		min-inline-size: 1.25em;
		min-block-size: 1.25em;
		font-size: 0.75em;
		font-weight: 700;
		line-height: 1;
		:global(svg) { inline-size: 100%; block-size: 100%; }
	}

	:where(form[data-anchored]) [data-active-choice] .choice-icon-helipad {
		---filter-clusterSize: var(--filter-cluster-size, 1.3rem);
		---filter-packingStartAngle: -90deg;
		---filter-packingAngle: calc(var(---filter-packingStartAngle) + var(--active-index) * 1turn / max(var(--active-count), 1));
		---filter-packingRadius: calc(
			0.5 * var(---filter-clusterSize) * sin(0.5turn / max(var(--active-count), 2))
			/ (1 + sin(0.5turn / max(var(--active-count), 2)))
		);
		---filter-packingDistance: calc(0.5 * var(---filter-clusterSize) - var(---filter-packingRadius));
	}

	:where(form[data-anchored]) [data-active-choice] .choice-icon {
		position: fixed;
		min-inline-size: 0;
		min-block-size: 0;
		position-anchor: var(--closed-anchor);
		inset: auto;
		top: anchor(center);
		left: anchor(center);
		z-index: 8;
		inline-size: calc(2 * var(---filter-packingRadius));
		block-size: calc(2 * var(---filter-packingRadius));
		border-radius: 50%;
		background: var(--accent-backgroundColor);
		color: var(--accent);
		translate:
			calc(-50% + cos(var(---filter-packingAngle)) * var(---filter-packingDistance))
			calc(-50% + sin(var(---filter-packingAngle)) * var(---filter-packingDistance));
		transition-property: none;
		pointer-events: none;
	}

	[data-active-count="1"] [data-active-choice] .choice-icon-helipad {
		---filter-packingRadius: calc(0.5 * var(---filter-clusterSize));
		---filter-packingDistance: 0px;
	}

	[data-active-count="2"] [data-active-choice] .choice-icon-helipad {
		---filter-packingStartAngle: 0deg;
	}

	[data-active-count="4"] [data-active-choice] .choice-icon-helipad {
		---filter-packingStartAngle: 45deg;
	}

	:global([popover]:popover-open) form [data-panel-member] [data-active-choice] .choice-icon {
		position-anchor: var(--choice-anchor);
		inline-size: 1.25em;
		block-size: 1.25em;
		translate: -50% -50%;
		background: transparent;
	}

	/* Each endpoint has a permanent measurement owner: the set owns its shared
	 * header position, and each helipad owns its slot. Native anchoring owns the
	 * sticky position; view clocks supply only the open slot's relative offset.
	 * No probe changes its anchor on open/close. */
	@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and (timeline-scope: --filter-inline) and (scale: calc(1px / 1px)) {
		@container wallet-table (width >= 42rem) {
			fieldset:not([data-active-count="0"]),
			[data-active-choice] .choice-icon-helipad {
				&::before, &::after {
					content: '';
					position: fixed;
					inset: 0 auto auto 0;
					visibility: hidden;
					pointer-events: none;
				}
				&::before {
					right: anchor(center);
					block-size: 1px;
				}
				&::after {
					bottom: anchor(center);
					inline-size: 1px;
				}
			}
			fieldset:not([data-active-count="0"]) {
				timeline-scope: var(--closed-anchor), var(--closed-block-timeline);
				animation: filter-closed-inline-measure auto linear both, filter-closed-block-measure auto linear both;
				animation-timeline: var(--closed-anchor), var(--closed-block-timeline);
				&::before, &::after { position-anchor: var(--closed-anchor); }
				&::before { view-timeline: var(--closed-anchor) inline 0; }
				&::after { view-timeline: var(--closed-block-timeline) block 0; }
			}
			[data-active-choice] .choice-icon-helipad {
				timeline-scope: var(--choice-anchor), var(--choice-block-timeline);
				animation: filter-inline-measure auto linear both, filter-block-measure auto linear both;
				animation-timeline: var(--choice-anchor), var(--choice-block-timeline);
				&::before, &::after { position-anchor: var(--choice-anchor); }
				&::before { view-timeline: var(--choice-anchor) inline 0; }
				&::after { view-timeline: var(--choice-block-timeline) block 0; }
			}
			[data-active-choice] .choice-icon {
				inset: auto;
				top: anchor(center);
				left: anchor(center);
				inline-size: var(---filter-clusterSize);
				block-size: var(---filter-clusterSize);
				translate: none;
				transform:
					translate(
						calc(-50% + cos(var(---filter-packingAngle)) * var(---filter-packingDistance)),
						calc(-50% + sin(var(---filter-packingAngle)) * var(---filter-packingDistance))
					)
					scale(calc(2 * var(---filter-packingRadius) / var(---filter-clusterSize)));
				transition-property: transform;
			}
			:global([popover]:popover-open) form [data-panel-member] [data-active-choice] {
				.choice-icon {
					position-anchor: var(--closed-anchor);
					inline-size: var(---filter-clusterSize);
					block-size: var(---filter-clusterSize);
					translate: none;
					transform: translate(
						calc(100vw * (1 / var(---filter-inlineFraction) - 1 / var(---filter-closedInlineFraction)) - 50%),
						calc(100vh * (1 / var(---filter-blockFraction) - 1 / var(---filter-closedBlockFraction)) - 50%)
						) scale(calc(1.25em / var(---filter-clusterSize)));
				}
			}
		}
	}
	@supports not ((animation-timeline: scroll()) and (animation-range: 0% 100%) and (timeline-scope: --filter-inline) and (scale: calc(1px / 1px))) {
		@container wallet-table (width >= 42rem) {
			:where(form[data-anchored]) [data-active-choice] .choice-position {
				--view-transition-name: var(--choice-motion-name);
				display: block;
				position: fixed;
				position-anchor: var(--closed-anchor);
				inset: auto;
				left: calc(anchor(center) + cos(var(---filter-packingAngle)) * var(---filter-packingDistance) - var(---filter-clusterSize) / 2);
				top: calc(anchor(center) + sin(var(---filter-packingAngle)) * var(---filter-packingDistance) - var(---filter-clusterSize) / 2);
				inline-size: var(---filter-clusterSize);
				block-size: var(---filter-clusterSize);
				visibility: visible;
				pointer-events: none;
				z-index: 8;
				transition-property: none;
			}

			:where(form[data-anchored]) [data-active-choice] .choice-icon,
			:global([popover]:popover-open) form[data-anchored] [data-panel-member] [data-active-choice] .choice-icon {
				position: static;
				inline-size: var(---filter-clusterSize);
				block-size: var(---filter-clusterSize);
				translate: none;
				transform: scale(tan(atan2(calc(2 * var(---filter-packingRadius)), var(---filter-clusterSize))));
				transition-property: transform;
			}

			:global([popover]:popover-open) form[data-anchored] [data-panel-member] [data-active-choice] {
				.choice-position {
					position-anchor: var(--choice-anchor);
					left: calc(anchor(center) - var(---filter-clusterSize) / 2);
					top: calc(anchor(center) - var(---filter-clusterSize) / 2);
				}
				.choice-icon { transform: scale(tan(atan2(1.25em, var(---filter-clusterSize)))); }
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		[data-active-choice] .choice-icon { transition-property: none; }
	}

	.count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 1.35em;
		padding: 0.3em 0.5em;
		border-radius: 0.85em;
		background-color: var(--accent-backgroundColor);
		color: var(--accent);
		font-size: smaller;
		line-height: 1;
	}

	:is(label:has(input:checked), a[aria-current="page"]) .count {
		background-color: var(--accent);
		color: var(--accent-backgroundColor);
	}

	@container wallet-table (width < 42rem) {
		form {
			&[data-row] {
				flex-wrap: nowrap;
				align-items: center;
			}
			inline-size: max-content;
		}

		fieldset,
		.choices {
			&[data-column] {
				flex-direction: row;
				align-items: center;
			}
		}

		legend {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		[data-filter-choice] {
			&[data-row] { justify-content: center; }
			inline-size: 2.5rem;
			block-size: 2.5rem;
			padding: 0;
			border-radius: 50%;
		}

		[data-filter-choice] .label {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		.count {
			position: absolute;
			inset-block-start: 0;
			inset-inline-end: 0;
			translate: 25% -25%;
			min-inline-size: 1.1em;
			padding: 0.15em 0.35em;
			font-size: 0.65em;
			pointer-events: none;
		}

		[data-active-choice] .choice-icon,
		:global([popover]:popover-open) form [data-active-choice] .choice-icon {
			position: static;
			inline-size: 1.25em;
			block-size: 1.25em;
			translate: none;
			background: transparent;
		}

		.choice-icon { opacity: 1; }

		.choice-icon,
		.choice-icon-helipad {
			inline-size: 1.4rem;
			block-size: 1.4rem;
		}

		[data-reset="group"] { display: none; }
		[data-reset="all"] {
			display: inline-grid;
			inline-size: 2.5rem;
			block-size: 2.5rem;
			border-radius: 50%;
			font-size: 0;

			&::before {
				content: '\21ba';
				font-size: 1rem;
			}
		}
	}

</style>
