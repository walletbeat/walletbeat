<script module lang="ts">
	import { readable } from 'svelte/store'
	import { tooltipUsesDrawer } from './tooltip-presentation'

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
	import { onMount, untrack, type Snippet } from 'svelte'
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

	const generatedId = $props.id()
	const disclosureId = $derived(restProps.id ?? generatedId)
	const initialExpanded = untrack(() => isExpanded)
	let disclosure: HTMLDetailsElement
	let expandedContent: HTMLDivElement
	let enhanced = $state(false)
	// Floating presentation continues through the native popover's exit transition.
	let floatingTooltip = $state(false)
	let pendingNativeEntry: MouseEvent | null = null
	let pendingPopoverOpening: ToggleEvent | null = null
	let closeDisclosureOnToggle = false

	function syncInteractivity(body = disclosure.querySelector<HTMLElement>(':scope > [popover]')) {
		if (body) body.inert = !disclosure.open && !body.matches(':popover-open')
	}

	function syncPopover(expanded: boolean, compact: boolean, nativeEntry = false) {
		const body = disclosure.querySelector<HTMLElement>(':scope > [popover]')

		if (expanded) floatingTooltip = false

		if (compact && expanded) {
			if (!body || (!nativeEntry && body.matches(':popover-open'))) return

			if (nativeEntry) {
				expandedContent.setAttribute('autofocus', '')
				expandedContent.setAttribute('tabindex', '-1')
			}

			try {
				if (nativeEntry && body.matches(':popover-open')) {
					body.hidePopover()
				}

				body.inert = false

				// Resolve disclosure visibility before native autofocus searches its descendants.
				if (nativeEntry) expandedContent.checkVisibility({ visibilityProperty: true })

				body.showPopover({ source: disclosure.querySelector('summary') ?? disclosure })
			} finally {
				syncInteractivity(body)
				expandedContent.removeAttribute('autofocus')

				if (!body.matches(':popover-open')) expandedContent.removeAttribute('tabindex')
			}
		} else {
			body?.hidePopover()
			expandedContent.removeAttribute('autofocus')
			expandedContent.removeAttribute('tabindex')
		}
	}

	$effect(() => {
		if (enhanced) syncPopover(isExpanded, $compactDisclosures)
	})

	onMount(() => {
		// Untouched peers must not reset a shared controller's adopted native state.
		if (disclosure.open !== initialExpanded) isExpanded = disclosure.open

		const prepareNativeEntry = (event: Event) => {
			if (event.target !== disclosure) return

			const nativeEntry = pendingNativeEntry

			pendingNativeEntry = null

			if (disclosure.open && nativeEntry && !nativeEntry.defaultPrevented && tooltipUsesDrawer()) {
				syncPopover(true, true, true)
			}
		}

		const observer = new MutationObserver(() => syncInteractivity())

		observer.observe(disclosure, { attributes: true, attributeFilter: ['open'] })
		syncInteractivity()
		disclosure.addEventListener('toggle', prepareNativeEntry, true)
		enhanced = true

		return () => {
			observer.disconnect()
			pendingNativeEntry = null
			pendingPopoverOpening = null
			disclosure.removeEventListener('toggle', prepareNativeEntry, true)
		}
	})
</script>


{#snippet Disclosure(Trigger: Snippet, Popover: Snippet)}
	<details
		bind:this={disclosure}
		bind:open={
			() => {
				if (!enhanced && typeof document !== 'undefined') {
					const nativeDisclosure = document.getElementById(disclosureId)

					if (nativeDisclosure instanceof HTMLDetailsElement) return nativeDisclosure.open
				}

				return isExpanded
			},
			(expanded: boolean) => isExpanded = expanded
		}
		{...restProps}
		id={disclosureId}
		name={enhanced && $compactDisclosures ? 'walletbeat-compact-disclosures' : disclosureName}
		data-tooltip-enhanced={enhanced ? '' : undefined}
		data-tooltip-floating={floatingTooltip ? '' : undefined}
	>
		<summary
			class:no-marker={!showAccordionMarker}
			onclick={event => {
				if (!enhanced || !event.isTrusted || event.defaultPrevented || disclosure.open) return

				for (const target of event.composedPath()) {
					if (target === event.currentTarget) break

					if (target instanceof Element && target.matches(
						':any-link, audio[controls], button, details, embed, iframe, img:is([usemap], [controls]), input:not([type="hidden" i]), label, select, textarea, video[controls]',
					)) return
				}

				const source = disclosure

				pendingNativeEntry = event
				setTimeout(() => {
					if (pendingNativeEntry === event && !source.open) pendingNativeEntry = null
				}, 0)
			}}
		>
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
		const compact = tooltipUsesDrawer()
		const body = event.currentTarget
		const source = disclosure
		const previousFloating = floatingTooltip

		if (event.newState === 'closed') closeDisclosureOnToggle = compact && source.open

		pendingPopoverOpening = event.newState === 'open' ? event : null
		body.inert = event.newState === 'closed' && (compact || !source.open)

		if (event.newState === 'open') {
			floatingTooltip = !source.open
			setTimeout(() => {
				if (pendingPopoverOpening !== event) return

				pendingPopoverOpening = null

				if (!event.defaultPrevented) return

				const open = body.matches(':popover-open')

				if (compact && !open && source.open) isExpanded = false

				syncInteractivity(body)
				floatingTooltip = !source.open && (open || previousFloating)
			}, 0)
		}

		if (!event.currentTarget.parentElement?.matches('details[open]')) return

		if (event.newState === 'open' && !compact) event.preventDefault()

	}}
	ontoggle={event => {
		const closeDisclosure = closeDisclosureOnToggle && !event.currentTarget.matches(':popover-open')

		closeDisclosureOnToggle = false

		if (closeDisclosure) isExpanded = false
	}}
