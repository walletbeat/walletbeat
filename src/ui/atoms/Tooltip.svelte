<script lang="ts">
	// Types/constants
	import type { Snippet } from 'svelte'


	// Props
	let {
		placement = 'block-end',
		offset = 8,
		tooltip,
		children,
		...restProps
	}: {
		placement?: 'block-start' | 'block-end' | 'inline-start' | 'inline-end'
		offset?: number
		tooltip: Snippet
		children: Snippet
	} & Record<string, any> = $props()


	// IDs
	const id = $props.id()
	const popoverId = `tooltip-popover-${id}`
	const anchorName = `--anchor-${id}`
</script>


<button
	style:anchor-name={anchorName}
	popovertarget={popoverId}
	{...restProps}

	{@attach node => {
		const abortController = new AbortController()

		node.addEventListener(
			'mouseenter',
			() => {
				node.popoverTargetElement?.showPopover()
			},
			{ signal: abortController.signal }
		)
		node.addEventListener(
			'mouseleave',
			() => {
				node.popoverTargetElement?.hidePopover()
			},
			{ signal: abortController.signal }
		)

		return () => {
			abortController.abort()
		}
	}}
>
	<div>
		{@render children()}
	</div>

	<div
		popover="auto"
		class="tooltip"
		id={popoverId}
		style:position-area={placement}
		style:position-anchor={anchorName}
		style:--offset={`${offset}px`}
	>
		{@render tooltip()}
	</div>
</button>


<style>
	button {
		font: inherit;
		padding: 0;
		background-color: transparent;
		border: none;
	}

	[popover] {
		position: absolute;
		position-area: block-end;
		position-try-order: most-block-size;
		position-try-fallbacks: block-end, block-start, inline-start, inline-end;
		position-visibility: anchors-visible;

		margin: var(--offset);

		background: rgba(0, 0, 0, 0.95);
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);

		transition-property: opacity, scale;

		&:not(:popover-open) {
			opacity: 0;
			scale: 0.95;
			pointer-events: none;
		}
	}
</style>
