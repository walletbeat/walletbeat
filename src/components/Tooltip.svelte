<script module lang="ts">
	declare global {
		interface HTMLButtonElement {
			interestForElement?: HTMLElement | null
			showPopover(): void
			hidePopover(): void
		}

		interface HTMLElement {
			showPopover(): void
			hidePopover(): void
		}
	}

	export type TooltipPlacement = 'block-start' | 'block-end' | 'inline-start' | 'inline-end'
	export type TooltipButtonTriggerPlacement = 'around' | 'behind'
	export type TooltipHoverTriggerPlacement = 'around' | 'button'
</script>


<script lang="ts">
	// Types/constants
	import type { HTMLAttributes } from 'svelte/elements'
	import type { Snippet } from 'svelte'
	import { interest } from './interest'


	// IDs
	const id = $props.id()
	const popoverId = `tooltip-popover-${id}`
	const anchorName = `--anchor-${id}`


	// Props
	let {
		title,
		placement = 'block-end',
		buttonTriggerPlacement = 'around',
		hoverTriggerPlacement = 'around',
		offset = 8,
		TooltipContent,
		hideDelay = 200,
		isEnabled = true,
		children,
		Layout,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		title?: string
		placement?: TooltipPlacement
		buttonTriggerPlacement?: TooltipButtonTriggerPlacement
		hoverTriggerPlacement?: TooltipHoverTriggerPlacement
		offset?: number
		hideDelay?: number
		TooltipContent?: Snippet
		isEnabled?: boolean
		children?: Snippet
		Layout?: Snippet<[Snippet, Snippet]>
	} = $props()


	// A wrapper containing links cannot be a native button interest invoker.
	const wrapperInterest = $derived(buttonTriggerPlacement === 'behind' && hoverTriggerPlacement === 'around')

	// Unsupported hint values become manual popovers, losing native dismissal.
	// Start with auto for SSR, then enhance only when the browser reflects hint.
	function enhancePopover(node: HTMLElement) {
		node.popover = 'hint'

		if (node.popover !== 'hint') node.popover = 'auto'
	}

</script>


