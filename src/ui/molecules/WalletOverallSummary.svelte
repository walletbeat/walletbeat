<script lang="ts">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import { scoreToColor } from '@/utils/colors'
	import type { MaybeUnratedScore } from '@/schema/score'


	// Props
	let {
		wallet,
		score,
		isInTooltip = false,
	}: {
		wallet: RatedWallet
		score: MaybeUnratedScore
		isInTooltip?: boolean
	} = $props()


	// Components
	import ScoreBadge from '../atoms/ScoreBadge.svelte'
</script>


<div 
	class="wallet-overall-summary"
	data-in-tooltip={isInTooltip ? '' : undefined}
	style:--accent={
		score?.score !== undefined ?
			score.hasUnratedComponent ?
				`color-mix(in srgb, ${scoreToColor(score.score)} 33%, var(--rating-unrated))`
			:
				scoreToColor(score.score)
		:
			'var(--rating-unrated)'
	}
>
	<header>
		<h2>
			<img
				src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
			/>
			{wallet.metadata.displayName}
		</h2>
	</header>

	<div>
		Walletbeat score:

		<ScoreBadge {score} size="large" />

		<!-- <p></p> -->
	
		{#if score?.hasUnratedComponent}
			<small>*contains unrated components</small>
		{/if}
	</div>
</div>


<style>
	.wallet-overall-summary {
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

		> header {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			gap: 0.5em 0.75em;

			h2 {
				font-weight: 600;
				font-size: 1.33em;
				display: flex;
				align-items: center;
				gap: 0.5em;

				img {
					width: auto;
					height: 1.25em;
				}
			}
		}

		> div {
			display: grid;
			justify-items: center;
			gap: 0.5em;
		}
	}
</style> 