<script lang="ts">
	import type { Snippet } from 'svelte'

	export interface ScrollAngleStep {
		timeline: string
		delta: number
	}

	const {
		steps,
		children,
	}: {
		steps: ScrollAngleStep[]
		children: Snippet
	} = $props()

	const animationNames = $derived(steps.map(() => 'WalletPieRotationStep').join(', '))
	const animationTimelines = $derived(steps.map(step => step.timeline).join(', '))
	const animationTimingFunctions = $derived(
		steps.map(step => `linear(0, ${step.delta})`).join(', ')
	)
</script>


<div
	class="rotation-result"
	style:animation-name={animationNames}
	style:animation-timeline={animationTimelines}
	style:animation-timing-function={animationTimingFunctions}
>
	{@render children()}
</div>


<style>
	@property ---pie-start-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	.rotation-result {
		display: contents;
		contain: style;
	}

	@supports (
		((animation-timeline: scroll()) and (animation-range: 0% 100%)) and
		(animation-composition: accumulate)
	) {
		.rotation-result {
			animation-duration: 1ms;
			animation-fill-mode: both;
			animation-composition: accumulate;
			animation-range: cover 78% cover 85%;
		}

		@keyframes -global-WalletPieRotationStep {
			from {
				---pie-start-angle: 0deg;
			}

			to {
				/*
				 * Each animation's linear() easing scales this unit angle by
				 * its configured step delta before native composition sums it.
				 */
				---pie-start-angle: 1deg;
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rotation-result {
			animation: none;
		}
	}
</style>
