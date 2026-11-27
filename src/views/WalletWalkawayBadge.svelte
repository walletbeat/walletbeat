<script lang="ts">
	// Types/constants
	import { stageCriterionRatings } from '@/schema/stages'
	import type { WalletWalkawayEvaluation } from '@/schema/walkaway'
	import { walkawayTestResultLabels } from '@/utils/walkaway'


	// Props
	const {
		evaluation,
		size = 'medium',
		href = '/walkaway/',
	}: {
		evaluation: WalletWalkawayEvaluation<string>
		size?: 'small' | 'medium' | 'large'
		href?: string
	} = $props()


	// Derived
	const display = $derived(walkawayTestResultLabels[evaluation.result])

	const title = $derived(
		[
			display.title,
			...evaluation.criteria.map(({ criterion, evaluation: criterionEvaluation }) =>
				`${stageCriterionRatings[criterionEvaluation.rating].icon} ${criterion.displayName}`
			),
		].join('\n')
	)
</script>


<a {href} data-link="camouflaged">
	<data
		data-badge={size}
		value={evaluation.result}
		{title}
		style:--accent={stageCriterionRatings[evaluation.result].color}
	>
		Walkaway: {display.label}
	</data>
</a>


<style>
	data {
		&[value='UNRATED'] {
			--badge-backdropFilter: var(--rating-unrated-backdropFilter);

			border-style: dashed;
		}
	}
</style>
