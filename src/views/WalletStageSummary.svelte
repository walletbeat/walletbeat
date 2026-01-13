<script lang="ts">
	// Types/constants
	import { isTypographicContent } from '@/types/content'
	import type { RatedWallet } from '@/schema/wallet'
	import { WalletLadderType, ladders } from '@/schema/ladders'
	import { StageCriterionRating, stageCriterionRatings, type StageEvaluatableWallet, type WalletLadderEvaluation, type WalletStage } from '@/schema/stages'
	import { getCriterionAttributeId, attributesById } from '@/utils/stage-attributes'
	import { slugifyCamelCase } from '@/types/utils/text'


	// Props
	const {
		wallet,
		stage,
		ladderEvaluation,
		showNextStageCriteria = true,
		onStageClick,
	}: {
		wallet: RatedWallet
		stage: WalletStage | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
		ladderEvaluation: WalletLadderEvaluation | null
		showNextStageCriteria?: boolean
		onStageClick?: (stageIndex: number) => void
	} = $props()


	// Derived
	const stageEvaluatableWallet: StageEvaluatableWallet = $derived({
		types: wallet.types,
		variants: wallet.variants,
		variantSpecificity: wallet.variantSpecificity,
		overall: wallet.overall,
		overrides: wallet.overrides,
	})
	const ladderType = $derived(
		ladderEvaluation ? 
			(Object.entries(wallet.ladders).find(([_, evaluation]) => evaluation === ladderEvaluation)?.[0] as WalletLadderType | undefined) ?? null
		: null
	)
	const ladderDefinition = $derived(ladderType ? ladders[ladderType] : null)
	const stage0 = $derived(ladderDefinition?.stages[0] ?? null)
	
	const currentStageIndex = $derived.by(() => {
		if (!stage || typeof stage === 'string' || !ladderDefinition) return null

		return ladderDefinition.stages.findIndex(s => s.id === stage.id)
	})
	
	const nextStage = $derived.by(() => {
		if (currentStageIndex === null || !ladderDefinition) return null

		const nextIndex = currentStageIndex + 1

		return nextIndex < ladderDefinition.stages.length ? ladderDefinition.stages[nextIndex] : null
	})
	
	const displayStage = $derived.by(() => {
		if (stage === 'QUALIFIED_FOR_NO_STAGES' && stage0) return stage0

		return stage && typeof stage !== 'string' ? stage : null
	})
	
	// Target stage: what criteria to show
	const targetStage = $derived.by(() => {
		if (showNextStageCriteria) {
			return stage === 'QUALIFIED_FOR_NO_STAGES' ? stage0 : nextStage
		}

		if (stage === 'QUALIFIED_FOR_NO_STAGES') return stage0

		if (stage === 'NOT_APPLICABLE' || stage === null) return null

		return displayStage
	})
	const criteria = $derived.by(() => {
		if (!targetStage || typeof targetStage !== 'object' || !('criteriaGroups' in targetStage)) {
			return []
		}
		
		return targetStage.criteriaGroups.flatMap(criteriaGroup =>
			criteriaGroup.criteria
				.filter(criterion => typeof criterion.evaluate === 'function')
				.map(criterion => ({
					criteriaGroup,
					criterion,
					evaluation: criterion.evaluate(stageEvaluatableWallet),
				}))
				.filter(({ evaluation }) => 
					!showNextStageCriteria || evaluation.rating !== StageCriterionRating.PASS
				)
		)
	})
	
	
	// Helper to wrap badge with click handler or link
	const handleBadgeClick = (clickedStage: WalletStage | null) => (e: MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (clickedStage && ladderDefinition) {
			const stageIndex = ladderDefinition.stages.findIndex(s => s.id === clickedStage.id)

			if (stageIndex >= 0) {
				onStageClick?.(stageIndex)
			}
		}
	}


	// Components
	import Typography from '@/components/Typography.svelte'
	import WalletStageBadge from './WalletStageBadge.svelte'
</script>


