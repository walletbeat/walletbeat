<script module lang="ts">
	export enum WalletSummaryType {
		None = 'none',
		Score = 'score',
		Stage = 'stage',
	}
</script>

<script lang="ts">
	// Types/constants
	import type { MaybeUnratedScore } from '@/schema/score'
	import type { RatedWallet } from '@/schema/wallet'
	import { walletTypeToName } from '@/schema/wallet-types'
	import { scoreToColor } from '@/utils/colors'


	// Props
	const {
		wallet,
		score,
		summaryType = WalletSummaryType.None,
		isInTooltip = false,
	}: {
		wallet: RatedWallet<string>
		score: MaybeUnratedScore
		summaryType?: WalletSummaryType
		isInTooltip?: boolean
	} = $props()


	// Derived
	import { getWalletStagesByType } from '@/utils/stage'
	const stagesByType = $derived(
		getWalletStagesByType(wallet)
	)


	// Components
	import ScoreBadge from '../views/ScoreBadge.svelte'
	import WalletStageBadge from '../views/WalletStageBadge.svelte'
</script>


<div
	class="wallet-overall-summary"
	data-card={isInTooltip ? 'radius p-sm border-accent' : undefined}
	data-column
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
	<header data-row="center gap-3 wrap">
		<h2 data-row="gap-2">
			<img
				src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
			/>
			{wallet.metadata.displayName}
		</h2>
	</header>

	<div data-column="center gap-2">
		{#if summaryType === WalletSummaryType.Stage}
			{#if stagesByType.length > 0}
				Walletbeat stage:
				<div data-row="center gap-2 wrap">
					{#each stagesByType as { walletType, stage, ladderEvaluation } (walletType)}
						<div data-column="center gap-1">
							<small>{walletTypeToName(walletType)}</small>
							<WalletStageBadge {stage} {ladderEvaluation} size="large" />
						</div>
					{/each}
				</div>
			{:else}
				Walletbeat score:
				<ScoreBadge {score} size="large" />
				{#if score?.hasUnratedComponent}
					<small>*contains unrated components</small>
				{/if}
			{/if}
		{:else if summaryType === WalletSummaryType.Score}
			Walletbeat score:
			<ScoreBadge {score} size="large" />
			{#if score?.hasUnratedComponent}
				<small>*contains unrated components</small>
			{/if}
		{/if}
	</div>
</div>


<style>
	.wallet-overall-summary {
		font-size: smaller;
		line-height: 1.4;

		> header {
			row-gap: 0.5em;

			h2 {
				font-weight: 600;
				font-size: 1.33em;

				img {
					width: auto;
					height: 1.25em;
				}
			}
		}
	}
</style>
