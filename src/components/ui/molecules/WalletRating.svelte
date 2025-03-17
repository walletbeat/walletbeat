<script lang="ts" generics="
	_ValueSet extends ValueSet = ValueSet
">
	// Types/constants
	import type { EvaluationTree } from '@/schema/attribute-groups'
	import {
		type AttributeGroup,
		type EvaluatedGroup,
		type ValueSet,
		type EvaluatedAttribute,
		Rating,
		type Value,
		evaluatedAttributesEntries,
		ratingToIcon,
		ratingToColor,
	} from '@/schema/attributes'
	import { attributeVariantSpecificity, VariantSpecificity, type RatedWallet } from '@/schema/wallet'
	import { isNonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { betaSiteRoot } from '@/constants'
	import { variantToName, variantUrlQuery } from '../../variants'
	import Pie, { Layout } from '../atoms/Pie.svelte'
	import type { WalletTableState } from '../organisms/WalletTable.svelte'
	import type { MaybeUnratedScore } from '@/schema/score'


	// Props
	let {
		wallet,
		attrGroup,
		evalGroup,
		groupScore,
		tableState = $bindable(null as WalletTableState | null),
		rowId = null
	}: {
		wallet: RatedWallet
		attrGroup: AttributeGroup<_ValueSet>
		evalGroup: EvaluatedGroup<_ValueSet>
		groupScore: MaybeUnratedScore
		tableState?: WalletTableState | null
		rowId?: string | null
	} = $props()


	// State
	let highlightedSlice = $state<
		{
			evalAttrId: string,
			sticky: boolean
		} | null
	>(null)

	let evalEntries = $derived(
		evalGroup ? 
			evaluatedAttributesEntries(evalGroup)
				.filter(([_, evalAttr]) => (
					evalAttr?.evaluation?.value?.rating !== Rating.EXEMPT
				))
			: []
	)

	let highlightedEvalAttr = $derived(
		highlightedSlice !== null && evalGroup ?
			evalGroup[highlightedSlice.evalAttrId]
		:
			null 
	)

	// Actions
	const onSliceClick = (evalAttrId: string) => {
		if (highlightedSlice === null) {
			// First click on any slice, create a new highlight
			highlightedSlice = {
				evalAttrId,
				sticky: true
			}
		} else if (highlightedSlice.evalAttrId !== evalAttrId) {
			// Clicking on a different slice, update the highlight
			highlightedSlice = {
				evalAttrId,
				sticky: true
			}
		} else {
			// Clicking on the same slice, toggle sticky state
			highlightedSlice = {
				evalAttrId,
				sticky: !highlightedSlice.sticky
			}
		}
		// In either case, expand the row
		if (tableState?.expandedRowIds && rowId) {
			tableState.expandedRowIds.add(rowId)
		}
	}

	const onSliceMouseEnter = (evalAttrId: string) => {
		if (highlightedSlice === null) {
			// First to be focused
			highlightedSlice = {
				evalAttrId,
				sticky: false
			}
		}
	}

	const onSliceMouseLeave = (evalAttrId: string) => {
		if (highlightedSlice !== null && 
			!highlightedSlice.sticky && 
			highlightedSlice.evalAttrId === evalAttrId) {
			highlightedSlice = null
		}
	}
</script>

<div 
	class="wallet-rating-cell" 
	role="button"
	tabindex="0"
>
	<!-- Rating Pie Chart -->
	{#if groupScore === null || !isNonEmptyArray(evalEntries)}
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
						const tooltipSuffix: string = (() => {
							if (
								!tableState?.variantSelected ||
								wallet.variants[tableState.variantSelected] === undefined
							) {
								return ''
							}
							switch (
								attributeVariantSpecificity(wallet, tableState.variantSelected, evalAttr.attribute)
							) {
								case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
									return ''
								case VariantSpecificity.ALL_SAME:
									return ''
								case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
									return ''
								case VariantSpecificity.UNIQUE_TO_VARIANT:
									return ` (${variantToName(tableState.variantSelected, false)} only)`
								case VariantSpecificity.NOT_UNIVERSAL:
									return ` (${variantToName(tableState.variantSelected, false)} specific)`
							}
						})()
						
						return {
							id: evalAttrId.toString(),
							color: ratingToColor(evalAttr.evaluation.value.rating),
							weight: 1,
							arcLabel: icon,
							tooltip: `${icon} ${evalAttr.evaluation.value.displayName}${tooltipSuffix}`,
							tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating)
						}
					}
				)
			}
			layout="TopHalf"
			radius={45}
			levels={[
				{
					outerRadiusFraction: 1,
					innerRadiusFraction: 0.6,
					gap: 4,
					angleGap: 0
				}
			]}
			highlightedSliceId={highlightedSlice?.evalAttrId}
			centerLabel={groupScore ? (groupScore.hasUnratedComponent ? ratingToIcon(Rating.UNRATED) : groupScore.score <= 0.0 ? '\u{1f480}' : groupScore.score >= 1.0 ? '\u{1f4af}' : (groupScore.score * 100).toFixed(0)) : '❓'}
			onSliceClick={onSliceClick}
			onSliceMouseEnter={onSliceMouseEnter}
			onSliceMouseLeave={onSliceMouseLeave}
		/>
	{/if}
	
	<!-- Expanded Details -->
	{#if tableState?.expandedRowIds?.has(rowId ?? '')}
		<div class="expanded-details">
			{#if highlightedEvalAttr === null}
				<!-- Group Information -->
				<h3 class="group-title">{attrGroup.icon} {attrGroup.displayName}</h3>
				<p class="group-description">
					{#if typeof attrGroup.perWalletQuestion.render === 'function'}
						{attrGroup.perWalletQuestion.render(wallet.metadata)}
					{:else}
						{attrGroup.perWalletQuestion}
					{/if}
				</p>
			{:else}
				<!-- Attribute Information -->
				<h4 class="attribute-title">
					{highlightedEvalAttr.evaluation.value.icon ?? highlightedEvalAttr.attribute.icon} {highlightedEvalAttr.attribute.displayName}
				</h4>
				<p class="attribute-description">
					{#if typeof highlightedEvalAttr.evaluation.value.shortExplanation.render === 'function'}
						{@const explanation = highlightedEvalAttr.evaluation.value.shortExplanation.render(wallet.metadata)}
						{@const suffix = (() => {
							if (
								!tableState?.variantSelected ||
								wallet.variants[tableState.variantSelected] === undefined
							) {
								return ''
							}
							switch (
								attributeVariantSpecificity(wallet, tableState.variantSelected, highlightedEvalAttr.attribute)
							) {
								case VariantSpecificity.ALL_SAME:
								case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
								case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
									return ''
								case VariantSpecificity.NOT_UNIVERSAL:
									return ` This is the case on the ${variantToName(tableState.variantSelected, false)} version.`
								case VariantSpecificity.UNIQUE_TO_VARIANT:
									return ` This is only the case on the ${variantToName(tableState.variantSelected, false)} version.`
							}
						})()}
						{ratingToIcon(highlightedEvalAttr.evaluation.value.rating)} {explanation}{suffix}
					{:else}
						{ratingToIcon(highlightedEvalAttr.evaluation.value.rating)} {highlightedEvalAttr.evaluation.value.shortExplanation}
					{/if}
				</p>
				
				<!-- Learn More Link -->
				<div class="learn-more-container">
					<a 
						href="{betaSiteRoot}/{wallet.metadata.id}/{variantUrlQuery(wallet.variants, tableState?.variantSelected ?? null)}#{slugifyCamelCase(highlightedEvalAttr.attribute.id)}"
						class="learn-more-link"
					>
						<svg viewBox="0 0 24 24" width="16" height="16">
							<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
						</svg>
						Learn more
					</a>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.wallet-rating-cell {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}
	
	.expanded-details {
		height: calc(var(--expanded-row-height, 200px) - 40px);
		display: flex;
		flex-direction: column;
		line-height: 1;
		gap: 4px;
		white-space: normal;
	}
	
	.group-title, .attribute-title {
		white-space: nowrap;
		margin: 0;
	}
	
	.group-title {
		font-size: 1.2rem;
	}
	
	.attribute-title {
		font-size: 1.1rem;
	}
	
	.group-description, .attribute-description {
		margin: 0;
		font-size: 0.9rem;
	}
	
	.learn-more-container {
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
	
	.learn-more-link {
		display: flex;
		align-items: center;
		gap: 4px;
		text-decoration: none;
		color: inherit;
	}
</style>
