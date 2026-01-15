<script module lang="ts">
	export enum WalletAttributeSummaryType {
		None = 'none',
		Rating = 'rating',
	}
</script>

<script lang="ts">
	// Types/constants
	import { type EvaluatedAttribute, ratingIcons, ratingToColor, type Value } from '@/schema/attributes'
	import type { Variant } from '@/schema/variants'
	import { attributeVariantSpecificity, type RatedWallet,VariantSpecificity } from '@/schema/wallet'
	import { getAttributeStages } from '@/utils/stage-attributes'
	import { getWalletStageAndLadder } from '@/utils/stage'


// Props
	let {
		wallet,
		attribute,
		variant,
		summaryType = WalletAttributeSummaryType.None,
		isInTooltip = false,
	}: {
		wallet: RatedWallet
		attribute: EvaluatedAttribute<Value>
		variant?: Variant
		summaryType?: WalletAttributeSummaryType
		isInTooltip?: boolean
	} = $props()


	// Functions
	import { variantToName } from '@/constants/variants'
	import { slugifyCamelCase } from '@/types/utils/text'


	// Components
	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
	import Typography from '../components/Typography.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import WalletStageSummary from './WalletStageSummary.svelte'


	// Derived
	import { objectEntries } from '@/types/utils/object'

	const ladderEvaluation = $derived(
		getWalletStageAndLadder(wallet)
			.ladderEvaluation
		?? undefined
	)

	const ladderType = $derived(
		ladderEvaluation &&
			objectEntries(wallet.ladders).find(([_, evaluation]) => evaluation === ladderEvaluation)?.[0]
		||
			undefined
	)

	const attributeStages = $derived(
		getAttributeStages(attribute.attribute)
	)

	const relevantStages = $derived(
		ladderType && ladderEvaluation &&
			attributeStages
				.find(stage => stage.ladderType === ladderType)
				?.stageNumbers
		||
			[]
	)

	const firstStage = $derived(
		relevantStages.length > 0 &&
			ladderEvaluation?.ladder.stages[relevantStages[0]]
		||
			undefined
	)
</script>


<div
	class="attribute-summary"
	data-card={isInTooltip ? 'radius p-sm border-accent' : undefined}
	data-column
	style:--accent={ratingToColor(attribute.evaluation.value.rating)}
>
	<header data-row="center gap-3 wrap">
		<h4 data-row="gap-2">
			<span>{attribute.evaluation.value.icon ?? attribute.attribute.icon}</span>
			{attribute.attribute.displayName}
		</h4>

		<div data-row="gap-2">
			{#if relevantStages.length > 0 && firstStage && ladderEvaluation}
				<Tooltip>
					<a
						href={`/${wallet.metadata.id}/${variant ? `?variant=${variant}` : ''}#${firstStage.id}`}
						data-link="camouflaged"
						title={`This attribute is required for stage${relevantStages.length > 1 ? 's' : ''} ${relevantStages.join(', ')}`}
					>
						<div
							data-badge="small"
							style:--accent="var(--accent-color)"
						>
							<small>Stage {relevantStages.join(', ')}</small>
						</div>
					</a>

					{#snippet TooltipContent()}
						<WalletStageSummary 
							{wallet} 
							stage={firstStage} 
							{ladderEvaluation}
							showNextStageCriteria={false}
						/>
					{/snippet}
				</Tooltip>
			{/if}

			{#if summaryType === WalletAttributeSummaryType.Rating}
				<data
					data-badge="small"
					value={attribute.evaluation.value.rating}
				>{attribute.evaluation.value.rating}</data>
			{/if}
		</div>
	</header>

	<p>
		{ratingIcons[attribute.evaluation.value.rating]}

		<Typography
			content={attribute.evaluation.value.shortExplanation}
			strings={{
				WALLET_NAME: wallet.metadata.displayName,
				WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
				WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
			}}
		/>

		{#if variant && wallet.variants[variant]}
			{@const specificity = attributeVariantSpecificity(wallet, variant, attribute.attribute)}

			{#if specificity === VariantSpecificity.NOT_UNIVERSAL}
				This is the case on the {variantToName(variant, false)} version.
			{:else if specificity === VariantSpecificity.UNIQUE_TO_VARIANT}
				This is only the case on the {variantToName(variant, false)} version.
			{/if}
		{/if}
	</p>

	<div>
		<a
			href="/{wallet.metadata.id}/{variant ? `?variant=${variant}` : ''}#{slugifyCamelCase(attribute.attribute.id)}"
		>
			<span>{@html InfoIcon}</span>
			Learn more
		</a>
	</div>
</div>


<style>
	.attribute-summary {
		font-size: smaller;
		line-height: 1.4;

		header {
			row-gap: 0.5em;

			h4 {
				font-weight: 600;
			}
		}

		p :global(.markdown) {
			display: inline;
		}
	}
</style>
