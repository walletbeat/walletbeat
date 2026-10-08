<script lang="ts" generics="
	_AttributeGroupId extends string
">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import {
		StageCriterionRating,
		stageCriterionRatings,
		type WalletLadderEvaluation,
	} from '@/schema/stages'
	import { stageToColor } from '@/utils/colors'
	import { allCriteriaInStage, computeCountsAndStatus, getCriterionAttributeId, attributesById } from '@/utils/stage-attributes'

	/** Aggregate statuses for stages and stage groups (must match StageCountsStatus in stage-attributes) */
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
			textColor: 'var(--rating-pass-text)',
		},
		[StageStatus.PARTIAL]: {
			icon: '🟡',
			label: 'Some criteria passed',
			color: 'var(--rating-partial)',
			textColor: 'var(--rating-partial-text)',
		},
		[StageStatus.FAIL]: {
			icon: '❌',
			label: 'All criteria failed',
			color: 'var(--rating-fail)',
			textColor: 'var(--rating-fail-text)',
		},
		[StageStatus.UNRATED]: {
			icon: '❔',
			label: 'Some criteria unrated',
			color: 'var(--rating-unrated)',
			textColor: 'var(--text-secondary)',
		},
	} as const satisfies Record<
		StageStatus,
		{
			icon: string
			label: string
			color: string
			textColor: string
		}
	>


	// Props
	const {
		wallet,
		stage,
		ladderEvaluation,
	}: {
		wallet: RatedWallet<_AttributeGroupId>
		stage: WalletLadderEvaluation<_AttributeGroupId>['stage'] | null
		ladderEvaluation: WalletLadderEvaluation<_AttributeGroupId> | null
	} = $props()


	// Derived
	const ladderDefinition = $derived(
		ladderEvaluation?.ladder ?? null
	)

	const currentStageIndex = $derived(
		(!stage || typeof stage === 'string' || !ladderDefinition) ?
			null
		:
			ladderDefinition.stages.findIndex(ladderStage => ladderStage.id === stage.id)
	)

	// Stages up to and including the highest cleared one are done; the one after it
	// is what the wallet is working toward, so it is the one shown open.
	const clearedStageIndex = $derived(
		ladderDefinition && ladderEvaluation?.highestClearedStage ?
			ladderDefinition.stages.findIndex(ladderStage => ladderStage.id === ladderEvaluation.highestClearedStage?.id)
		:
			-1
	)

	const nextStageIndex = $derived(clearedStageIndex + 1)

	const stageEvaluatableWallet = $derived.by(() => {
		const { metadata: _metadata, ladders: _ladders, ...rest } = wallet

		return rest
	})


	// Functions
	import { isTypographicContent } from '@/types/content'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { getWalletUrl } from '@/utils/urls'


	// Components
	import Typography from '@/components/Typography.svelte'
</script>


