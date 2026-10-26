<script
	lang="ts"
	generics="
	_AttributeGroupId extends string
"
>
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import {
		StageCriterionRating,
		stageCriterionRatings,
		type WalletLadderEvaluation,
	} from '@/schema/stages'
	import { stageToColor } from '@/utils/colors'
	import {
		allCriteriaInStage,
		computeCountsAndStatus,
		getCriterionAttributeId,
		attributesById,
		type StageCountsStatus,
	} from '@/utils/stage-attributes'

	const stageStatuses = {
		PASS: {
			icon: '✅',
			label: 'All criteria passed',
			color: 'var(--rating-pass)',
			textColor: 'var(--rating-pass-text)',
		},
		PARTIAL: {
			icon: '🟡',
			label: 'Some criteria passed',
			color: 'var(--rating-partial)',
			textColor: 'var(--rating-partial-text)',
		},
		FAIL: {
			icon: '❌',
			label: 'All criteria failed',
			color: 'var(--rating-fail)',
			textColor: 'var(--rating-fail-text)',
		},
		UNRATED: {
			icon: '❔',
			label: 'Some criteria unrated',
			color: 'var(--rating-unrated)',
			textColor: 'var(--rating-unrated)',
		},
	} as const satisfies Record<
		StageCountsStatus,
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
		isLocalAttribute,
	}: {
		wallet: RatedWallet<_AttributeGroupId>
		stage: WalletLadderEvaluation<_AttributeGroupId>['stage'] | null
		ladderEvaluation: WalletLadderEvaluation<_AttributeGroupId> | null
		isLocalAttribute: (id: string) => boolean
	} = $props()

	// Derived
	const ladderDefinition = $derived(ladderEvaluation?.ladder ?? null)

	const nextUnclearedStageId = $derived.by(() => {
		if (!ladderEvaluation) return null

		const cleared = ladderEvaluation.highestClearedStage
		const index = cleared
			? ladderEvaluation.ladder.stages.findIndex(candidate => candidate.id === cleared.id) + 1
			: 0

		return ladderEvaluation.ladder.stages[index]?.id ?? null
	})

	const currentStageIndex = $derived(
		!stage || typeof stage === 'string' || !ladderDefinition
			? null
			: ladderDefinition.stages.findIndex(ladderStage => ladderStage.id === stage.id),
	)

	const stageEvaluatableWallet = $derived.by(() => {
		const { metadata: _metadata, ladders: _ladders, ...rest } = wallet

		return rest
	})

	// Functions
	import { ContentType, isTypographicContent } from '@/types/content'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { getWalletUrl } from '@/utils/urls'

	// Components
	import Typography from '@/components/Typography.svelte'
</script>

