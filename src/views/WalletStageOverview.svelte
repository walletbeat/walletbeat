<script lang="ts">
	// Types/constants
	import { isTypographicContent } from '@/types/content'
	import type { RatedWallet } from '@/schema/wallet'
	import { WalletLadderType, ladders } from '@/schema/ladders'
	import { StageCriterionRating, type WalletLadderEvaluation, type WalletStage } from '@/schema/stages'
	import { stageToColor } from '@/utils/colors'
	import { getCriterionAttributeId } from '@/utils/stage-attributes'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { attributeTree } from '@/schema/attribute-groups'


	// Components
	import Typography from '@/components/Typography.svelte'
	

// Props
	const {
		wallet,
		stage,
		ladderEvaluation,
	}: {
		wallet: RatedWallet
		stage: WalletStage | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
		ladderEvaluation: WalletLadderEvaluation | null
	} = $props()


	// Derived
	let ladderType = $derived.by(() => {
		if (!ladderEvaluation) {
			return null
		}

		for (const [type, evaluation] of Object.entries(wallet.ladders)) {
			if (evaluation === ladderEvaluation) {
				return type as WalletLadderType
			}
		}

		return null
	})
	let ladderDefinition = $derived.by(() => {
		if (!ladderType) {
			return null
		}

		return ladders[ladderType]
	})
	let stageEvaluatableWallet = $derived(wallet)
	let currentStageIndex = $derived.by(() => {
		if (!stage || typeof stage === 'string' || !ladderDefinition) {
			return null
		}

		return ladderDefinition.stages.findIndex(s => s.id === stage.id)
	})
	const defaultOpenStageIndex = $derived.by(() => {
		if (currentStageIndex === null || !ladderDefinition) {
			return ladderDefinition ? ladderDefinition.stages.length - 1 : null
		}

		const nextIndex = currentStageIndex + 1

		return nextIndex < ladderDefinition.stages.length ? nextIndex : ladderDefinition.stages.length - 1
	})
	const stagesToShow = $derived.by(() => {
		if (!ladderDefinition) {
			return []
		}

		return ladderDefinition.stages
	})

</script>


