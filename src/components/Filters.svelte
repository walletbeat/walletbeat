<script module lang="ts">
	export type Filter<Item, FilterId extends string = string> = {
		id: FilterId
		label: string
		icon?: string
		filterFunction?: (item: Item) => boolean
	}

	export type FilterGroup<Item, FilterId extends string = string> = {
		id: string
		label: string
		displayType?: 'select' | 'group'
		filters: Filter<Item, FilterId>[]
	} & (
		| {
			exclusive: true
			defaultFilter?: FilterId
		}
		| {
			exclusive: false
			defaultFilters?: FilterId[]
		}
	)
</script>


<script lang="ts" generics="
	Item
">
	// Types/constants
	import type { SvelteHTMLElements } from 'svelte/elements'
	import type { Snippet } from 'svelte'


	// Props
	let {
		items,
		filterGroups,
		activeFilters = $bindable(new Set<Filter<Item>>()),
		filteredItems = $bindable(items),
		toggleFilter = $bindable(),
		toggleFilterById = $bindable(),
		...restProps
	}: SvelteHTMLElements['form'] & {
		items: Item[]
		filterGroups: FilterGroup<Item>[]
		activeFilters?: Set<Filter<Item>>
		filteredItems: Item[]
		toggleFilter?: typeof _toggleFilter
		toggleFilterById?: typeof _toggleFilterById
	} = $props()


	// State
	// (Derived)
	const filterItems = (filters: Set<Filter<Item>>) => (
		items.filter(item => (
			Array.from(filters)
				.every(filter => filter.filterFunction?.(item) ?? true)
		))
	)

	$effect(() => {
		filteredItems = filterItems(activeFilters)
	})


	// Actions
	const _toggleFilter = (filter: Filter<Item>, exclusive = false) => {
		if (!activeFilters.has(filter)) {
			const filterGroup = (
				filterGroups
					.find(group => group.filters.includes(filter))
			)

			if (filterGroup && (exclusive || filterGroup.exclusive))
				activeFilters = activeFilters.difference(new Set(filterGroup.filters))

			activeFilters = activeFilters.union(new Set([filter]))
		} else {
			activeFilters = activeFilters.difference(new Set([filter]))
		}
	}
	toggleFilter = _toggleFilter

	const _toggleFilterById = (filterId: string, exclusive = false) => {
		const filter = filterGroups
			.flatMap(group => group.filters)
			.find(filter => filter.id === filterId)

		if (!filter) return

		toggleFilter(filter, exclusive)
	}
	toggleFilterById = _toggleFilterById


	// Components
	import Select from '@/components/Select.svelte'
</script>


{#snippet filterItemContent(
	filter: Filter<Item>,
	count: number
)}
	<span class="icon" aria-hidden="true">{@html filter.icon}</span>
	<span class="label">{filter.label}</span>
	<span class="count">
		<span hidden>(</span>{count}<span hidden>)</span>
	</span>
{/snippet}

<form
	class="menu"
	data-card="padding-5 radius-4"
	data-row="gap-6 wrap"
	{...restProps}
