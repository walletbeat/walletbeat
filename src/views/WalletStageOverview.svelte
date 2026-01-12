<script lang="ts">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import { WalletLadderType, ladders } from '@/schema/ladders'
	import { StageCriterionRating, stageCriterionRatings, type WalletLadderEvaluation, type WalletStage } from '@/schema/stages'
	import { stageToColor } from '@/utils/colors'
	import { getCriterionAttributeId, attributesById } from '@/utils/stage-attributes'

	/** Aggregate statuses for stages and stage groups */
	enum StageStatus {
		PASS = 'PASS',
		PARTIAL = 'PARTIAL',
		FAIL = 'FAIL',
		UNRATED = 'UNRATED',
	}

	const stageStatuses = {
		[StageStatus.PASS]: {
			icon: '✅',
			label: 'All criteria passed',
			color: 'var(--rating-pass)',
		},
		[StageStatus.PARTIAL]: {
			icon: '🟡',
			label: 'Some criteria passed',
			color: 'var(--rating-partial)',
		},
		[StageStatus.FAIL]: {
			icon: '❌',
			label: 'All criteria failed',
			color: 'var(--rating-fail)',
		},
		[StageStatus.UNRATED]: {
			icon: '❔',
			label: 'All criteria unrated',
			color: 'var(--rating-unrated)',
		},
	} as const satisfies Record<
		StageStatus,
		{
			icon: string
			label: string
			color: string
		}
	>


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
	let ladderType = $derived(
		!ladderEvaluation ?
			null
		:
			Object.entries(wallet.ladders)
				.find(([, evaluation]) => evaluation === ladderEvaluation)
				?.[0] as WalletLadderType
			?? null
	)

	let ladderDefinition = $derived(
		ladderType ? ladders[ladderType] : null
	)

	let currentStageIndex = $derived(
		(!stage || typeof stage === 'string' || !ladderDefinition) ?
			null
		:
			ladderDefinition.stages.findIndex(s => s.id === stage.id)
	)

	let defaultOpenStageIndex = $derived(
		!ladderDefinition ?
			null
		: currentStageIndex === null ?
			ladderDefinition.stages.length - 1
		:
			(currentStageIndex + 1 < ladderDefinition.stages.length ? currentStageIndex + 1 : ladderDefinition.stages.length - 1)
	)


	// Functions
	import { isTypographicContent } from '@/types/content'
	import { slugifyCamelCase } from '@/types/utils/text'


	// Components
	import Typography from '@/components/Typography.svelte'
</script>


