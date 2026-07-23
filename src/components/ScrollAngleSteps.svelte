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
</script>


{#snippet rotationStep(index: number)}
	{#if index < steps.length}
		<div
			class:rotation-step-a={index % 2 === 0}
			class:rotation-step-b={index % 2 === 1}
			style:---timeline={steps[index].timeline}
			style:---rotation-delta={`${steps[index].delta}deg`}
		>
			{@render rotationStep(index + 1)}
		</div>
	{:else}
		<div
			class:rotation-result-a={steps.length % 2 === 0}
			class:rotation-result-b={steps.length % 2 === 1}
		>
			{@render children()}
		</div>
	{/if}
{/snippet}


{@render rotationStep(0)}


<style>
	@property ---rotation-step {
		syntax: "<angle>";
		inherits: false;
		initial-value: 0deg;
	}

	@property ---rotation-a {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	@property ---rotation-b {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%)) {
		.rotation-step-a,
		.rotation-step-b {
			inline-size: 100%;
			block-size: 100%;

			animation: rotation-step 1ms linear both;
			animation-timeline: var(---timeline);
			animation-range: cover 78% cover 85%;
		}

		.rotation-step-a {
			---rotation-a: calc(
				var(---rotation-b)
				+ var(---rotation-step)
			);
		}

		.rotation-step-b {
			---rotation-b: calc(
				var(---rotation-a)
				+ var(---rotation-step)
			);
		}

		.rotation-result-a {
			---pie-start-angle: var(---rotation-b);
		}

		.rotation-result-b {
			---pie-start-angle: var(---rotation-a);
		}

		@keyframes rotation-step {
			from {
				---rotation-step: 0deg;
			}

			to {
				---rotation-step: var(---rotation-delta);
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rotation-step-a,
		.rotation-step-b {
			animation: none;
		}
	}
</style>