<section data-column>
	{#if stage === 'NOT_APPLICABLE'}
		<header data-column="gap-2">
			<h2 data-row="gap-2">
				<WalletStageBadge stage={stage} ladderEvaluation={ladderEvaluation} size="large" />
			</h2>
		</header>
		<p>
			Stage rating is not applicable to this wallet.
		</p>
	{:else if stage === 'QUALIFIED_FOR_NO_STAGES'}
		<header data-column="gap-2">
			<h3 data-row="gap-2">
				{#if onStageClick}
					<button type="button" onclick={handleBadgeClick(stage0)}>
						<WalletStageBadge stage={stage} ladderEvaluation={ladderEvaluation} size="large" />
					</button>
				{:else}
					<WalletStageBadge stage={stage} ladderEvaluation={ladderEvaluation} size="large" />
				{/if}
			</h3>
		</header>
	{:else if displayStage}
		<header data-column="gap-2">
			<h3 data-row="gap-2 start">
				{#if onStageClick}
					<button type="button" onclick={handleBadgeClick(displayStage)}>
						<WalletStageBadge stage={displayStage} ladderEvaluation={ladderEvaluation} size="large" />
					</button>
				{:else}
					<a data-link="camouflaged" href={`/${wallet.metadata.id}/#stage-${displayStage.id}`}>
						<WalletStageBadge stage={displayStage} ladderEvaluation={ladderEvaluation} size="large" />
					</a>
				{/if}
				{#if isTypographicContent(displayStage.description)}
					<Typography content={displayStage.description} />
				{:else}
					{displayStage.id}
				{/if}
			</h3>
		</header>
	{/if}

	{#if targetStage && criteria.length > 0 && displayStage}
		{#if showNextStageCriteria}
			<hr>
		{/if}

		<section data-column="gap-4">
			{#if showNextStageCriteria && targetStage && typeof targetStage === 'object'}
				<h4>
					Criteria needed to advance to
					{#if onStageClick}
						<button type="button" onclick={handleBadgeClick(targetStage)}>
							<WalletStageBadge stage={targetStage} ladderEvaluation={ladderEvaluation} size="medium" />
						</button>
					{:else}
						<a data-link="camouflaged" href={`/${wallet.metadata.id}/#stage-${targetStage.id}`}>
							<WalletStageBadge stage={targetStage} ladderEvaluation={ladderEvaluation} size="large" />
						</a>
					{/if}
					:
				</h4>
			{/if}

			<ul>
				{#each criteria as { criterion, evaluation }}
					{@const attributeId = getCriterionAttributeId(criterion)}
					{@const attribute = attributeId ? attributesById.get(attributeId) ?? null : null}
					{@const attributeName = attribute?.displayName ?? attributeId}
					{@const attributeLink = attributeId ? `/${wallet.metadata.id}/#${slugifyCamelCase(attributeId)}` : null}

					<li
						data-list-item-marker={attribute?.icon}
						data-stage-criterion-rating={evaluation.rating}
						style:--accent={stageCriterionRatings[evaluation.rating as StageCriterionRating].color}
					>
						<span data-row="start gap-2">
							<span data-row-item="flexible">
								{#if attributeName}
									{#if attributeLink}
										<a href={attributeLink} title={attributeName}>
											<strong>{attributeName}</strong>
										</a>:
									{:else}
										<strong>{attributeName}</strong>:
									{/if}
									<span>
										{#if isTypographicContent(criterion.description)}
											<Typography content={criterion.description} />
										{:else}
											{criterion.id}
										{/if}
									</span>
								{:else}
									{#if isTypographicContent(criterion.description)}
										<Typography content={criterion.description} />
									{:else}
										{criterion.id}
									{/if}
								{/if}
							</span>

							<data
								value={evaluation.rating}
								title={stageCriterionRatings[evaluation.rating as StageCriterionRating].label}
							>
								{stageCriterionRatings[evaluation.rating as StageCriterionRating].icon}
							</data>
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{:else if showNextStageCriteria && nextStage}
		<p>
			<strong>All criteria met for next stage!</strong>
		</p>
	{/if}
</section>


<style>
	button {
		background: none;
		border: none;
		padding: 0;
	}

	li > span > span:last-child {
		color: var(--text-secondary);
	}

	[data-stage-criterion-rating] {
		&[data-stage-criterion-rating="EXEMPT"] {
			text-decoration: line-through;
			opacity: 0.6;
		}
	}
</style>