{#if ladderEvaluation && ladderDefinition}
	<ol
		class="stage-ladder"
		data-list="unstyled"
		data-column="gap-3"
		style:--accent={
			stage && typeof stage !== 'string' && currentStageIndex !== null ?
				stageToColor(currentStageIndex, ladderDefinition?.stages.length ?? 3)
			:
				'var(--rating-unrated)'
		}
	>
		{#each ladderDefinition.stages as s, index (s.id)}
			{@const stageIndex = index}
			{@const isCurrent = stage && typeof stage !== 'string' && stage.id === s.id}
			{@const stageState = index <= clearedStageIndex ? 'cleared' : index === nextStageIndex ? 'next' : 'upcoming'}
			{@const { passedCount, totalCount, status: stageRating } = computeCountsAndStatus(allCriteriaInStage(s), stageEvaluatableWallet)}

			<li>
				<details
					id={s.id}
					class="stage"
					open={index === nextStageIndex}
					data-card="radius-6 padding-5"
					data-column="gap-0"
					data-stage-state={stageState}
					style:--accent={stageToColor(stageIndex, ladderDefinition?.stages.length ?? 3)}
				>
					<summary>
						<div class="stage-summary">
							<a
								class="stage-label"
								data-link="camouflaged"
								href={`#${s.id}`}
							>
								<data
									data-badge="medium"
									value={`STAGE_${stageIndex}`}
								>
									{s.label}
								</data>
							</a>

							<div
								class="stage-summary-copy"
								data-column="gap-1"
							>
								<h3>{s.name}</h3>
								{#if isTypographicContent(s.description)}
									<div class="stage-description">
										<Typography content={s.description} />
									</div>
								{:else}
									<p class="stage-description">{s.id}</p>
								{/if}
							</div>

							<div
								class="stage-progress"
								title={stageStatuses[stageRating].label}
							>
								<span class="stage-state">
									{#if isCurrent}
										Current stage
									{:else if stageState === 'cleared'}
										Cleared
									{:else if stageState === 'next'}
										Next
									{/if}
								</span>

								{#if totalCount > 0}
									<span class="stage-count">
										{passedCount} of {totalCount}
									</span>
									<span
										class="stage-meter"
										aria-hidden="true"
										data-status={stageRating}
										style:---progress={passedCount / totalCount}
									></span>
								{/if}
							</div>
						</div>
					</summary>

					<div
						class="stage-criteria"
						data-column="gap-5"
					>
						{#each s.criteriaGroups as criteriaGroup (criteriaGroup.id)}
							{@const {
								passedCount: groupPassedCount,
								totalCount: groupTotalCount,
								status: groupRating,
							} = computeCountsAndStatus(
								criteriaGroup.criteria,
								stageEvaluatableWallet,
							)}

							<section
								class="criteria-group"
								data-column="gap-3"
							>
								<header data-row="align-start gap-3">
									<h4>
										{#if isTypographicContent(criteriaGroup.description)}
											<Typography content={criteriaGroup.description} />
										{:else}
											{criteriaGroup.id}
										{/if}
									</h4>

									{#if groupTotalCount > 0}
										<span
											class="criteria-count"
											title={stageStatuses[groupRating].label}
										>
											{groupPassedCount}/{groupTotalCount}
										</span>
									{/if}
								</header>

								<ul data-list="gap-3">
									{#each criteriaGroup.criteria as criterion (criterion.id)}
										{@const criterionEvaluation = ladderDefinition ? criterion.evaluate(wallet) : null}
										{@const criterionRating = criterionEvaluation?.rating ?? StageCriterionRating.UNRATED}
										{@const criterionRatingMeta = stageCriterionRatings[criterionRating]}
										{@const attributeId = getCriterionAttributeId(criterion)}
										{@const attributeLink = attributeId ? getWalletUrl(wallet, { attributeAnchor: slugifyCamelCase(attributeId) }) : null}
										{@const attribute = attributeId ? attributesById.get(attributeId) ?? null : null}
										{@const attributeName = attribute?.displayName ?? attributeId}
										{@const attributeTitle = attribute?.displayName ?? attributeId}

										<li
											data-list-item-marker={criterionRatingMeta.icon}
											data-list-item-rating={criterionRating.toLowerCase()}
											style:--accent={criterionRatingMeta.color}
											style:--accent-textColor={criterionRatingMeta.textColor}
											data-stage-criterion-rating={criterionRating}
											title={criterionRatingMeta.label}
										>
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
										</li>
									{/each}
								</ul>
							</section>
						{/each}
					</div>
				</details>
			</li>
		{/each}
	</ol>
{/if}


<style>
	.stage {
		---stage-divider-color: color-mix(in srgb, var(--border-color) 65%, transparent);

		border: 1px solid var(---stage-divider-color);
		box-shadow:
			0 1px 2px rgb(19 10 43 / 0.04),
			0 12px 32px -16px rgb(19 10 43 / 0.12);

		&[data-stage-state='next'] {
			border-color: color-mix(in oklch, var(--accent-color) 45%, var(---stage-divider-color));
			background-image: linear-gradient(
				to bottom,
				color-mix(in oklch, var(--accent-color) 8%, transparent),
				transparent 7rem
			);
		}

		> summary {
			align-items: start;

			/* Line the chevron up with the stage label rather than the whole summary. */
			&::after {
				block-size: 1.9rem;
			}

			> :only-child {
				min-inline-size: 0;
			}
		}
	}

	/* Label | name and description | progress. On narrow cards the copy takes its own row. */
	.stage-summary {
		display: grid;
		grid-template:
			'Label Copy Progress'
			/ auto minmax(0, 1fr) auto;
		align-items: start;
		gap: 0.5rem 1rem;

		@container (inline-size < 34rem) {
			grid-template:
				'Label Progress'
				'Copy Copy'
				/ auto minmax(0, 1fr);
		}
	}

	.stage-label {
		grid-area: Label;
		line-height: 1;
		padding-block-start: 0.15rem;
	}

	.stage-summary-copy {
		grid-area: Copy;

		h3 {
			font-size: 1.05em;
			font-weight: 600;
		}
	}

	.stage-description {
		color: var(--text-secondary);
		font-size: 0.9em;
		text-wrap: pretty;

		:global(p) {
			margin: 0;
		}
	}

	.stage-progress {
		grid-area: Progress;
		display: grid;
		grid-template-columns: auto auto;
		justify-content: end;
		align-items: center;
		gap: 0.375rem 0.75rem;
		padding-block-start: 0.25rem;

		font-size: 0.8125em;
		white-space: nowrap;
	}

	.stage-state {
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-size: 0.85em;

		&:empty {
			display: none;
		}

		[data-stage-state='cleared'] & {
			color: var(--rating-pass-text);
		}

		[data-stage-state='next'] & {
			color: var(--accent-textColor, var(--text-primary));
		}
	}

	.stage-count {
		color: var(--text-secondary);
		text-align: end;
	}

	.stage-meter {
		grid-column: 1 / -1;
		justify-self: stretch;
		min-inline-size: 7rem;
		block-size: 0.375rem;
		border-radius: 999px;
		background:
			linear-gradient(
				to right,
				var(---meter-fill) calc(var(---progress) * 100%),
				transparent 0
			),
			color-mix(in srgb, var(--border-color) 55%, transparent);

		&[data-status='PASS'] {
			---meter-fill: var(--rating-pass);
		}
		&[data-status='PARTIAL'] {
			---meter-fill: var(--rating-partial);
		}
		&[data-status='FAIL'],
		&[data-status='UNRATED'] {
			---meter-fill: var(--rating-neutral);
		}
	}

	.stage-criteria {
		padding-block-start: 0.25rem;
	}

	.criteria-group {
		padding-block-start: 1.25rem;
		border-block-start: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);

		> header h4 {
			flex: 1;
			font-size: 0.95em;
			font-weight: 600;

			:global(p) {
				margin: 0;
			}
		}

		ul {
			--list-marker-inlineSize: 1.25em;
			--list-markerGap: 0.75em;
		}
	}

	.criteria-count {
		flex: none;
		color: var(--text-secondary);
		font-size: 0.85em;
		font-variant-numeric: tabular-nums;
	}

	[data-stage-criterion-rating] {
		&[data-stage-criterion-rating="EXEMPT"] {
			text-decoration: line-through;
			opacity: 0.6;
		}
	}
</style>
