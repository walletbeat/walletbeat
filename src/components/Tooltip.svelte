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
	import type { SvelteHTMLElements } from 'svelte/elements'
	import type { Snippet } from 'svelte'


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
		...restProps
	}: SvelteHTMLElements['div'] & {
		title?: string
		placement?: 'block-start' | 'block-end' | 'inline-start' | 'inline-end'
		buttonTriggerPlacement?: 'around' | 'behind'
		hoverTriggerPlacement?: 'around' | 'button'
		offset?: number
		hideDelay?: number
		TooltipContent: Snippet
		isEnabled?: boolean
		children: Snippet
	} = $props()


	// State
	let isTriggerHovered = $state(false)
	let isPopoverHovered = $state(false)

	const hoverTriggerEvents = {
		onmouseenter: () => {
			isTriggerHovered = true
		},
		onmouseleave: () => {
			isTriggerHovered = false
		},
		onfocus: () => {
			isTriggerHovered = true
		},
		onblur: () => {
			isTriggerHovered = false
		},
	}
			
	const supportsAnchorPositioning = (
		globalThis.CSS?.supports('anchor-name: --test')
	)

	const useButtonTrigger = async (node: HTMLElement & { popoverTargetElement: HTMLElement }) => {
		$effect(() => {
			if(hoverTriggerPlacement === 'around')
				node.style.setProperty('position', 'static')
			else
				node.style.removeProperty('position')
		})

		if (supportsAnchorPositioning) return

		const {
			computePosition,
			offset: offsetMiddleware,
			flip,
			shift,
			autoUpdate,
		} = await import('@floating-ui/dom')

		const updatePosition = async () => {
			const {x, y} = await computePosition(
				node,
				node.popoverTargetElement,
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
						shift(),
					],
				}
			)

			node.popoverTargetElement.style.left = `${x}px`
			node.popoverTargetElement.style.top = `${y}px`
		}

		updatePosition()

		return autoUpdate(
			node,
			node.popoverTargetElement,
			updatePosition
		)
	}
</script>


{#if isEnabled}
	{#snippet Popover()}
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

			{...restProps}
		>
			{@render TooltipContent()}
		</div>
	{/snippet}

	{#if buttonTriggerPlacement === 'behind'}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			data-stack
			{...hoverTriggerPlacement === 'around' && hoverTriggerEvents}
		>
			<button
				type="button"
				{title}
				data-tooltip-trigger
				style:anchor-name={anchorName}
				popovertarget={popoverId}
				
				{...hoverTriggerPlacement === 'button' && hoverTriggerEvents}
				{@attach useButtonTrigger}
			></button>

			{@render children()}
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
			{@render children()}

			{@render Popover()}
		</button>
	{/if}
{:else}
	{@render children()}
{/if}


<style>
	[data-tooltip-trigger] {
		display: grid;
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

		position: absolute;
		position-visibility: anchors-visible;
		position-area: block-end;
		position-try-fallbacks: flip-block;
		position-try-order: most-block-size;

		margin: var(--offset);

		background-color: var(--popover-backgroundColor);
		border-radius: 0.5rem;
		padding: var(--popover-padding);
		border: var(--popover-borderWidth) solid var(--popover-borderColor);
		backdrop-filter: blur(10px);
		box-shadow: var(--popover-boxShadow);

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
