<script module lang="ts">
	export enum WalletAttributeGroupSummaryType {
		None = 'none',
		Score = 'score',
	}
</script>


<script lang="ts">
	// Types/constants
	import { calculateAttributeGroupScore } from '@/schema/attribute-groups'
	import type { AttributeGroup, ValueSet } from '@/schema/attributes'
	import type { RatedWallet } from '@/schema/wallet'
	import { scoreToColor } from '@/utils/colors'


	// Props
	const {
		wallet,
		attributeGroup,
		summaryType = WalletAttributeGroupSummaryType.None,
		isInTooltip = false,
	}: {
		wallet: RatedWallet
		attributeGroup: AttributeGroup<ValueSet>,
		summaryType?: WalletAttributeGroupSummaryType
		isInTooltip?: boolean
	} = $props()


	// Derived
	const groupScore = $derived(
		calculateAttributeGroupScore(attributeGroup.attributeWeights, wallet.overall[attributeGroup.id])
	)


	// Components
	import Typography from '../components/Typography.svelte'
	import ScoreBadge from '../views/ScoreBadge.svelte'
</script>


<div
	class="attribute-group-summary"
	data-card={isInTooltip ? 'radius p-sm border-accent' : undefined}
	data-column
	style:--accent={
		groupScore?.score !== undefined ?
			groupScore.hasUnratedComponent ?
				`color-mix(in srgb, ${scoreToColor(groupScore.score)} 33%, var(--rating-unrated))`
			:
				scoreToColor(groupScore.score)
		:
			'var(--rating-unrated)'
	}
>
	<header data-row="center gap-3 wrap">
		<h3 data-row="gap-2">
			<span>{attributeGroup.icon}</span> {attributeGroup.displayName}
		</h3>

		{#if summaryType === WalletAttributeGroupSummaryType.Score}
			<ScoreBadge score={groupScore} />
		{/if}
	</header>

	<p>
		<Typography
			content={attributeGroup.perWalletQuestion}
			strings={{
				WALLET_NAME: wallet.metadata.displayName,
			}}
		/>
	</p>
</div>


<style>
	.attribute-group-summary {
		font-size: smaller;
		line-height: 1.4;

		header {
			row-gap: 0.5em;

			h3 {
				font-weight: 600;
			}
		}
	}
</style>
