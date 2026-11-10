<script module lang="ts">
	declare global {
		interface HTMLElement {
			showPopover(): void
			hidePopover(): void
		}
	}

	export enum TooltipLayoutMode {
		FloatingUI = 'FloatingUI',
		AnchorPositioning = 'AnchorPositioning',
	}
</script>


<script lang="ts">
	// Types/constants
	import type { HTMLAttributes } from 'svelte/elements'
	import type { Snippet } from 'svelte'
	import { createAttachmentKey } from 'svelte/attachments'


	// IDs
	const id = $props.id()
	const popoverId = `tooltip-popover-${id}`
	const anchorName = `--anchor-${id}`


	// Props
	let {
		title,
		ariaLabel,
		placement = 'block-end',
		buttonTriggerPlacement = 'around',
		hoverTriggerPlacement = 'around',
		layoutMode = TooltipLayoutMode.FloatingUI,
		offset = 8,
		TooltipContent,
		hideDelay = 200,
		isEnabled = true,
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		title?: string
		/** Accessible name for the trigger button. Needed when `buttonTriggerPlacement` is `'behind'`, where the button has no content. */
		ariaLabel?: string
		placement?: 'block-start' | 'block-end' | 'inline-start' | 'inline-end'
		buttonTriggerPlacement?: 'around' | 'behind'
		hoverTriggerPlacement?: 'around' | 'button'
		layoutMode?: TooltipLayoutMode
		offset?: number
		hideDelay?: number
		TooltipContent?: Snippet
		isEnabled?: boolean
		children?: Snippet
	} = $props()


	// State
	let isTriggerHovered = $state(false)
	let isPopoverHovered = $state(false)

	const hoverTriggerEvents = {
		onpointerenter: () => {
			isTriggerHovered = true
		},
		onpointerleave: () => {
			isTriggerHovered = false
		},
		onfocus: () => {
			isTriggerHovered = true
		},
		onblur: () => {
			isTriggerHovered = false
		},
		// The pointer may have entered before hydration, when no handler was
		// listening, and `pointerenter` won't fire again until it leaves
		[createAttachmentKey()]: (node: HTMLElement) => {
			if (node.matches(':hover'))
				isTriggerHovered = true
		},
	}

	const supportsAnchorPositioning = (
		globalThis.CSS?.supports('anchor-name: --test')
	)

	let triggerElement: HTMLElement | undefined

	const useButtonTrigger = (node: HTMLElement) => {
		triggerElement = node

		// When the wrapper handles hover, a button behind the content is made
		// static so it doesn't paint over the content.
		$effect(() => {
			if(buttonTriggerPlacement === 'behind' && hoverTriggerPlacement === 'around')
				node.style.setProperty('position', 'static')
			else
				node.style.removeProperty('position')
		})
	}

	// Attachments must return their cleanup synchronously (an async attachment
	// returns a Promise, which Svelte silently ignores), and floating-ui's
	// `autoUpdate` polls and re-measures on every scroll, so it only runs while
	// the popover is open. The module is fetched up front so the first open
	// doesn't wait on the network, and the popover stays hidden until it has
	// a position.
	const useFloatingUiPositioning = (popover: HTMLElement) => {
		if (layoutMode === TooltipLayoutMode.AnchorPositioning && supportsAnchorPositioning)
			return

		// Disable native anchor positioning
		popover.style.position = 'absolute'
		popover.style.setProperty('position-area', 'none')
		popover.style.setProperty('position-anchor', anchorName)

		const floatingUi = import('@floating-ui/dom')

		let stopAutoUpdate: (() => void) | undefined
		let isDetached = false

		const stopPositioning = () => {
			stopAutoUpdate?.()
			stopAutoUpdate = undefined
		}

		const startPositioning = async () => {
			const {
				computePosition,
				offset: offsetMiddleware,
				flip,
				shift,
				autoUpdate,
			} = await floatingUi

			const reference = triggerElement

			if (isDetached || stopAutoUpdate || !reference || !popover.matches(':popover-open'))
				return

			stopAutoUpdate = autoUpdate(
				reference,
				popover,
				() => {
					void computePosition(
						reference,
						popover,
						{
							placement: ({
								'block-start': 'top',
								'block-end': 'bottom',
								'inline-start': 'left',
								'inline-end': 'right',
							} as const)[placement],
							middleware: [
								offsetMiddleware(offset),
								flip(),
								shift({
									padding: offset * 2,
									crossAxis: true,
									mainAxis: true,
								}),
							],
						}
					)
						.then(({ x, y }) => {
							popover.style.left = `${x}px`
							popover.style.top = `${y}px`
							popover.style.removeProperty('visibility')
						})
				}
			)
		}

		// `beforetoggle` fires before the popover is first painted, unlike `toggle`
		const onBeforeToggle = (event: ToggleEvent) => {
			if (event.newState === 'open') {
				popover.style.visibility = 'hidden'
				void startPositioning()
			} else {
				stopPositioning()
			}
		}

		popover.addEventListener('beforetoggle', onBeforeToggle)

		return () => {
			isDetached = true
			popover.removeEventListener('beforetoggle', onBeforeToggle)
			stopPositioning()
		}
	}
</script>


{#if isEnabled}
	{#snippet Popover()}
		<div
			popover="auto"
			id={popoverId}

			onpointerenter={() => {
				isPopoverHovered = true
			}}
			onpointerleave={() => {
				isPopoverHovered = false
			}}
			{@attach (node: HTMLElement) => {
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
			{@attach useFloatingUiPositioning}

			style:position-area={placement}
			style:position-anchor={anchorName}
			style:--offset={`${offset}px`}

			{...restProps}
		>
			{#if TooltipContent}
				{@render TooltipContent()}
			{/if}
		</div>
	{/snippet}

	{#if buttonTriggerPlacement === 'behind'}
		<div
			data-stack
			{...hoverTriggerPlacement === 'around' && hoverTriggerEvents}
		>
			<button
				type="button"
				{title}
				aria-label={ariaLabel}
				data-tooltip-trigger
				style:anchor-name={anchorName}
				popovertarget={popoverId}
				{...hoverTriggerPlacement === 'button' && hoverTriggerEvents}
				{@attach useButtonTrigger}
			></button>

			{#if children}
				{@render children()}
			{/if}
		</div>

		{@render Popover()}

	{:else if buttonTriggerPlacement === 'around'}
		<button
			type="button"
			data-tooltip-trigger
			style:anchor-name={anchorName}
			popovertarget={popoverId}

			{...hoverTriggerEvents}
			{@attach useButtonTrigger}
		>
			{#if children}
				{@render children()}
			{/if}

			{@render Popover()}
		</button>
	{/if}
{:else}
	{#if children}
		{@render children()}
	{/if}
{/if}


<style>
	[data-tooltip-trigger] {
		display: inline grid;
		font: inherit;
		padding: 0;
		background-color: transparent;
		border: none;
	}

	[popover] {
		--popover-padding: 1rem;
		--popover-backgroundColor: light-dark(rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0.95));
		--popover-borderColor: var(--border-color);
		--popover-borderWidth: 1px;
		--popover-boxShadow: 0 4px 12px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.4));

		position: fixed;
		position-area: block-end;
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
			content-visibility: none;
			pointer-events: none;

			opacity: 0;
			scale: 0.95;
		}

		@media (width <= 40rem) {
			position-anchor: unset !important;
			inset: var(--offset);
			margin: auto;
			margin-block-end: 0;
			max-block-size: min(15rem, 50vh);
			overflow: auto;

			@starting-style {
				translate: 0 1em;
			}
		}
	}
</style>
