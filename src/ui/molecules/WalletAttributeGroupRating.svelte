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
	import Pie, { PieLayout } from '../atoms/Pie.svelte'
	import WalletAttributeSummary from './WalletAttributeSummary.svelte'
</script>

<div 
	class="container column"
	role="button"
	tabindex="0"
>
	<!-- Rating Pie Chart -->
	{#if groupScore === undefined || !isNonEmptyArray(evaluatedAttributesEntries(evalGroup).filter(([_, evalAttr]) => evalAttr?.evaluation?.value?.rating !== Rating.EXEMPT))}
		<div>N/A</div>
	{:else}
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

		<Pie
			layout={PieLayout.FullTop}
			radius={44}
			levels={[
				{
					outerRadiusFraction: 1,
					innerRadiusFraction: 0.3,
					gap: 2,
					angleGap: 0
				}
			]}
			padding={4}
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
		class="details"
		hidden={!isExpanded}
	>
		{#if !((activeEvaluationAttribute ? evalGroup[activeEvaluationAttribute] : selectedEvaluationAttribute ? evalGroup[selectedEvaluationAttribute] : undefined))}
			<WalletAttributeSummary
				{wallet}
				attributeGroup={attrGroup}
			/>
		{:else}
			{@const evaluatedAttribute = (
				activeEvaluationAttribute ?
					evalGroup[activeEvaluationAttribute]
				: selectedEvaluationAttribute ?
					evalGroup[selectedEvaluationAttribute]
				:
					undefined
			)}

			<WalletAttributeSummary
				{wallet}
				{evaluatedAttribute}
				{selectedVariant}
			/>
		{/if}
	</div>
</div>


<style>
	.container {
		display: grid;
		gap: 0.75em;
	}

	.details {
		width: 10rem;
		min-width: 100%;
		font-size: 0.66em;
		text-align: center;
	}
</style>