{#if ladderEvaluation !== null}
	<div
		data-column
		style:--accent={
			stage && typeof stage !== 'string' && currentStageIndex !== null ?
				stageToColor(currentStageIndex, ladderDefinition?.stages.length ?? 3)
			:
				'var(--rating-unrated)'
		}
	>
		<div data-column="gap-4">
			{#each stagesToShow as s, index}
				{@const stageIndex = index}
				{@const isCurrent = stage && typeof stage !== 'string' && stage.id === s.id}
				{@const allCriteria = s.criteriaGroups.flatMap(group => group.criteria)}
				{@const passedCriteria = allCriteria.filter(criterion => {
					const evaluation = criterion.evaluate(stageEvaluatableWallet)

					return evaluation.rating === StageCriterionRating.PASS
				})}
				{@const passedCount = passedCriteria.length}
				{@const totalCount = allCriteria.length}
				{@const allPassed = passedCount === totalCount}
				{@const isDefaultOpen = defaultOpenStageIndex === stageIndex}

				<details
					id={`stage-${stageIndex}`}
					open={isDefaultOpen}
					data-card="radius-8 padding-6 {isCurrent ? 'border-accent' : ''}"
					data-column="gap-0"
					style:--accent={stageToColor(stageIndex, ladderDefinition?.stages.length ?? 3)}
					style:--stage-background={isCurrent ? 'color-mix(in srgb, var(--accent) 10%, var(--background-primary))' : 'color-mix(in srgb, var(--accent) 5%, var(--background-primary))'}
				>
					<summary>
						<div data-row>
							<div data-row>
								<a data-link="camouflaged" href={`#stage-${stageIndex}`}>
									<data
										data-badge="medium"
										value={`STAGE_${stageIndex}`}
										style:--accent={stageToColor(stageIndex, ladderDefinition?.stages.length ?? 3)}
									>
										<strong>
											Stage {stageIndex}
										</strong>
									</data>
								</a>

								<span>
									<strong>
										{#if isTypographicContent(s.description)}
											<Typography content={s.description} />
										{:else}
											{s.id}
										{/if}
									</strong>
								</span>
							</div>
							<div data-row="gap-2">
								<span>{passedCount}/{totalCount}</span>
								<span>{allPassed ? '✅' : passedCount > 0 ? '⚠️' : '❌'}</span>
							</div>
						</div>
					</summary>

					<div data-column="gap-6" style:--stage-background={isCurrent ? 'color-mix(in srgb, var(--accent) 5%, var(--background-primary))' : 'color-mix(in srgb, var(--accent) 3%, var(--background-primary))'}>
						{#if s.criteriaGroups}
							<div data-column>
								{#each s.criteriaGroups as criteriaGroup}
									{@const groupEvaluations = ladderDefinition ? criteriaGroup.criteria.map(c => c.evaluate(stageEvaluatableWallet)) : []}
									{@const groupPassedCount = groupEvaluations.filter(e => e?.rating === StageCriterionRating.PASS).length}
									{@const groupTotalCount = groupEvaluations.length}
									{@const groupAllPassed = groupTotalCount > 0 && groupPassedCount === groupTotalCount}

									<details data-card="padding-5 secondary radius-4">
										<summary>
											<div data-row="gap-2">
												{#if isTypographicContent(criteriaGroup.description)}
													<h4>
														<Typography content={criteriaGroup.description} />
													</h4>
												{:else}
													<h4>{criteriaGroup.id}</h4>
												{/if}
												<div data-row="gap-2">
													<span>{groupPassedCount}/{groupTotalCount}</span>
													<span>{groupPassedCount === groupTotalCount ? '✅' : groupPassedCount > 0 ? '⚠️' : '❌'}</span>
												</div>
											</div>
										</summary>

										{#if criteriaGroup.criteria}
											<div>
												<ul data-card="padding-4">
													{#each criteriaGroup.criteria as criterion}
														{@const criterionEvaluation = ladderDefinition ? criterion.evaluate(stageEvaluatableWallet) : null}
														{@const ratingIcon = criterionEvaluation?.rating === StageCriterionRating.PASS ? '✅' :
															criterionEvaluation?.rating === StageCriterionRating.FAIL ? '❌' :
															criterionEvaluation?.rating === StageCriterionRating.EXEMPT ? '⚠️' :
															'❓'
														}
														{@const ratingColor = criterionEvaluation?.rating === StageCriterionRating.PASS ? 'var(--rating-pass)' :
															criterionEvaluation?.rating === StageCriterionRating.FAIL ? 'var(--rating-fail)' :
															criterionEvaluation?.rating === StageCriterionRating.EXEMPT ? 'var(--rating-exempt)' :
															'var(--rating-unrated)'
														}
														{@const attributeId = getCriterionAttributeId(criterion)}
														{@const attributeLink = attributeId ? `/${wallet.metadata.id}/#${slugifyCamelCase(attributeId)}` : null}
														{@const attribute = attributeId ? (() => {
															for (const attrGroup of Object.values(attributeTree)) {
																for (const attr of Object.values(attrGroup.attributes)) {
																	if (attr.id === attributeId) {
																		return attr
																	}
																}
															}

															return null
														})() : null}
														{@const attributeName = attribute?.displayName ?? attributeId}
														{@const attributeTitle = attribute?.displayName ?? attributeId}

														<li data-row="gap-2 start">
															<span style="color: {ratingColor}">{ratingIcon}</span>
															<span>
																{#if attribute}
																	<span>{@html attribute.icon}</span>
																{/if}
																{#if attributeName}
																	{#if attributeLink}
																		<a href={attributeLink} title={attributeTitle}>
																			<strong>{attributeName}</strong>
																		</a>
																	{:else}
																		<strong>{attributeName}</strong>
																	{/if}
																	<span>
																		—
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
														</li>
													{/each}
												</ul>
											</div>
										{/if}
									</details>
								{/each}
							</div>
						{/if}
					</div>
				</details>
			{/each}
		</div>
	</div>
{/if}


<style>
	div:has(> div > details) {
		line-height: 1.6;
	}

	details {
		&[data-card] {
			--card-backgroundColor: var(--stage-background, var(--background-primary));
		}
	}

	h4 {
		font-weight: normal;
	}
</style>

