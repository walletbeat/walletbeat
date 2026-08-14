<script lang="ts" generics="_AttributeGroupId extends string">
	import type { NavigationItem } from '@/constants/navigation'
	import type { AttributeTree, EvaluationTree } from '@/schema/attribute-groups'
	import { calculateAttributeGroupScore } from '@/schema/attribute-groups'
	import ScoreBadge from '@/views/ScoreBadge.svelte'

	const {
		item,
		depth,
		attributeTree,
		evalTree,
		showScores,
	}: {
		item: NavigationItem
		depth: number
		attributeTree: AttributeTree<_AttributeGroupId>
		evalTree: EvaluationTree<_AttributeGroupId> | null
		showScores: boolean
	} = $props()

	const attrGroup = $derived(
		depth === 0
			? Object.values(attributeTree).find(group => `toc-${group.id}` === item.id)
			: undefined
	)
	const evalGroup = $derived(attrGroup && evalTree?.[attrGroup.id])
</script>

{#if depth === 0 && showScores && attrGroup && evalGroup}
	<ScoreBadge score={calculateAttributeGroupScore(attrGroup, evalGroup)} size="medium" />
{/if}
