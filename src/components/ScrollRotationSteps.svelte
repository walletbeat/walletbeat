<script lang="ts">
	import type { Snippet } from 'svelte'

	export interface ScrollRotationStep {
		timeline: string
		delta: number
	}

	const {
		steps,
		children,
	}: {
		steps: ScrollRotationStep[]
		children: Snippet
	} = $props()
</script>


{#snippet rotationStep(index: number)}
	{#if index < steps.length}
		<div
			class="rotation-step"
			style:---timeline={steps[index].timeline}
			style:---rotation-delta={`${steps[index].delta}deg`}
		>
			{@render rotationStep(index + 1)}
		</div>
	{:else}
		{@render children()}
	{/if}
{/snippet}


{@render rotationStep(0)}


<style>
	@property ---rotation-step {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%)) {
		.rotation-step {
			inline-size: 100%;
			block-size: 100%;
			transform: rotate(var(---rotation-step));

			animation: rotation-step 1ms linear both;
			animation-timeline: var(---timeline);
			animation-range: entry 80% entry 100%;
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
		.rotation-step {
			animation: none;
			transform: none;
		}
	}
</style>
