<script lang="ts" generics="
	_AttributeGroupId extends string
">
	// Types/constants
	import type { Ladders } from '@/schema/ladders'
	import {
		StageCriterionRating,
		stageCriterionRatings,
		type StageEvaluatableWallet,
		type WalletLadderEvaluation,
		type WalletStage,
	} from '@/schema/stages'
	import { WalletType, walletTypeToName } from '@/schema/wallet-types'
	import { isTypographicContent } from '@/types/content'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { getWalletUrl } from '@/utils/wallet-url'
	import { attributesById, getCriterionAttributeId } from '@/utils/stage-attributes'
	import type { RatedWallet } from '@/schema/wallet'


	// Props
	type DisplayStageWallet = RatedWallet<_AttributeGroupId> & {
		walletsByType?: Partial<Record<WalletType, RatedWallet<_AttributeGroupId>>>
	}

	const {
		wallet,
		ladders,
		walletType,
		stage,
		ladderEvaluation,
		showNextStageCriteria = true,
	}: {
		wallet: DisplayStageWallet
		ladders?: Ladders<_AttributeGroupId>
		walletType: WalletType
		stage: WalletStage<_AttributeGroupId> | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES' | null
		ladderEvaluation: WalletLadderEvaluation<_AttributeGroupId> | null
		showNextStageCriteria?: boolean
	} = $props()


	// (Derived)
	const criterionWallet = $derived(
		wallet.walletsByType?.[walletType] ?? wallet
	)

	const stageEvaluatableWallet: StageEvaluatableWallet<_AttributeGroupId> = $derived({
		types: criterionWallet.types,
		variants: criterionWallet.variants,
		variantSpecificity: criterionWallet.variantSpecificity,
		overall: criterionWallet.overall,
		overrides: criterionWallet.overrides,
	})

	const ladderDefinition = $derived(
		ladders?.[walletType] ?? null
	)

	const stage0 = $derived(
		ladderDefinition?.stages[0] ?? null
	)

	const currentStageIndex = $derived(
		(!stage || typeof stage === 'string' || !ladderDefinition) ?
			null
		:
			ladderDefinition.stages.findIndex(s => s.id === stage.id)
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
	<header>
		<small>{walletTypeToName(walletType)}</small>
	</header>

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
