export type FilterChoice<Item, ChoiceId extends string = string> = {
	id: ChoiceId
	label: string
	compactLabel?: string
	icon?: string
	/** Native navigation when the choice has a server-rendered destination. */
	href?: string
	matches?: (item: Item) => boolean
}

type FilterSetBase<Item, ChoiceId extends string> = {
	id: string
	label: string
	choices: FilterChoice<Item, ChoiceId>[]
	match: 'union' | 'intersection'
	/** Keep zero-result choices visible when the vocabulary must remain stable. */
	alwaysShowChoices?: boolean
}

export type FilterSet<Item, ChoiceId extends string = string> = FilterSetBase<Item, ChoiceId> &
	(
		| {
				cardinality: 'exclusive'
				defaultChoice?: ChoiceId
		  }
		| {
				cardinality: 'inclusive'
				defaultChoices?: ChoiceId[]
		  }
	)

/**
 * Apply independent filter sets. An untouched set is neutral. A selected choice
 * without a predicate is the exclusive “All” sentinel and is neutral too.
 * Selecting every concrete choice in an inclusive set remains a real constraint.
 */
export const applyFilterSets = <Item>(
	items: Item[],
	sets: FilterSet<Item>[],
	activeChoices: Set<FilterChoice<Item>>,
): Item[] => {
	if (activeChoices.size === 0) {
		return items
	}

	const activeBySet = new Map<FilterSet<Item>, FilterChoice<Item>[]>()

	for (const choice of activeChoices) {
		const set = sets.find(candidate => candidate.choices.includes(choice))

		if (!set) {
			continue
		}

		activeBySet.set(set, [...(activeBySet.get(set) ?? []), choice])
	}

	return items.filter(item => {
		for (const [set, selected] of activeBySet) {
			const predicates = selected.flatMap(choice => (choice.matches ? [choice.matches] : []))

			if (predicates.length === 0) {
				continue
			}

			const passes =
				set.match === 'union'
					? predicates.some(matches => matches(item))
					: predicates.every(matches => matches(item))

			if (!passes) {
				return false
			}
		}

		return true
	})
}

export const changeFilterChoice = <Item>(
	sets: FilterSet<Item>[],
	activeChoices: Set<FilterChoice<Item>>,
	choice: FilterChoice<Item>,
	forceExclusive = false,
): Set<FilterChoice<Item>> => {
	const set = sets.find(candidate => candidate.choices.includes(choice))

	if (!set) {
		return activeChoices
	}

	if (activeChoices.has(choice)) {
		return activeChoices.difference(new Set([choice]))
	}

	const withoutSet =
		forceExclusive || set.cardinality === 'exclusive'
			? activeChoices.difference(new Set(set.choices))
			: activeChoices

	return withoutSet.union(new Set([choice]))
}

/** Reset only the sets owned by this group; choices in other groups survive. */
export const resetFilterSets = <Item>(
	sets: FilterSet<Item>[],
	activeChoices: Set<FilterChoice<Item>>,
): Set<FilterChoice<Item>> => {
	const owned = new Set(sets.flatMap(set => set.choices))
	const defaults = sets.flatMap(set => {
		const ids =
			set.cardinality === 'exclusive'
				? set.defaultChoice === undefined
					? []
					: [set.defaultChoice]
				: (set.defaultChoices ?? [])

		return set.choices.filter(choice => ids.includes(choice.id))
	})

	return activeChoices.difference(owned).union(new Set(defaults))
}