{#if isEnabled}
	{#snippet Popover()}
		<div
			popover="auto"
			use:enhancePopover
			id={popoverId}

			style:--tooltip-positionArea={placement}
			style:--tooltip-anchor={anchorName}
			style:--offset={`${offset}px`}

			{...restProps}
		>
			{#if TooltipContent}
				{@render TooltipContent()}
			{/if}
		</div>
	{/snippet}

	{#snippet Trigger()}
	{#if buttonTriggerPlacement === 'behind' || Layout}
		<div
			data-stack
			data-tooltip-placement={buttonTriggerPlacement}
			data-tooltip-anchor={hoverTriggerPlacement === 'around' ? '' : undefined}
			style:--tooltip-anchor={anchorName}
			use:interest={{ id: wrapperInterest ? popoverId : undefined, hideDelay }}
		>
			<button
				type="button"
				{title}
				aria-label={title ?? 'Show details'}
				data-tooltip-trigger
				style:--tooltip-anchor={hoverTriggerPlacement === 'button' ? anchorName : 'none'}
				interestfor={wrapperInterest ? undefined : popoverId}
				popovertarget={popoverId}
				popovertargetaction="show"
				use:interest={{ id: wrapperInterest ? undefined : popoverId, hideDelay }}
			></button>

			{#if children}
				{@render children()}
			{/if}
		</div>

	{:else if buttonTriggerPlacement === 'around'}
		<button
			type="button"
			data-tooltip-trigger
			style:--tooltip-anchor={anchorName}
			interestfor={popoverId}
			popovertarget={popoverId}
			popovertargetaction="show"
			use:interest={{ id: popoverId, hideDelay }}
		>
			{#if children}
				{@render children()}
			{/if}
		</button>
	{/if}
	{/snippet}
	{#if Layout}
		{@render Layout(Trigger, Popover)}
	{:else}
		{@render Trigger()}
		{@render Popover()}
	{/if}
{:else}
	{#if children}
		{@render children()}
	{/if}
{/if}


<style>
	/* The popover sits in the top layer and the scroll container is a page ancestor:
	   the root is their closest shared scope. */
	:global(:root) {
		--tooltip-drawerMargin: 0.75rem;
		--tooltip-drawerBlockSize: min(15rem, 50dvb);
	}

	[data-tooltip-anchor],
	[data-tooltip-trigger] {
		anchor-name: var(--tooltip-anchor);
	}

	[data-tooltip-trigger] {
		display: inline-grid;
		font: inherit;
		padding: 0;
		background-color: transparent;
		border: none;
	}

	/* Overlay trigger must cover the stacked content without contributing size. */
	[data-stack] > [data-tooltip-trigger] {
		min-inline-size: 0;
		min-block-size: 0;
	}

	/* A disclosure keeps its label outside the invoker, including before hydration.
	   Around captures the whole surface; behind leaves foreground links and controls live. */
	[data-tooltip-placement='around'] > [data-tooltip-trigger] {
		z-index: 1;
	}

	[popover]:not(:global(details[open]) > *) {
		--popover-padding: 1rem;
		--popover-backgroundColor: light-dark(rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0.95));
		--popover-borderColor: var(--border-color);
		--popover-borderWidth: 1px;
		--popover-boxShadow: 0 4px 12px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.4));

		position: fixed;
		position-anchor: var(--tooltip-anchor);
		position-area: var(--tooltip-positionArea, block-end);
		position-try-fallbacks: flip-block;
		position-try-order: most-block-size;
		position-visibility: anchors-visible;

		margin: var(--offset);
		width: max-content;
		max-width: calc(100vw - var(--offset) * 2);

		background-color: var(--popover-backgroundColor);
		border-radius: 0.5rem;
		padding: var(--popover-padding);
		border: var(--popover-borderWidth) solid var(--popover-borderColor);
		backdrop-filter: blur(10px);
		box-shadow: var(--popover-boxShadow);

		transition-property:
			display,
			content-visibility,
			overlay,
			opacity,
			scale,
			translate
		;

		@starting-style {
			opacity: 0;
			scale: 0.95;
		}

		&:not(:popover-open) {
			display: none;
			pointer-events: none;

			opacity: 0;
			scale: 0.95;
		}

		/* Below this width an anchored tooltip cannot clear its own trigger: become a drawer. */
		@media (width <= 40rem) {
			position-area: none;
			position-anchor: auto;
			position-try-fallbacks: none;
			position-visibility: always;

			inset: auto var(--tooltip-drawerMargin) var(--tooltip-drawerMargin);
			margin: 0;
			inline-size: auto;
			max-inline-size: none;
			max-block-size: var(--tooltip-drawerBlockSize);
			overflow: auto;

			@starting-style {
				translate: 0 100%;
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		[popover]:not(:global(details[open]) > *) {
			transition-duration: 0s;
		}
	}

	/* Keep the anchoring element reachable in the viewport left above the drawer. */
	@media (width <= 40rem) {
		/* A behind trigger only enhances a disclosure on wide layouts. Removing the
		 * overlay restores the native summary hit target and keyboard behavior. */
		:global(summary) > [data-stack] > [data-tooltip-trigger] {
			display: none;
		}

		:global([data-scroll-container]:has([popover]:popover-open)) {
			--scrollContainer-scrollPaddingBlockEnd: calc(
				var(--tooltip-drawerBlockSize) + 2 * var(--tooltip-drawerMargin)
			);
		}

		[data-tooltip-trigger]:has(+ [popover]:popover-open) {
			scroll-margin-block-end: calc(
				var(--tooltip-drawerBlockSize) + 2 * var(--tooltip-drawerMargin)
			);
		}
	}
</style>
