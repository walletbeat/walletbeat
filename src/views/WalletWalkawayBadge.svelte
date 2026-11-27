<script lang="ts">
	// Types/constants
	import { stageCriterionRatings } from '@/schema/stages'
	import { WalkawayTestResult, type WalletWalkawayEvaluation } from '@/schema/walkaway'
	import { walkawayTestResults } from '@/utils/walkaway'


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
	const display = $derived(
		evaluation.result === WalkawayTestResult.NOT_APPLICABLE ? null : walkawayTestResults[evaluation.result]
	)

	const title = $derived(
		evaluation.result === WalkawayTestResult.NOT_APPLICABLE || display === null ?
			undefined
		:
			[
				display.title,
				...evaluation.criteria.map(({ criterion, evaluation: criterionEvaluation }) =>
					`${stageCriterionRatings[criterionEvaluation.rating].icon} ${criterion.displayName}`
				),
			].join('\n')
	)
</script>


{#if display !== null}
	<a {href} data-link="camouflaged">
		<data
			data-badge={size}
			value={evaluation.result}
			{title}
			style:--accent={display.color}
		>
			Walkaway: {display.label}
		</data>
	</a>
{/if}


<style>
	data {
		&[value='UNRATED'] {
			--badge-backdropFilter: var(--rating-unrated-backdropFilter);

			border-style: dashed;
		}
	}
</style>