>
	{@render children()}

	{#snippet TooltipContent()}
		<div
			bind:this={expandedContent}
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
		&::details-content,
		&:not([open])::details-content {
			display: grid;
			block-size: auto;
			grid-template-rows: 0fr;
			content-visibility: visible;
			overflow: visible;
			transition-property: grid-template-rows;
		}

		&[open]::details-content {
			grid-template-rows: 1fr;
		}

		&:not([data-tooltip-floating]) > :global([popover]:not(:popover-open)) {
			--paint-filter: inherit;
			display: block;
			position: static;
			inline-size: auto;
			block-size: auto;
			min-block-size: 0;
			max-inline-size: none;
			max-block-size: none;
			overflow: hidden;
			margin: 0;
			padding: 0;
			border: 0;
			opacity: 1;
			scale: none;
			translate: none;
			pointer-events: auto;
			visibility: visible;
			transition-property: none;
		}

		&:not([open], [data-tooltip-floating]) > :global([popover]:not(:popover-open)) {
			visibility: hidden;
		}

		&[data-tooltip-enhanced]:not([open], [data-tooltip-floating]) > :global([popover]:not(:popover-open)) {
			transition-property: visibility;
		}

		transition-property: gap;

		&[open] {
			gap: 1rem;
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

		/* The expanded disclosure owns the surface around its content. */
		&[open] .expanded-content :global([data-card~="popover"]),
		&:not([data-tooltip-floating]) .expanded-content :global([data-card~="popover"]) {
			padding: 0;
			background: none;
			border: 0;
		}

		&[open] .expanded-content,
		&:not([data-tooltip-floating]) .expanded-content {
			display: grid;
			grid-template-columns: minmax(0, 1fr);

			inline-size: 0;
			min-inline-size: 100%;
			min-inline-size: -webkit-fill-available;
			max-width: none;
			padding-block: 0.75rem;

			font-size: 1rem;
			line-height: 1.5;
			text-align: center;
		}
	}

	details[data-tooltip-floating] .expanded-content {
		max-width: var(--tooltip-maxWidth, 16em);
		font-size: 0.66em;
	}

	@media (prefers-reduced-motion: reduce) {
		details,
		details::details-content,
		details[data-tooltip-enhanced]:not([data-tooltip-floating]) > :global([popover]) {
			transition-duration: 0s;
		}
	}

	/* Without enhancement, open disclosures stay inline and cannot overlap.
	 * Enhanced compact disclosures use one native name group and share a drawer. */
	@media (width <= 40rem) {
		details[data-tooltip-enhanced] {
			gap: 0;
			transition-property: none;
		}

		details[data-tooltip-enhanced]:not([data-tooltip-floating]) > :global([popover]) {
			--paint-filter: none;
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
			transition-property: opacity, translate, visibility, overlay;
		}

		details[data-tooltip-enhanced][open] > :global([popover]) {
			transition-property: overlay;
		}

		details[data-tooltip-enhanced]:not([data-tooltip-floating]) > :global([popover]:not(:popover-open)) {
			opacity: 0;
			translate: 0 100%;
			transition-property: opacity, translate, visibility, overlay;
		}
		details[data-tooltip-enhanced][open]:not([data-tooltip-floating]) > :global([popover]:not(:popover-open)) {
			transition-property: opacity, translate, overlay;
		}
	}
</style>
