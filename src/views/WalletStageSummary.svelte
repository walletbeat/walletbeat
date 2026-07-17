<script lang="ts" generics="
	_AttributeGroupId extends string
">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import {
		StageCriterionRating,
		stageCriterionRatings,
		type StageEvaluatableWallet,
		type WalletLadderEvaluation,
		type WalletStage,
	} from '@/schema/stages'
	import { wbIconEmojiSequences } from '@/styles/wbicons'
	import { isTypographicContent } from '@/types/content'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { getWalletUrl } from '@/utils/urls'
	import { attributesById, getCriterionAttributeId } from '@/utils/stage-attributes'


	// Props
	const {
		wallet,
		stage,
		ladderEvaluation,
		showNextStageCriteria = true,
	}: {
		wallet: RatedWallet<_AttributeGroupId>
		stage: WalletStage<_AttributeGroupId> | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
		ladderEvaluation: WalletLadderEvaluation<_AttributeGroupId> | null
		showNextStageCriteria?: boolean
	} = $props()


	// (Derived)
	const stageEvaluatableWallet: StageEvaluatableWallet<_AttributeGroupId> = $derived({
		types: wallet.types,
		variants: wallet.variants,
		variantSpecificity: wallet.variantSpecificity,
		overall: wallet.overall,
		overrides: wallet.overrides,
	})

	const ladderDefinition = $derived(
		ladderEvaluation?.ladder ?? null
	)

	const stage0 = $derived(
		ladderDefinition?.stages[0] ?? null
	)

	const currentStageIndex = $derived(
		(!stage || typeof stage === 'string' || !ladderDefinition) ?
			null
		:
			ladderDefinition.stages.findIndex(ladderStage => ladderStage.id === stage.id)
	)

	const currentStage = $derived(
		(currentStageIndex === null || !ladderDefinition) ?
			null
		:
			ladderDefinition.stages[currentStageIndex] ?? null
	)

	const nextStage = $derived(
		(currentStageIndex === null || !ladderDefinition) ?
			null
		: currentStageIndex + 1 < ladderDefinition.stages.length ?
			ladderDefinition.stages[currentStageIndex + 1]
		:
			null
	)

	const displayStage = $derived(
		(stage === 'QUALIFIED_FOR_NO_STAGES' && stage0) ?
			stage0
		:
			currentStage
	)

	const targetStage = $derived(
		showNextStageCriteria ?
			(stage === 'QUALIFIED_FOR_NO_STAGES' ? stage0 : nextStage)
		: stage === 'QUALIFIED_FOR_NO_STAGES' ?
			stage0
		: stage === 'NOT_APPLICABLE' || stage === null ?
			null
		:
			displayStage
	)

	const criteria = $derived(
		!targetStage ?
			[]
		:
			targetStage.criteriaGroups.flatMap(criteriaGroup =>
				criteriaGroup.criteria
					.map(criterion => ({
						criteriaGroup,
						criterion,
						evaluation: criterion.evaluate(stageEvaluatableWallet),
					}))
					.filter(({ evaluation }) =>
						!showNextStageCriteria || evaluation.rating !== StageCriterionRating.PASS
					)
			)
	)


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
				<a data-link="camouflaged" href={getWalletUrl(wallet, { attributeAnchor: 'stages' })}>
					<WalletStageBadge
						stage={stage}
						ladderEvaluation={ladderEvaluation}
						size="large"
					/>
				</a>
			</h3>
		</header>
	{:else if displayStage}
		<header data-column="gap-2">
			<h3 data-row="gap-2 start">
				<a
					data-link="camouflaged"
					href={getWalletUrl(wallet, { attributeAnchor: displayStage.id })}
				>
					<WalletStageBadge
						stage={displayStage}
						ladderEvaluation={ladderEvaluation}
						size="large"
					/>
				</a>
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
					<a
						data-link="camouflaged"
						href={getWalletUrl(wallet, { attributeAnchor: targetStage.id })}
					>
						<WalletStageBadge
							stage={targetStage}
							ladderEvaluation={ladderEvaluation}
							size="medium"
						/>
					</a>:
				</h4>
			{/if}

			<ul>
				{#each criteria as { criterion, evaluation } (criterion.id)}
					{@const attributeId = getCriterionAttributeId(criterion)}
					{@const attribute = attributeId ? attributesById.get(attributeId) ?? null : null}
					{@const attributeName = attribute?.displayName ?? attributeId}
					{@const attributeLink = attributeId ? getWalletUrl(wallet, { attributeAnchor: slugifyCamelCase(attributeId) }) : null}

					<li
						data-list-item-marker={attribute?.icon ? wbIconEmojiSequences[attribute.icon] : undefined}
						data-stage-criterion-rating={evaluation.rating}
						style:--accent={stageCriterionRatings[evaluation.rating].color}
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
								title={stageCriterionRatings[evaluation.rating].label}
							>
								{stageCriterionRatings[evaluation.rating].icon}
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
	section {
		text-align: start;
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
