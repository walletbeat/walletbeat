<script lang="ts">
	// Types/constants
	import { type WalletLadderEvaluation, type WalletStage } from '@/schema/stages'
	import { stageToColor } from '@/utils/colors'


	// Props
	const {
		stage,
		ladderEvaluation,
		size = 'medium',
	}: {
		stage: WalletStage | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
		ladderEvaluation: WalletLadderEvaluation | null
		size?: 'small' | 'medium' | 'large'
	} = $props()


	// Derived
	const stageValue = $derived.by(() => {
		if (stage === 'NOT_APPLICABLE' || stage === null || ladderEvaluation === null) {
			return 'NOT_APPLICABLE'
		}

		if (stage === 'QUALIFIED_FOR_NO_STAGES') {
			return 'QUALIFIED_FOR_NO_STAGES'
		}

		return stage.id
	})
	
	const stageIndex = $derived(
		stage && typeof stage === 'object' && ladderEvaluation ?
			ladderEvaluation.ladder.stages.findIndex(s => s.id === stage.id)
		:
			null
	)

	const maxStages = $derived(
		ladderEvaluation?.ladder.stages.length ?? 3
	)

	const stageColor = $derived(
		stageIndex !== null && stageIndex >= 0 ? stageToColor(stageIndex, maxStages) : undefined
	)

</script>


<data
	data-badge={size}
	value={stageValue === 'QUALIFIED_FOR_NO_STAGES' ? 'NO_STAGES' : stageValue === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : stageValue}
	title={stageValue === 'QUALIFIED_FOR_NO_STAGES' ? 'Wallet did not qualify for any stages' : stageValue === 'NOT_APPLICABLE' ? 'Stage rating not applicable to this wallet' : undefined}
	style:--accent={stageColor}
>
	{#if stageValue === 'NOT_APPLICABLE'}
		<small>N/A</small>
	{:else if stageValue === 'QUALIFIED_FOR_NO_STAGES'}
		<small>No Stage</small>
	{:else if stage && typeof stage === 'object'}
		<strong>
			{stage.label}
		</strong>
	{/if}
</data>


<style>
	data {
		&[value='NO_STAGES'],
		&[value='NOT_APPLICABLE'] {
			--accent: var(--rating-unrated);
		}
	}
</style>

