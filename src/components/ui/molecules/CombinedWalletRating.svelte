<script lang="ts">
	// Types/constants
	import {
		type AttributeGroup,
		Rating,
		ratingToIcon,
		ratingToColor,
		evaluatedAttributesEntries,
	} from '@/schema/attributes'
	import { type RatedWallet } from '@/schema/wallet'
	import { betaSiteRoot } from '@/constants'


	// Props
	let {
		wallet,
		attributeGroups,
		tableState = $bindable(null),
		rowId,
	}: {
		wallet: RatedWallet
		attributeGroups: AttributeGroup<any>[]
		tableState: WalletTableState | null
		rowId: string | null
	} = $props()


	// Functions
	import { isNonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
	import { variantUrlQuery } from '../../variants'
	import { slugifyCamelCase } from '@/types/utils/text'


	// State
	let slices = $derived(
		attributeGroups.map(group => {
			const groupScore = group.score(wallet.overall[group.id])
			const evalGroup = wallet.overall[group.id]

			return {
				id: group.id,
				icon: group.icon,
				displayName: group.displayName,
				arcLabel: group.icon,
				color: (
					groupScore && !groupScore.hasUnratedComponent ?
						`hsl(${Math.round(groupScore.score * 120)}, 80%, 45%)`
					:
						'#666'
				),
				score: groupScore,
				tooltip: group.displayName,
				tooltipValue: (
					groupScore ?
						groupScore.hasUnratedComponent ?
							'Unrated'
						:
							(groupScore.score * 100).toFixed(0) + '%'
					:
						'N/A'
				),
				weight: 1,
				...evalGroup && {
					evalGroup,
					children: (
						evaluatedAttributesEntries(evalGroup)
							.filter(([_, evalAttr]) => (
								evalAttr?.evaluation?.value?.rating !== Rating.EXEMPT
							))
							.map(([evalAttrId, evalAttr]) => ({
								id: `${group.id}:${evalAttrId}`,
								parentId: group.id,
								color: ratingToColor(evalAttr.evaluation.value.rating),
								weight: 1,
								arcLabel: evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon,
								tooltip: `${evalAttr.attribute.displayName}`,
								tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating),
							}))
					),
				},
			}
		}),
	)

	let highlightedSlice: {
		groupId: string
		attributeId?: string
		sticky: boolean
	} | undefined = $state()

	let highlightedGroup = $derived(
		highlightedSlice && (
			slices
				.find(g => g.id === highlightedSlice?.groupId)
		)
	)

	let highlightedAttribute = $derived(
		highlightedSlice?.attributeId && highlightedGroup?.evalGroup?.[highlightedSlice.attributeId]
	)


	// Events
	const onSliceClick = (sliceId: string) => {
		const [groupId, attrId] = sliceId.split(':')

		if (!highlightedSlice) {
			// First click on any slice
			highlightedSlice = {
				groupId,
				attributeId: attrId,
				sticky: true,
			}
		} else if (highlightedSlice.groupId !== groupId || highlightedSlice.attributeId !== attrId) {
			// Clicking on a different slice
			highlightedSlice = {
				groupId,
				attributeId: attrId,
				sticky: true,
			}
		} else {
			// Clicking on the same slice, toggle sticky
			highlightedSlice = {
				groupId,
				attributeId: attrId,
				sticky: !highlightedSlice.sticky,
			}
		}

		// Expand the row
		if (tableState?.expandedRowIds && rowId) {
			tableState.expandedRowIds.add(rowId)
		}
	}

	const onSliceMouseEnter = (sliceId: string) => {
		const [groupId, attrId] = sliceId.split(':')

		if (!highlightedSlice || !highlightedSlice.sticky) {
			highlightedSlice = {
				groupId,
				attributeId: attrId,
				sticky: false,
			}
		}
	}

	const onSliceMouseLeave = (sliceId: string) => {
		const [groupId, attrId] = sliceId.split(':')

		if (
			highlightedSlice
			&& !highlightedSlice.sticky
			&& highlightedSlice.groupId === groupId
			&& highlightedSlice.attributeId === attrId
		) {
			highlightedSlice = undefined
		}
	}

	const getAttributeSlices = (groupId: string, evalGroup: any) => {
		if (!evalGroup) return []
		
		const evalEntries = evaluatedAttributesEntries(evalGroup).filter(
			([_, evalAttr]) => evalAttr?.evaluation?.value?.rating !== Rating.EXEMPT,
		)

		if (!isNonEmptyArray(evalEntries)) return []

		return nonEmptyMap(evalEntries, ([evalAttrId, evalAttr]) => {
			const icon = evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon
			return {
				id: `${groupId}:${evalAttrId}`,
				color: ratingToColor(evalAttr.evaluation.value.rating),
				weight: 1,
				arcLabel: icon,
				tooltip: `${icon} ${evalAttr.evaluation.value.displayName}`,
				tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating),
			}
		})
	}


	// Components
	import { type WalletTableState } from '../organisms/WalletTable.svelte'
	import Pie, { Layout as PieLayout } from '../atoms/Pie.svelte'
