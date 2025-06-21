<script module lang="ts">
	declare global {
		interface HTMLButtonElement {
			popoverTargetElement?: HTMLElement & {
				showPopover(): void
				hidePopover(): void
			}
		}
		
		interface HTMLElement {
			showPopover(): void
			hidePopover(): void
		}
	}
</script>


<script lang="ts">
	// Types/constants
	import type { Snippet } from 'svelte'


	// Props
	let {
		placement = 'block-end',
		offset = 8,
		tooltip,
		hideDelay = 200,
		isEnabled = true,
		children,
		...restProps
	}: {
		placement?: 'block-start' | 'block-end' | 'inline-start' | 'inline-end'
		offset?: number
		hideDelay?: number
		tooltip: Snippet
		isEnabled?: boolean
		children: Snippet
	} & Record<string, any> = $props()


	// State
	let isTriggerHovered = $state(false)
	let isPopoverHovered = $state(false)


	// IDs
	const id = $props.id()
	const popoverId = `tooltip-popover-${id}`
	const anchorName = `--anchor-${id}`
</script>


{#if isEnabled}
	<button
		type="button"
		onclick={e => {
			e.preventDefault()
		}}
		style:anchor-name={anchorName}
		popovertarget={popoverId}
		{...restProps}

		onmouseenter={() => {
			isTriggerHovered = true
		}}
		onmouseleave={() => {
			isTriggerHovered = false
		}}
		onfocus={() => {
			isTriggerHovered = true
		}}
		onblur={() => {
			isTriggerHovered = false
		}}
	>
		{@render children()}

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			popover="auto"
			id={popoverId}

			onmouseenter={() => {
				isPopoverHovered = true
			}}
			onmouseleave={() => {
				isPopoverHovered = false
			}}
			{@attach node => {
				if (isTriggerHovered || isPopoverHovered) {
					node.showPopover()
				} else {
					const timeoutId = setTimeout(() => {
						node.hidePopover()
					}, hideDelay)

					return () => {
						clearTimeout(timeoutId)
					}
				}
			}}

			style:position-area={placement}
			style:position-anchor={anchorName}
			style:--offset={`${offset}px`}
		>
			{@render tooltip()}
		</div>
	</button>
{:else}
	{@render children()}
{/if}


<style>
	button {
		display: grid;
		font: inherit;
		padding: 0;
		background-color: transparent;
		border: none;
	}

	[popover] {
		position: absolute;
		position-visibility: anchors-visible;
		position-area: block-end;
		position-try-fallbacks: flip-block;
		position-try-order: most-block-size;

		margin: var(--offset);

		background: rgba(0, 0, 0, 0.95);
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);

		transition-property: display, content-visibility, opacity, scale;

		@starting-style {
			opacity: 0;
			scale: 0.95;
		}

		&:not(:popover-open) {
			display: none;
			content-visibility: none;
			pointer-events: none;

			opacity: 0;
			scale: 0.95;
		}
	}
</style>
