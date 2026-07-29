<script lang="ts" generics="_AttributeGroupId extends string">
	import type { NavigationItem } from '@/constants/navigation'
	import type { AttributeTree, EvaluationTree } from '@/schema/attribute-groups'
	import { calculateAttributeGroupScore } from '@/schema/attribute-groups'
	import type { Ladders } from '@/schema/ladders'
	import type { RatedWallet } from '@/schema/wallet'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { getWalletStageAndLadder } from '@/utils/stage'
	import { getAttributeStagesForWallet } from '@/utils/stage-attributes'
	import ScoreBadge from '@/views/ScoreBadge.svelte'

	type WalletPageWallet<_AttributeGroupId extends string> =
		Omit<RatedWallet<_AttributeGroupId>, 'ladders'> &
		Partial<Pick<RatedWallet<_AttributeGroupId>, 'ladders'>>

	const {
		item,
		depth,
		attributeTree,
		evalTree,
		ladders,
		wallet,
		showScores,
		showStage,
	}: {
		item: NavigationItem
		depth: number
		attributeTree: AttributeTree<_AttributeGroupId>
		evalTree: EvaluationTree<_AttributeGroupId> | null
		ladders: Ladders<_AttributeGroupId>
		wallet: WalletPageWallet<_AttributeGroupId>
		showScores: boolean
		showStage: boolean
	} = $props()

	const attrGroup = $derived(
		depth === 0
			? Object.values(attributeTree).find(group => `toc-${group.id}` === item.id)
			: undefined
	)
	const evalGroup = $derived(attrGroup && evalTree?.[attrGroup.id])
	const attribute = $derived(
		depth === 1
			? Object.values(attributeTree)
				.flatMap(group => group.attributes)
				.find(({ attribute }) => `#${slugifyCamelCase(attribute.id)}` === item.href)
				?.attribute
			: undefined
	)
	const stageContext = $derived(getWalletStageAndLadder(wallet))
	const stageNumbers = $derived(
		attribute && stageContext.ladderType
			? getAttributeStagesForWallet(ladders, attribute, wallet)
				.find(stage => stage.ladderType === stageContext.ladderType)
				?.stageNumbers ?? []
			: []
	)
	const stage = $derived(
		stageContext.ladderEvaluation && stageNumbers.length > 0
			? stageContext.ladderEvaluation.ladder.stages[stageNumbers[0]]
			: undefined
	)
</script>

{#if depth === 0 && showScores && attrGroup && evalGroup}
	<ScoreBadge score={calculateAttributeGroupScore(attrGroup, evalGroup)} size="medium" />
{:else if depth === 1 && showStage && stage && stageContext.ladderEvaluation}
	<span
		class="navigation-stage-badge"
		data-badge="small"
		style:--accent="var(--accent-color)"
		title={`This attribute is required for stage${stageNumbers.length > 1 ? 's' : ''} ${stageNumbers.join(', ')}`}
	>
		<small>Stage {stageNumbers.join(', ')}</small>
	</span>
{/if}