>
	{#each (
		filterGroups
			.map(group => ({
				group,
				visibleFilters: (
					group.filters
						.filter(filter => filterItems(new Set([filter])).length > 0)
				)
			}))
			.filter(({ group, visibleFilters }) => (
				visibleFilters.filter(filter => filter.id).length > 1
			))
	) as { group, visibleFilters } (group.id)}
		{@const filters = new Set(visibleFilters)}
		{@const filterById = new Map(visibleFilters.map(f => [f.id, f]))}

		<fieldset
			data-filter-group={group.id}
			data-column="gap-1"
		>
			<legend>{group.label}</legend>

			{#if group.exclusive}
				{#if group.displayType === 'select'}
					<!-- Single Select -->
					<Select
						defaultValue={group.defaultFilter ?? ''}
						bind:value={
							() => (
								Array.from(activeFilters.intersection(filters))[0]?.id
								|| ''
							),

							(filterId) => {
								activeFilters = filterId && filterId !== ''
									? activeFilters.difference(filters).union(new Set([filterById.get(filterId)!]))
									: activeFilters.difference(filters)
							}
						}
						options={
							visibleFilters
								.map(filter => ({
									value: filter.id,
									icon: filter.icon,
									label: filter.label,
								}))
						}
						aria-label="Filter by {group.label.toLowerCase()}"
					>
						{#snippet optionContent(option)}
							{@const filter = filterById.get(option.value)!}
							{@const count = filterItems(activeFilters.difference(filters).union(new Set([filter]))).length}
							{@render filterItemContent(filter, count)}
						{/snippet}
					</Select>

				{:else if group.displayType === 'group'}
					<!-- Radio Button Group -->
					{@const activeFilter = Array.from(activeFilters.intersection(filters))[0] ?? null}

					<div class="group" data-column="gap-1">
						{#each visibleFilters as filter}
							{@const count = filterItems(activeFilters.difference(filters).union(new Set([filter]))).length}

							<label
								data-filter={filter.id}
								data-column="gap-3"
								class:disabled={count === 0}
							>
								<input
									type="radio"
									name={group.id}
									value={filter.id}
									defaultChecked={group.defaultFilter === filter.id}
									checked={activeFilter === filter}
									disabled={count === 0}
									onchange={() => {
										activeFilters = activeFilters.difference(filters).union(new Set([filter]))
									}}
								/>
								{@render filterItemContent(filter, count)}
							</label>
						{/each}
					</div>
				{/if}

			{:else}
				{#if group.displayType === 'select'}
					<!-- Multiple Select -->
					<select
						multiple
						defaultValue={group.defaultFilters ?? []}
						bind:value={
							() => (
								Array.from(
									activeFilters.intersection(filters),
									filter => filter.id
								)
							),

							(filterIds) => {
								activeFilters = (
									activeFilters
										.difference(filters)
										.union(
											new Set(
												filterIds.map(filterId => filterById.get(filterId)!)
											)
										)
								)
							}
						}
						aria-label="Filter by {group.label.toLowerCase()}"
					>
						{#each visibleFilters as filter (option.value)}
							{@const count = filterItems(activeFilters.difference(filters).union(new Set([filter]))).length}

							<option
								value={filter.id}
							>
								{@render filterItemContent(filter, count)}
							</option>
						{/each}
					</select>

				{:else if group.displayType === 'group'}
					<!-- Checkbox Group (default and group with multiple) -->
					<div class="group" data-column="gap-1">
						{#each visibleFilters as filter}
							{@const isChecked = activeFilters.has(filter)}
							{@const count = filterItems(
								isChecked ?
									activeFilters
								:
									activeFilters.symmetricDifference(new Set([filter]))
							).length}

							<label
								data-filter={filter.id}
								data-column="gap-3"
								class:disabled={count === 0 && !isChecked}
							>
								<input
									type="checkbox"
									defaultChecked={group.defaultFilters?.includes(filter.id)}
									bind:checked={
										() => activeFilters.has(filter),

										(checked) => {
											const newActiveFilters = new Set(activeFilters)
											if (checked) {
												newActiveFilters.add(filter)
											} else {
												newActiveFilters.delete(filter)
											}
											activeFilters = newActiveFilters
										}
									}
									disabled={count === 0 && !isChecked}
								/>
								{@render filterItemContent(filter, count)}
							</label>
						{/each}
					</div>
				{/if}
			{/if}
		</fieldset>
	{/each}

	<button
		type="reset"
	>
		Reset Filters
	</button>
</form>


<style>
	form {
		align-items: start;

		> [data-filter-group] {
			gap: 0.33em;

			&:is(fieldset) {
				border: none;
			}

			> legend {
				display: contents;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				font-size: 0.75em;
				color: var(--text-secondary);
			}

			> .group {
			}

			> select[multiple] {
				min-height: 8em;
				padding: 0.25em;
				border: 1px solid rgba(255, 255, 255, 0.2);
				border-radius: 0.375em;
				background: rgba(0, 0, 0, 0.2);
				color: inherit;
				font-size: 0.875em;

				option {
					padding: 0.25em;
					background: var(--bg-primary);
					color: inherit;
				}
			}

			[data-filter],
			:global(option) {
				cursor: pointer;

				align-items: center;
				grid-template-columns: 1em 1fr auto;
				grid-auto-flow: column;

				transition-property: background-color, border-color, color;

				&:hover:not(.disabled) {
					background-color: rgba(255, 255, 255, 0.1);
				}

				&.disabled {
					cursor: not-allowed;
					opacity: 0.4;
				}

				&:has(input:checked) {
					background-color: var(--accent-backgroundColor);
					border-color: var(--accent);
					color: var(--accent);
				}

				input[type="radio"],
				input[type="checkbox"] {
					display: none;
				}

				.label {
					flex: 1;
					text-align: left;
				}
			}
		}
	}

	.count {
		font-size: smaller;

		display: inline-flex;
		align-items: center;
		justify-content: center;

		background-color: var(--accent-backgroundColor);
		color: var(--accent);
		border-radius: 0.85em;
		padding: 0.3em 0.5em;
		line-height: 1;

		label:has(input:checked) &,
		option:checked & {
			background-color: var(--accent);
			color: var(--accent-backgroundColor);
		}
	}

	/* Hide reset button when form is in default state */
	form:not(
		:has(
			:is(
				input[type="checkbox"],
				input[type="radio"]
			):is(
				[checked]:not(:checked),
				:not([checked]):checked
			),
			select option:is(
				[selected]:not(:checked),
				:not([selected]):checked
			)
		)
	) button[type="reset"] {
		display: none;
		opacity: 0;
	}
</style>