</script>


<div
	class="combined-wallet-rating"
	role="button"
	tabindex="0"
>
	<Pie
		slices={slices}
		layout={PieLayout.Full}
		padding={2}
		radius={75}
		levels={[
			{
				outerRadiusFraction: 0.7,
				innerRadiusFraction: 0.3,
				gap: 8,
				angleGap: 0
			},
			{
				outerRadiusFraction: 1,
				innerRadiusFraction: 0.75,
				gap: 2,
				angleGap: 1,
			}
		]}
		highlightedSliceId={highlightedSlice?.attributeId
			? `${highlightedSlice.groupId}:${highlightedSlice.attributeId}`
			: highlightedSlice?.groupId}
		{onSliceClick}
		{onSliceMouseEnter}
		{onSliceMouseLeave}
	>
		{#snippet centerContentSnippet()}
			<image
				href={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
				x="-15"
				y="-15"
				width="30"
				height="30"
			>
				<title>{wallet.metadata.displayName}</title>
			</image>
		{/snippet}
	</Pie>

	<!-- Expanded Details -->
	{#if tableState?.expandedRowIds?.has(rowId ?? '') && highlightedGroup}
		<div class="expanded-details">
			{#if !highlightedAttribute}
				<!-- Group Information -->
				<h3 class="group-title">{highlightedGroup.icon} {highlightedGroup.displayName}</h3>

				<!-- Show attribute slices for this group -->
				<div class="attribute-pie-container">
					<Pie
						layout="TopHalf"
						radius={45}
						slices={getAttributeSlices(highlightedGroup.id, highlightedGroup.evalGroup)}
						levels={[
							{
								outerRadiusFraction: 1,
								innerRadiusFraction: 0.6,
								gap: 4,
								angleGap: 0
							}
						]}
						highlightedSliceId={highlightedSlice?.attributeId
							? `${highlightedGroup.id}:${highlightedSlice.attributeId}`
							: null}
						{onSliceClick}
						{onSliceMouseEnter}
						{onSliceMouseLeave}
					/>
				</div>

				<p class="group-description">
					{#if typeof highlightedGroup.evalGroup.perWalletQuestion?.render === 'function'}
						{highlightedGroup.evalGroup.perWalletQuestion.render(wallet.metadata)}
					{:else}
						{highlightedGroup.evalGroup.perWalletQuestion}
					{/if}
				</p>
			{:else}
				<!-- Attribute Information -->
				<h4 class="attribute-title">
					{highlightedAttribute.evaluation.value.icon ?? highlightedAttribute.attribute.icon}
					{highlightedAttribute.attribute.displayName}
				</h4>
				<p class="attribute-description">
					{#if typeof highlightedAttribute.evaluation.value.shortExplanation.render === 'function'}
						{@const explanation = highlightedAttribute.evaluation.value.shortExplanation.render(
							wallet.metadata,
						)}
						{ratingToIcon(highlightedAttribute.evaluation.value.rating)}
						{explanation}
					{:else}
						{ratingToIcon(highlightedAttribute.evaluation.value.rating)}
						{highlightedAttribute.evaluation.value.shortExplanation}
					{/if}
				</p>

				<!-- Learn More Link -->
				<div class="learn-more-container">
					<a
						href="{betaSiteRoot}/{wallet.metadata.id}/{variantUrlQuery(
							wallet.variants,
							tableState?.variantSelected ?? null,
						)}#{slugifyCamelCase(highlightedAttribute.attribute.id)}"
						class="learn-more-link"
					>
						<svg viewBox="0 0 24 24" width="16" height="16">
							<path
								fill="currentColor"
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
							/>
						</svg>
						Learn more
					</a>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.combined-wallet-rating {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		gap: 4px;
		transition:
			opacity 0.3s ease,
			transform 0.3s ease;
	}

	.pie-container {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.expanded-details {
		height: calc(var(--expanded-row-height, 200px) - 40px);
		display: flex;
		flex-direction: column;
		line-height: 1;
		gap: 4px;
		white-space: normal;
	}

	.attribute-pie-container {
		display: flex;
		justify-content: center;
		margin: 8px 0;
	}

	.group-title,
	.attribute-title {
		white-space: nowrap;
		margin: 0;
	}

	.group-title {
		font-size: 1.2rem;
	}

	.attribute-title {
		font-size: 1.1rem;
	}

	.group-description,
	.attribute-description {
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
