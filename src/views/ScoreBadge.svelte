<script lang="ts">
	// Types/constants
	import type { MaybeUnratedScore } from '@/schema/score'


	// Props
	const {
		score,
		size = 'medium',
	}: {
		score: MaybeUnratedScore
		size?: 'small' | 'medium' | 'large'
	} = $props()


	// Functions
	import { scoreToColor } from '@/utils/colors'
</script>


{#if score !== null && score.score !== null}
	<data
		data-badge={size}
		value={score.score}
		title={score.hasUnratedComponent ? '*contains unrated components' : undefined}
		style:--accent={scoreToColor(score.score)}
	>
		<strong>
			{`${Math.round(score.score * 100)}%`}
		</strong
		>{#if score.hasUnratedComponent}*{/if}
	</data>
{:else}
	<data
		data-badge={size}
		value="UNRATED"
		title="*contains unrated components"
	>
		<small>UNRATED</small>
	</data>
{/if}


<style>
	data {
		&[value='UNRATED'] {
			--accent: var(--rating-unrated);
		}
	}
</style>
