<script module lang="ts">
	import { readable } from 'svelte/store'
	import { tooltipUsesDrawer } from './Tooltip.svelte'

	const compactDisclosures = readable(false, set => {
		if (typeof window === 'undefined') return

		let compact = false
		const update = () => {
			const next = tooltipUsesDrawer()

			if (next && !compact) {
				const open = [...document.querySelectorAll<HTMLDetailsElement>('details[data-tooltip-enhanced][open]')]

				for (const disclosure of open.slice(0, -1)) disclosure.open = false
			}

			compact = next
			set(compact)
		}

		update()
		window.addEventListener('resize', update)

		return () => window.removeEventListener('resize', update)
	})
</script>

<script lang="ts">
	// Types/constants
	import { onMount, type Snippet } from 'svelte'
	import type { HTMLDetailsAttributes } from 'svelte/elements'
	import type {
		TooltipButtonTriggerPlacement,
		TooltipHoverTriggerPlacement,
	} from '@/components/Tooltip.svelte'


	// Props
	let {
		isExpanded = $bindable(false),
		showAccordionMarker = false,
		name: disclosureName,

		tooltipMaxWidth,
		tooltipButtonTriggerPlacement = 'around',
		tooltipHoverTriggerPlacement = 'around',

		children,
		ExpandedContent: ExpandedContent,

		...restProps
	}: HTMLDetailsAttributes & {
		isExpanded: boolean
		showAccordionMarker?: boolean

		tooltipMaxWidth?: string
		tooltipButtonTriggerPlacement?: TooltipButtonTriggerPlacement
		tooltipHoverTriggerPlacement?: TooltipHoverTriggerPlacement

		children: Snippet
		ExpandedContent: Snippet<[{ isInTooltip?: boolean }]>
	} = $props()


	// Components
	import Tooltip from '@/components/Tooltip.svelte'

	let enhanced = $state(false)
	onMount(() => {
		enhanced = true
	})
</script>


{#snippet Disclosure(Trigger: Snippet, Popover: Snippet)}
	<details
		bind:open={isExpanded}
		{...restProps}
		name={enhanced && $compactDisclosures ? 'walletbeat-compact-disclosures' : disclosureName}
		data-tooltip-enhanced={enhanced ? '' : undefined}
		ontoggle={event => {
			if (event.currentTarget.open)
				event.currentTarget.querySelector<HTMLElement>(':scope > [popover]:popover-open')?.hidePopover()
		}}
	>
		<summary class:no-marker={!showAccordionMarker}>
			{@render Trigger()}
		</summary>
		{@render Popover()}
	</details>
{/snippet}

<Tooltip
	Layout={Disclosure}
	buttonTriggerPlacement={tooltipButtonTriggerPlacement}
	hoverTriggerPlacement={tooltipHoverTriggerPlacement}
	style="
		--popover-padding: 0;
		--popover-backgroundColor: transparent;
		--popover-borderColor: transparent;
	"
	onbeforetoggle={(event: ToggleEvent & { currentTarget: HTMLDivElement }) => {
		if (event.newState === 'open' && event.currentTarget.parentElement?.matches('details[open]'))
			event.preventDefault()
	}}
>
	{@render children()}

	{#snippet TooltipContent()}
		<div
			class="expanded-content"
			style:--tooltip-maxWidth={tooltipMaxWidth ?? '16em'}
		>
			{@render ExpandedContent({ isInTooltip: !isExpanded })}
		</div>
	{/snippet}
</Tooltip>


<style>
	details {
		display: grid;
		&:not([data-tooltip-enhanced]) :global(summary > [data-stack] > [data-tooltip-trigger]) {
			display: none;
		}
		&:not([open])::details-content {
			display: contents;
			content-visibility: visible;
		}

		transition-property: gap;

		&[open] {
			gap: 1rem;
			> :global([popover]:not(:popover-open)) {
				display: block;
				position: static;
				inline-size: auto;
			}
			:global(summary > [data-stack] > [data-tooltip-trigger]) {
				display: none;
			}
		}

		summary {
			&.no-marker {
				gap: 0;

				&::after {
					display: none;
				}
			}

			> :global(:first-child) {
				flex: 1;
			}
		}

		&[open] .expanded-content {
			display: grid;
			grid-template-columns: minmax(0, 1fr);

			inline-size: 0;
			min-inline-size: 100%;
			min-inline-size: -webkit-fill-available;
			padding-block: 0.75rem;

			font-size: 1rem;
			line-height: 1.5;
			text-align: center;
		}
	}

	details:not([open]) .expanded-content {
		max-width: var(--tooltip-maxWidth, 16em);
		font-size: 0.66em;
	}

	/* Without enhancement, open disclosures stay inline and cannot overlap.
	 * Enhanced compact disclosures use one native name group and share a drawer. */
	@media (width <= 40rem) {
		details[data-tooltip-enhanced] {
			gap: 0;
			transition-property: none;
		}

		details[data-tooltip-enhanced][open] > :global([popover]:not(:popover-open)) {
			display: block;
			position: fixed;
			z-index: 3;
			inset: auto var(--tooltip-drawerMargin) var(--tooltip-drawerMargin);
			margin: 0;
			inline-size: auto;
			max-block-size: var(--tooltip-drawerBlockSize);
			overflow: auto;
			padding: 0.75rem;
			background-color: var(--background-primary);
			border: 1px solid var(--border-color);
			border-radius: 0.5rem;
			box-shadow: 0 4px 12px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.4));
		}
	}
</style>