{#if ladderEvaluation && ladderDefinition}
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
			{#each ladderDefinition.stages as s, index}
				{@const stageIndex = index}
				{@const isCurrent = stage && typeof stage !== 'string' && stage.id === s.id}
				{@const allCriteria = s.criteriaGroups.flatMap(group => group.criteria)}
				{@const allEvaluations = allCriteria.map(criterion => criterion.evaluate(wallet))}
				{@const applicableEvaluations = allEvaluations.filter(e => e.rating !== StageCriterionRating.EXEMPT)}
				{@const passedCount = applicableEvaluations.filter(e => e.rating === StageCriterionRating.PASS).length}
				{@const exemptCount = allEvaluations.filter(e => e.rating === StageCriterionRating.EXEMPT).length}
				{@const totalCount = applicableEvaluations.length}
				{@const allPassed = totalCount > 0 && passedCount === totalCount}
				{@const allExempt = allEvaluations.length > 0 && exemptCount === allEvaluations.length}
				{@const isDefaultOpen = defaultOpenStageIndex === stageIndex}
				{@const stageRating = (
					allExempt ?
						StageStatus.UNRATED
					: allPassed ?
						StageStatus.PASS
					: passedCount > 0 ?
						StageStatus.PARTIAL
					:
						StageStatus.FAIL
				)}

				<details
					id={`stage-${stageIndex}`}
					open={isDefaultOpen}
					data-card="radius-8 padding-6 {isCurrent ? 'border-accent' : ''}"
					data-column="gap-0"
					style:--accent={stageToColor(stageIndex, ladderDefinition?.stages.length ?? 3)}
					style:--stage-background={isCurrent ? 'color-mix(in srgb, var(--accent) 10%, var(--background-primary))' : 'color-mix(in srgb, var(--accent) 5%, var(--background-primary))'}
				>
					<summary>
						<div data-row="wrap wrap-first-last">
							<a
								data-link="camouflaged"
								href={`#stage-${stageIndex}`}
							>
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

							<h3 data-row-item="flexible basis-3">
								{#if isTypographicContent(s.description)}
									<Typography content={s.description} />
								{:else}
									{s.id}
								{/if}
							</h3>

							<div
								data-row-item="wrap-end"
								data-row="gap-2"
							>
							<span>{passedCount}/{totalCount}</span>
							<data value={stageRating} title={stageStatuses[stageRating].label}>
								{stageStatuses[stageRating].icon}
							</data>
							</div>
						</div>
					</summary>

					<div
						data-column="gap-6"
						style:--stage-background={isCurrent ? 'color-mix(in srgb, var(--accent) 5%, var(--background-primary))' : 'color-mix(in srgb, var(--accent) 3%, var(--background-primary))'}
					>
						{#if s.criteriaGroups}
							<div data-column>
								{#each s.criteriaGroups as criteriaGroup}
									{@const groupEvaluations = ladderDefinition ? criteriaGroup.criteria.map(c => c.evaluate(wallet)) : []}
									{@const groupApplicableEvaluations = groupEvaluations.filter(e => e?.rating !== StageCriterionRating.EXEMPT)}
									{@const groupPassedCount = groupApplicableEvaluations.filter(e => e?.rating === StageCriterionRating.PASS).length}
									{@const groupExemptCount = groupEvaluations.filter(e => e?.rating === StageCriterionRating.EXEMPT).length}
									{@const groupTotalCount = groupApplicableEvaluations.length}
									{@const groupAllExempt = groupEvaluations.length > 0 && groupExemptCount === groupEvaluations.length}
									{@const groupAllUnrated = groupTotalCount > 0 && groupApplicableEvaluations.every(e => e?.rating === StageCriterionRating.UNRATED)}
									{@const groupRating = (
										groupAllExempt ?
											StageStatus.UNRATED
										: groupAllUnrated ?
											StageStatus.UNRATED
										: groupPassedCount === groupTotalCount ?
											StageStatus.PASS
										: groupPassedCount > 0 ?
											StageStatus.PARTIAL
										:
											StageStatus.FAIL
									)}

									<details
										data-card="padding-5 secondary radius-4"
										style:--accent={stageStatuses[groupRating].color}
									>
										<summary>
											<div data-row="wrap">
												<h4 data-row-item="flexible basis-2">
													{#if isTypographicContent(criteriaGroup.description)}
														<Typography content={criteriaGroup.description} />
													{:else}
														{criteriaGroup.id}
													{/if}
												</h4>
												<div
													data-row-item="wrap-end"
													data-row="gap-2"
												>
													<span>{groupPassedCount}/{groupTotalCount}</span>
													<data
														value={groupRating}
														title={stageStatuses[groupRating].label}
													>
														{stageStatuses[groupRating].icon}
													</data>
												</div>
											</div>
										</summary>

										{#if criteriaGroup.criteria}
											<div>
												<ul
													data-card="padding-4"
													data-list="gap-3"
												>
													{#each criteriaGroup.criteria as criterion}
														{@const criterionEvaluation = ladderDefinition ? criterion.evaluate(wallet) : null}
														{@const criterionRating = criterionEvaluation?.rating}
														{@const attributeId = getCriterionAttributeId(criterion)}
														{@const attributeLink = attributeId ? `/${wallet.metadata.id}/#${slugifyCamelCase(attributeId)}` : null}
														{@const attribute = attributeId ? attributesById.get(attributeId) ?? null : null}
														{@const attributeName = attribute?.displayName ?? attributeId}
														{@const attributeTitle = attribute?.displayName ?? attributeId}

														<li
															data-list-item-marker={attribute?.icon}
															style:--accent={stageCriterionRatings[(criterionRating ?? StageCriterionRating.UNRATED) as StageCriterionRating].color}
															data-stage-criterion-rating={criterionRating}
														>
															<span data-row>
																<span data-row-item="flexible">
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

																<data
																	value={criterionRating}
																	title={stageCriterionRatings[(criterionRating ?? StageCriterionRating.UNRATED) as StageCriterionRating].label}
																>
																	{stageCriterionRatings[(criterionRating ?? StageCriterionRating.UNRATED) as StageCriterionRating].icon}
																</data>
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
	details {
		&[data-card] {
			--card-backgroundColor: var(--stage-background, var(--background-primary));
		}
	}

	h3 {
		font-size: 1.1em;
	}

	h4 {
		font-weight: normal;
	}

	[data-stage-criterion-rating] {
		&[data-stage-criterion-rating="EXEMPT"] {
			text-decoration: line-through;
			opacity: 0.6;
		}
	}
</style>
