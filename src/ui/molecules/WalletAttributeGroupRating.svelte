<script
	lang="ts"
	generics="
		_ValueSet extends ValueSet = ValueSet
	"
>
	// Types/constants
	import {
		type AttributeGroup,
		type EvaluatedGroup,
		type ValueSet,
		Rating,
		evaluatedAttributesEntries,
		ratingToIcon,
		ratingToColor,
	} from '@/schema/attributes'
	import {
		attributeVariantSpecificity,
		VariantSpecificity,
		type RatedWallet,
	} from '@/schema/wallet'
	import { isNonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { betaSiteRoot } from '@/constants'
	import type { Variant } from '@/schema/variants'
	import { variantToName, variantUrlQuery } from '@/components/variants'
	import type { MaybeUnratedScore } from '@/schema/score'

	// Props
	let {
		wallet,
		attrGroup,
		evalGroup,
		groupScore,
		selectedEvaluationAttribute = $bindable(),
		selectedVariant = $bindable(),
		isExpanded = false,
		toggleExpanded,
	}: {
		wallet: RatedWallet
		attrGroup: AttributeGroup<_ValueSet>
		evalGroup: EvaluatedGroup<_ValueSet>
		groupScore: MaybeUnratedScore
		selectedEvaluationAttribute?: string
		selectedVariant?: Variant
		isExpanded?: boolean
		toggleExpanded?: (id: string) => void
	} = $props()

	// State
	let activeEvaluationAttribute: string | undefined = $state(undefined)

	// Components
	import Pie from '../atoms/Pie.svelte'
	import Typography from '../atoms/Typography.svelte'
	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
</script>

<div 
	class="container column"
	role="button"
	tabindex="0"
>
	{@const evalEntries = evaluatedAttributesEntries(evalGroup)
		.filter(([_, evalAttr]) => (
			evalAttr?.evaluation?.value?.rating !== Rating.EXEMPT
		))}

	{@const currentEvaluationAttribute = (
		activeEvaluationAttribute ?
			evalGroup[activeEvaluationAttribute]
		: selectedEvaluationAttribute ?
			evalGroup[selectedEvaluationAttribute]
		:
			undefined
	)}

	<!-- Rating Pie Chart -->
	{#if groupScore === undefined || !isNonEmptyArray(evalEntries)}
		<div>N/A</div>
	{:else}
		<Pie
			slices={	
				!isNonEmptyArray(evalEntries) ?
					[]
				
				: nonEmptyMap(
					evalEntries,
					([evalAttrId, evalAttr]) => {
						const icon = evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon

						const tooltipSuffix = (() => {
							const variant = selectedVariant

							if(!variant || !wallet.variants[variant])
								return

							const specificity = attributeVariantSpecificity(wallet, variant, evalAttr.attribute)

							return (
								specificity === VariantSpecificity.UNIQUE_TO_VARIANT ?
									` (${variantToName(variant, false)} only)`
								: specificity === VariantSpecificity.NOT_UNIVERSAL ?
									` (${variantToName(variant, false)} specific)`
								:
									undefined
							)
						})()
						
						return {
							id: evalAttrId.toString(),
							color: ratingToColor(evalAttr.evaluation.value.rating),
							weight: 1,
							arcLabel: icon,
							tooltip: `${icon} ${evalAttr.evaluation.value.displayName}${tooltipSuffix}`,
							tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating),
						}
					}
				)
			}
			highlightedSliceId={currentEvaluationAttribute?.attribute.id}
			centerLabel={
				groupScore ?
					groupScore.hasUnratedComponent ?
						ratingToIcon(Rating.UNRATED)
					: groupScore.score <= 0.0 ?
						'\u{1f480}'
					: groupScore.score >= 1.0 ?
							'\u{1f4af}'
					:
						(groupScore.score * 100).toFixed(0)
				:
					'❓'
			}
			onSliceClick={id => {
				selectedEvaluationAttribute = activeEvaluationAttribute = (
					selectedEvaluationAttribute === id ? undefined : id
				)

				if (!isExpanded)
					toggleExpanded?.(wallet.metadata.id)
			}}
			onSliceMouseEnter={id => {
				activeEvaluationAttribute = id
			}}
			onSliceMouseLeave={id => {
				if (activeEvaluationAttribute === id)
					activeEvaluationAttribute = undefined
			}}
			onSliceFocus={id => {
				activeEvaluationAttribute = id
			}}
			onSliceBlur={id => {
				if (activeEvaluationAttribute === id)
					activeEvaluationAttribute = undefined
			}}
		/>
	{/if}

	<div
		class="details column"
		hidden={!isExpanded}
	>
		{#if !currentEvaluationAttribute}
			<h3>
				{attrGroup.icon} {attrGroup.displayName}
			</h3>

			<p>
				<Typography
					content={attrGroup.perWalletQuestion}
					strings={{
						WALLET_NAME: wallet.metadata.displayName,
					}}
				/>
			</p>
		{:else if currentEvaluationAttribute?.evaluation?.value}
			<h4>
				{currentEvaluationAttribute.evaluation.value.icon ?? currentEvaluationAttribute.attribute.icon} {currentEvaluationAttribute.attribute.displayName}
			</h4>

			<p>
				{#if typeof currentEvaluationAttribute.evaluation.value.shortExplanation}
					{ratingToIcon(currentEvaluationAttribute.evaluation.value.rating)}

					<Typography
						content={currentEvaluationAttribute.evaluation.value.shortExplanation}
						strings={{
							WALLET_NAME: wallet.metadata.displayName,
							WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
							WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
						}}
					/>

					{#if selectedVariant && wallet.variants[selectedVariant]}
						{@const specificity = attributeVariantSpecificity(wallet, selectedVariant, currentEvaluationAttribute.attribute)}

						{#if specificity === VariantSpecificity.NOT_UNIVERSAL}
							This is the case on the {variantToName(selectedVariant, false)} version.

						{:else if specificity === VariantSpecificity.UNIQUE_TO_VARIANT}
							This is only the case on the {variantToName(selectedVariant, false)} version.
						{/if}
					{/if}
				{/if}
			</p>

			<a 
				href="{betaSiteRoot}/{wallet.metadata.id}/{variantUrlQuery(wallet.variants, selectedVariant)}#{slugifyCamelCase(currentEvaluationAttribute.attribute.id)}"
			>
				<span class="icon">{@html InfoIcon}</span>
				Learn more
			</a>
		{/if}
	</div>
</div>


<style>
	.container {
		justify-items: center;
		align-content: start;
		gap: 1em;
	}

	.details {
		display: grid;
		/* grid-template-columns: minmax(0, 32ch); */
		max-width: 32ch;
		justify-items: center;
		align-content: start;

		line-height: 1;
		text-align: center;

		font-size: 0.8em;

		h3 {
			margin: 0;
			font-size: 1em;
		}

		h4 {
			margin: 0;
			font-size: 1.1em;
		}

		p {
			margin: 0;
			font-size: 0.9em;

			width: 0;
			min-width: 100%;
		}
	}
</style>