{#if ladderEvaluation && ladderDefinition}
	<div
		data-column
		style:--accent={stage && typeof stage !== 'string' && currentStageIndex !== null
			? stageToColor(currentStageIndex, ladderDefinition?.stages.length ?? 3)
			: 'var(--rating-unrated)'}
	>
		<div data-column="gap-4">
			{#each ladderDefinition.stages as s, index (s.id)}
				{@const stageIndex = index}
				{@const isCurrent = stage && typeof stage !== 'string' && stage.id === s.id}
				{@const {
					passedCount,
					totalCount,
					status: stageRating,
				} = computeCountsAndStatus(allCriteriaInStage(s), stageEvaluatableWallet)}
				<section
					id={s.id}
					data-card="radius-8 padding-6 {isCurrent ? 'border-accent' : ''}"
					style:--accent={stageToColor(stageIndex, ladderDefinition?.stages.length ?? 3)}
					style:--stage-background={isCurrent
						? 'color-mix(in srgb, var(--accent) 10%, var(--background-primary))'
						: 'color-mix(in srgb, var(--accent) 5%, var(--background-primary))'}
					data-sticky-breadcrumb="scope clearance size"
					data-sticky-container
					style:--stickyBreadcrumb-entryTimeline={`--stage-${stageIndex}-entry`}
				>
					<details name="wallet-stages" open={s.id === nextUnclearedStageId} data-column="gap-0">
						<summary data-column="span-start" data-sticky-breadcrumb="position">
							<header data-sticky="block block-start backdrop-before backdrop-stuck">
								<div data-row="start wrap">
									<h3 data-row-item="flexible" data-sticky-breadcrumb="source">
										<a
											data-link="camouflaged"
											data-row="start gap-2"
											data-sticky-breadcrumb="item"
											href={`#${s.id}`}
										>
											<data
												data-badge="medium"
												value={`STAGE_${stageIndex}`}
												style:--accent={stageToColor(
													stageIndex,
													ladderDefinition?.stages.length ?? 3,
												)}
											>
												<strong>{s.label}</strong>
											</data>
											<strong>{s.name}</strong>
										</a>
										<span data-sticky-breadcrumb="size-export size-source" aria-hidden="true"></span>
									</h3>

									<div data-row-item="wrap-end" data-row="gap-2" data-sticky-breadcrumb="end contents">
										<span>{passedCount}/{totalCount}</span>
										<data value={stageRating} title={stageStatuses[stageRating].label}>
											{stageStatuses[stageRating].icon}
										</data>
										<span data-sticky-breadcrumb="size-export size-end" aria-hidden="true"></span>
									</div>
									<span data-sticky-breadcrumb="size-export size-row" aria-hidden="true"></span>
								</div>
							</header>
							<div data-sticky-breadcrumb="support">
									<div data-scroll-item={s.description.contentType === ContentType.TEXT ? 'snap-block-start' : 'snap-prose'}>
										{#if isTypographicContent(s.description)}
											<Typography content={s.description} />
										{:else}
											<p>{s.id}</p>
										{/if}
									</div>
								</div>
						</summary>

						<div
							data-column="gap-6"
							style:--stage-background={isCurrent
								? 'color-mix(in srgb, var(--accent) 5%, var(--background-primary))'
								: 'color-mix(in srgb, var(--accent) 3%, var(--background-primary))'}
						>
							{#if s.criteriaGroups}
								<div data-column>
									{#each s.criteriaGroups as criteriaGroup (criteriaGroup.id)}
										{@const {
											passedCount: groupPassedCount,
											totalCount: groupTotalCount,
											status: groupRating,
										} = computeCountsAndStatus(criteriaGroup.criteria, stageEvaluatableWallet)}

										<details
											id={`${s.id}-${criteriaGroup.id}`}
											open
											data-sticky-container
											data-card="padding-5 secondary radius-4"
											style:--accent={stageStatuses[groupRating].color}
											style:--accent-textColor={stageStatuses[groupRating].textColor}
										>
											<summary data-sticky="block block-start backdrop-before backdrop-stuck">
												<div data-row="wrap">
													<h4 data-row-item="flexible basis-2">
														<a data-link="camouflaged" href={`#${s.id}-${criteriaGroup.id}`}>
															{#if isTypographicContent(criteriaGroup.description)}
																<Typography content={criteriaGroup.description} />
															{:else}
																{criteriaGroup.id}
															{/if}
														</a>
													</h4>
													<div data-row-item="wrap-end" data-row="gap-2">
														<span>{groupPassedCount}/{groupTotalCount}</span>
														<data value={groupRating} title={stageStatuses[groupRating].label}>
															{stageStatuses[groupRating].icon}
														</data>
													</div>
												</div>
											</summary>

											{#if criteriaGroup.criteria}
												<div>
													<ul data-card="padding-4" data-list="gap-3" data-scroll-item="snap-prose">
														{#each criteriaGroup.criteria as criterion (criterion.id)}
															{@const criterionEvaluation = ladderDefinition
																? criterion.evaluate(wallet)
																: null}
															{@const criterionRating =
																criterionEvaluation?.rating ?? StageCriterionRating.UNRATED}
															{@const criterionRatingMeta = stageCriterionRatings[criterionRating]}
															{@const attributeId = getCriterionAttributeId(criterion)}
															{@const attributeLink = attributeId
																? isLocalAttribute(attributeId)
																? `#${slugifyCamelCase(attributeId)}`
																: getWalletUrl(wallet, { attributeAnchor: slugifyCamelCase(attributeId) })
																: null}
															{@const attribute = attributeId
																? (attributesById.get(attributeId) ?? null)
																: null}
															{@const attributeName = attribute?.displayName ?? attributeId}

															<li
																data-list-item-marker={criterionRatingMeta.icon}
																style:--accent={criterionRatingMeta.color}
																style:--accent-textColor={criterionRatingMeta.textColor}
																data-stage-criterion-rating={criterionRating}
																title={criterionRatingMeta.label}
															>
																{#if attributeName}
																	{#if attributeLink}
																		<a href={attributeLink} title={attributeName}>
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
																{:else if isTypographicContent(criterion.description)}
																	<Typography content={criterion.description} />
																{:else}
																	{criterion.id}
																{/if}
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
					<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
					<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
				</section>
			{/each}
		</div>
	</div>
{/if}

<style>
	[data-sticky-breadcrumb~="scope"] {
		--column-supportGap: var(---wallet-section-support-gap, 0.1875rem);
		---wallet-attribute-heading-font-size: 1.1rem;
	}

	:is(details, [data-sticky-breadcrumb~="scope"])[data-card] {
		--card-backgroundColor: var(--stage-background, var(--background-primary));
	}

	summary[data-column~="span-start"] {
		--column-supportLineHeight: calc(1rem * var(---wallet-line-height, 1.6));
		--column-iconGap: var(---wallet-section-icon-gap, 0.875rem);

		font-size: var(---wallet-attribute-heading-font-size);
		h3 {
			font-size: 1em;
		}
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
