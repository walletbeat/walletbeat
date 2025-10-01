<script lang="ts">
	// Types/constants
	import type { AttributeGroup } from '@/schema/attributes'
	import type { RatedWallet } from '@/schema/wallet'
	import { calculateAttributeGroupScore } from '@/schema/attribute-groups'
	import { scoreToColor } from '@/utils/colors'


	// Props
	let {
		wallet,
		attributeGroup,
		isInTooltip = false,
	}: {
		wallet: RatedWallet
		attributeGroup: AttributeGroup<any>,
		isInTooltip?: boolean
	} = $props()


	// Derived
	const groupScore = $derived(
		calculateAttributeGroupScore(attributeGroup.attributeWeights, wallet.overall[attributeGroup.id])
	)


	// Components
	import Typography from '../atoms/Typography.svelte'
	import ScoreBadge from '../atoms/ScoreBadge.svelte'
</script>


<div 
	class="attribute-group-summary"
	data-in-tooltip={isInTooltip ? '' : undefined}
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
	<header>
		<h3>
			<span>{attributeGroup.icon}</span> {attributeGroup.displayName}
		</h3>

		<ScoreBadge score={groupScore} />
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

		display: grid;
		gap: 1em;
		line-height: 1.4;

		&[data-in-tooltip] {
			padding: 0.75rem;
			border-radius: 0.5rem;
			border: 2px solid color-mix(in srgb, var(--accent) 80%, transparent);
			background-color: var(--background-primary);
		}

		header {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			gap: 0.5em 0.75em;

			h3 {
				font-weight: 600;
				display: flex;
				align-items: center;
				gap: 0.5em;
			}
		}
	}
</style>
