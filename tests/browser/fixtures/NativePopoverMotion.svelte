<script lang="ts">
	import { onMount } from 'svelte'
	import CheckIcon from 'lucide-static/icons/check.svg?raw'
	import { livePopoverTransition, viewTransitionName } from '@/utils/view-transition'

	let ready = $state(false)
	let cancelOpening = $state(false)
	let nativeMotion = $state(false)
	let mounted = $state(true)
	onMount(() => { ready = true })
</script>

<section data-native-motion-ready={ready ? '' : undefined}>
	<button id="native-toggle" popovertarget="native-motion-panel" popovertargetaction="toggle" disabled={!mounted}>Toggle native panel</button>
	<button id="remove-panel" disabled={!ready || !mounted} onclick={() => { mounted = false }}>Remove panel</button>
	<label><input id="cancel-opening" type="checkbox" bind:checked={cancelOpening} disabled={!ready} />Cancel opening</label>
	<label><input id="native-motion" type="checkbox" bind:checked={nativeMotion} disabled={!ready} />CSS owns position motion</label>
	{#if mounted}<div
		id="native-motion-panel"
		popover="auto"
		class:native-motion={nativeMotion}
		use:livePopoverTransition
		onbeforetoggle={(event) => { if (cancelOpening && event.newState === 'open') event.preventDefault() }}
	>
		<div class="content">
			{#each [1, 2] as id (id)}
				<label class="choice">
					<input type="checkbox" aria-label={`Native choice ${id}`} />
					<span class="helipad" style:--slot-name={`--native-motion-slot-${id}`}>
						<span
							class="position-owner"
							data-view-transition="named"
							data-motion-id={id}
							style:--live-name={viewTransitionName('native-popover-motion', id)}
							style:--closed-offset={id === 1 ? -0.25 : 0.25}
						>
							<span class="glyph" aria-hidden="true">{@html CheckIcon}</span>
						</span>
					</span>
					Native choice {id}
				</label>
			{/each}
		</div>
	</div>{/if}
</section>

<style>
	section { min-block-size: 100vh; }
	:global(#layout) { --scrollContainer-perspective: none; }
	#native-toggle {
		anchor-name: --native-motion-closed;
		position: fixed;
		inset: 100px auto auto 400px;
		inline-size: 200px;
		block-size: 40px;
	}
	#native-motion-panel {
		display: block;
		position: fixed;
		inset: 220px auto auto 760px;
		margin: 0;
		padding: 12px;
		inline-size: 260px;
		block-size: 240px;
		overflow: auto;
		border: 1px solid;
		background: var(--background-primary);
		&:not(:popover-open) { visibility: hidden; }
	}
	.content { padding-block: 144px 300px; }
	.choice { display: flex; align-items: center; gap: 12px; margin-block-end: 16px; }
	.helipad { anchor-name: var(--slot-name); inline-size: 24px; block-size: 24px; }
	.position-owner {
		--motion-box: 1.3rem;
		--view-transition-name: var(--live-name);
		position: fixed;
		position-anchor: --native-motion-closed;
		inset: auto;
		left: calc(anchor(center) + var(--closed-offset) * var(--motion-box) - var(--motion-box) / 2);
		top: calc(anchor(center) - var(--motion-box) / 2);
		inline-size: var(--motion-box);
		block-size: var(--motion-box);
		visibility: visible;
		pointer-events: none;
		transition-property: none;
	}
	.glyph {
		display: grid;
		place-items: center;
		inline-size: 100%;
		block-size: 100%;
		border-radius: 50%;
		background: var(--accent);
		transform: scale(0.5);
		transition-property: transform;
		:global(svg) { inline-size: 100%; block-size: 100%; }
	}
	#native-motion-panel:popover-open {
		.position-owner {
			position-anchor: var(--slot-name);
			left: calc(anchor(center) - var(--motion-box) / 2);
		}
		.glyph { transform: scale(tan(atan2(1.25em, var(--motion-box)))); }
	}
	.native-motion .position-owner { --view-transition-name: none; }
	@media (prefers-reduced-motion: reduce) {
		.glyph { transition-property: none; }
	}
</style>
