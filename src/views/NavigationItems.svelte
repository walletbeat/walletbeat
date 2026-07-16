<script lang="ts">
	// Types
	import type { LucideNavigationIcon, NavigationItem } from '@/constants/navigation'
	import type { Snippet } from 'svelte'

	// Icons
	import ChartBarIcon from 'lucide-static/icons/chart-bar.svg?raw'
	import ChartPieIcon from 'lucide-static/icons/chart-pie.svg?raw'
	import { FarcasterIcon } from '@/icons/farcaster'
	import SearchIcon from 'lucide-static/icons/search.svg?raw'
	import TwitterIcon from 'lucide-static/icons/twitter.svg?raw'
	import WalletIcon from 'lucide-static/icons/wallet.svg?raw'

	const LUCIDE_ICONS: Record<LucideNavigationIcon, string> = {
		ICON_CHART_BAR: ChartBarIcon,
		ICON_CHART_PIE: ChartPieIcon,
		ICON_FARCASTER: FarcasterIcon,
		ICON_TWITTER: TwitterIcon,
		ICON_WALLET: WalletIcon,
	}

	type NavigationGroup = {
		items: NavigationItem[]
	}

	// Props
	let {
		items,
		groups,
		currentHref,
		ariaLabel = 'Navigation',
		defaultOpen = false,
		iconSnippet,
		afterLabelSnippet,
		showSearch = true,
	}: {
		items: NavigationItem[]
		groups?: NavigationGroup[]
		currentHref?: string
		ariaLabel?: string
		defaultOpen?: boolean
		iconSnippet?: Snippet<[NavigationItem, number]>
		afterLabelSnippet?: Snippet<[NavigationItem, number]>
		showSearch?: boolean
	} = $props()

	let navigationGroups = $derived(groups ?? [{ items }])

	// State
	import { SvelteMap } from 'svelte/reactivity'

	let isOpen = $state(new SvelteMap<NavigationItem, boolean>())
	let searchValue = $state('')
	let effectiveSearchValue = $derived(searchValue.trim().toLowerCase())

	// Functions
	const hasCurrentPage = (item: NavigationItem) => (
		currentHref === item.href
		|| (item.children?.some(hasCurrentPage) ?? false)
	)

	const fuzzyMatch = (text: string, query: string): [number, number][] | undefined => {
		const ranges: [number, number][] = []
		let textIndex = 0

		for (const char of query) {
			textIndex = text.toLowerCase().indexOf(char, textIndex)

			if (textIndex === -1) return

			const lastRange = ranges.at(-1)

			if (lastRange && lastRange[1] === textIndex) {
				lastRange[1]++
			} else {
				ranges.push([textIndex, textIndex + 1])
			}

			textIndex++
		}

		return ranges
	}

	const matchesSearch = (item: NavigationItem, query: string): boolean => (
		!query
		|| !!fuzzyMatch(item.title, query)
		|| (item.children?.some((child) => matchesSearch(child, query)) ?? false)
	)

	const hasNestedNavigation = (items: NavigationItem[]): boolean => (
		items.some(item => item.children?.length)
	)

	const highlightText = (text: string, query: string) => {
		const ranges = fuzzyMatch(text, query)

		return (
			ranges ?
				[
					...ranges.flatMap(([start, end], i, arr) => [
						text.slice(arr[i - 1]?.[1] ?? 0, start),
						`<mark>${text.slice(start, end)}</mark>`,
					]),
					text.slice(ranges.at(-1)?.[1] ?? 0),
				]
					.join('')
			:
				text
		)
	}
</script>

<div
	class="navigation-items"
	data-column="gap-3"
	data-column-item="flexible"
	aria-label={ariaLabel}
	data-sticky-container
>
	{#if showSearch}
		<search
			data-sticky="block backdrop-before backdrop-stuck"
		>
			<label data-row="gap-0">
				<span class="search-icon" aria-hidden="true">{@html SearchIcon}</span>

				<input
					type="search"
					bind:value={searchValue}
					placeholder="Search..."
					data-row-item="flexible"

					{@attach (input: HTMLInputElement) => {
						const abortController = new AbortController()

						const navPopover = input.closest('nav[popover]')
						const isMobileNav = globalThis.matchMedia('(max-width: 1024px)')

						const openNavPopover = () => {
							if (
								isMobileNav.matches
								&& navPopover instanceof HTMLElement
								&& !navPopover.matches(':popover-open')
							)
								navPopover.showPopover()
						}

						globalThis.addEventListener(
							'keydown',
							(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
									event.preventDefault()
									openNavPopover()
									input.focus()
								}
							},
							{ signal: abortController.signal }
						)

						input.addEventListener('focus', openNavPopover, { signal: abortController.signal })

						return () => {
							abortController.abort()
						}
					}}
					onkeyup={(event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
						if (event.key === 'Escape')
							event.currentTarget.blur()
					}}
				/>

				<kbd aria-hidden="true">⌘+K</kbd>
			</label>
		</search>
	{/if}

	{@render navigationGroupsList(navigationGroups)}
</div>


{#snippet navigationGroupsList(groups: NavigationGroup[])}
	{#each groups as group, groupIndex (groupIndex)}
		{@render navigationItems(group.items, 0)}
	{/each}
{/snippet}


{#snippet navigationItems(items: NavigationItem[], depth = 0)}
	{@const ownsStickyStep = depth > 0 || hasNestedNavigation(items)}
	<menu
		data-navigation-depth={depth}
		data-sticky-container={ownsStickyStep ? true : undefined}
		data-column
	>
		{#each (
			effectiveSearchValue ?
				items.filter(item => matchesSearch(item, effectiveSearchValue))
			:
				items
		) as item (item.id)}
			<li>
				{@render navigationItem(item, depth)}
			</li>
		{/each}
	</menu>
{/snippet}


{#snippet navigationItem(item: NavigationItem, depth = 0)}
	{#if !item.children?.length}
		{@render linkable(item, depth)}
	{:else}
		<details
			bind:open={
				() => (
					effectiveSearchValue
						? matchesSearch(item, effectiveSearchValue)
						: (isOpen.get(item) ?? (defaultOpen || hasCurrentPage(item)))
				),
				(_: boolean) => {
					if (!effectiveSearchValue && _ !== undefined)
						isOpen.set(item, _)
				}
			}
		>
			<summary
				data-sticky="block backdrop-before backdrop-stuck"
				data-row="gap-2"
			>
				{@render linkable(item, depth)}
			</summary>

			{@render navigationItems(item.children, depth + 1)}
		</details>
	{/if}
{/snippet}


{#snippet linkable(item: NavigationItem, depth = 0)}
	{#if item.href}
		<a
			href={item.href}
			{...currentHref === item.href && { 'aria-current': 'page' }}
			{...item.href.startsWith('http') && {
				target: '_blank',
				rel: 'noreferrer',
			}}
			{...item.href.startsWith('#') && {
				interestfor: item.href.slice(1),
			}}
			data-row="start gap-2"
			style:--accent={item.accentColor ?? undefined}
			style:--slice-totalAngle={item.sliceStyle?.totalAngle}
			style:--slice-midAngle={item.sliceStyle?.midAngle}
			style:--slice-offset={item.sliceStyle?.offset}
			style:--slice-gap={item.sliceStyle?.gap}
			style:--slice-outerR={item.sliceStyle?.outerR}
			style:--slice-innerR={item.sliceStyle?.innerR}
			style:--slice-outerCornerRadius={item.sliceStyle?.outerCornerRadius}
			style:--slice-innerCornerRadius={item.sliceStyle?.innerCornerRadius}
			style:--slice-labelSize={item.sliceStyle?.labelSize}
			style:--slice-labelR={item.sliceStyle?.labelR}
			style:--slice-arcSize={Math.abs(item.sliceStyle?.totalAngle ?? 0) > 180 ? 'large' : 'small'}
		>
			{@render navigationIcon(item, depth)}

			<span data-row-item="flexible">{@html effectiveSearchValue ? highlightText(item.title, effectiveSearchValue) : item.title}</span>

			{#if afterLabelSnippet}
				<span class="navigation-item-after" data-row="gap-1">
					{@render afterLabelSnippet(item, depth)}
				</span>
			{/if}
		</a>
	{:else}
		{@render navigationIcon(item, depth)}

		<span data-row-item="flexible">{@html effectiveSearchValue ? highlightText(item.title, effectiveSearchValue) : item.title}</span>

		{#if afterLabelSnippet}
			<span class="navigation-item-after" data-row="gap-1">
				{@render afterLabelSnippet(item, depth)}
			</span>
		{/if}
	{/if}
{/snippet}


{#snippet navigationIcon(item: NavigationItem, depth = 0)}
	{#if iconSnippet}
		{@render iconSnippet(item, depth)}
	{:else if item.icon}
		{@const iconShape = depth === 0 ? 'circle' : ''}
		{#if item.icon.startsWith('ICON_WALLET_IMG:')}
			<span data-icon>
				<img src={item.icon.slice('ICON_WALLET_IMG:'.length)} alt="" />
			</span>
		{:else if item.icon in LUCIDE_ICONS}
			<span data-icon={iconShape}>
				{@html (LUCIDE_ICONS as Record<string, string>)[item.icon]}
			</span>
		{:else}
			<span
				data-icon="{iconShape} wbicons {item.iconVariant === 'emoji' ? 'emoji ' : ''}{item.icon}"
			></span>
		{/if}
	{/if}
{/snippet}


<style>
	.navigation-items {
		--navItem-gap: 0.5rem;
		--navItem-paddingBlock: 0.45rem;
		--navItem-paddingInline: 0.45rem;
		--navItem-rowGap: 0.5em;
		--navItem-radius: 0.5em;
		--navItem-current-backgroundColor: color-mix(in oklch, var(--accent) 25%, transparent);
		--navItem-hover-backgroundColor: color-mix(in oklch, var(--accent) 15%, var(--background-primary));
		--navItem-current-hover-backgroundColor: color-mix(in oklch, var(--accent) 30%, var(--background-primary) 20%);
		--navIcon-size: 1.25em;

		--nav-submenu-gap: 0.33rem;
		--nav-search-blockSize: 0rem;

		&:has(> search) {
			--nav-search-blockSize: 3rem;
		}

		scroll-target-group: auto;

		search {
			@media (max-width: 1024px) {
				order: 1;
			}

			label {
				border-color: var(--icon-navigation-borderColor);

				> .search-icon {
					padding-inline-start: 1em;
					color: var(--text-secondary);

					:global(svg) {
						inline-size: 1rem;
						block-size: 1rem;
					}
				}

				> kbd {
					color: var(--text-secondary);
					user-select: none;
					padding-inline-end: 1em;
					font-size: smaller;

					input:not(:placeholder-shown) ~ & {
						display: none;
					}

					@media (max-aspect-ratio: 1/2) {
						display: none;
					}
				}
			}
		}

		menu {
			font-size: 0.975em;
			list-style: none;
			margin: 0;
			padding: 0;

			&[data-navigation-depth='0'] {
				--icon-navigation-borderColor: currentColor;
				--navIcon-size: 2em;

				&[data-sticky-container] {
					--sticky-marginBlockStart: var(--nav-search-blockSize);

					@media (max-width: 1024px) {
						--sticky-marginBlockStart: 0px;
						--sticky-marginBlockEnd: var(--nav-search-blockSize);
					}
				}
			}
			&[data-navigation-depth='1'] {
				--navIcon-size: 1.5em;

				&[data-sticky-container] {
					--sticky-marginBlockStart: calc(var(--nav-submenu-parentIconSize) + 2 * var(--navItem-paddingBlock) + var(--nav-submenu-gap));
					--sticky-marginBlockEnd: var(--navItem-gap);
				}
			}
			&[data-navigation-depth='2'] {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));

				&[data-sticky-container] {
					--sticky-marginBlockStart: calc(var(--nav-submenu-parentIconSize) + 2 * var(--navItem-paddingBlock) + var(--nav-submenu-gap));
					--sticky-marginBlockEnd: var(--navItem-gap);
				}
			}

			details {
				--nav-submenu-parentIconSize: var(--navIcon-size);
			}

			a {
				color: var(--text-primary);

				&:hover {
					color: var(--accent);
					text-decoration: none;
				}
			}

			.navigation-item-after {
				flex: none;
				margin-inline-start: auto;
			}

			li > details > summary,
			li > a {
				--icon-size: var(--navIcon-size);

				---backgroundColor: transparent;
				---color: inherit;

				&:hover,
				&:focus-visible,
				&:focus-within,
				&:interest-source {
					---backgroundColor: var(--navItem-hover-backgroundColor);
					---color: var(--accent);
				}

				&:is(a):is(
					[aria-current='page'],
					:target-current
				),
				&:is(summary):is(
					:has(
						a:is(
							[aria-current='page'],
							:target-current
						)
					),
					:not(details:open > &):has(
						~ menu a:is(
							[aria-current='page'],
							:target-current
						)
					)
				) {
					---backgroundColor: var(--navItem-current-backgroundColor);

					&:hover,
					&:focus-visible,
					&:focus-within {
						---backgroundColor: var(--navItem-current-hover-backgroundColor);
					}
				}

				---startRadius: var(--navItem-radius);
				---endRadius: var(--navItem-radius);

				&:is(a):has(> [data-icon~='circle']),
				&:is(summary):has(> a > [data-icon~='circle']) {
					---startRadius: 1.5rem;
				}

				&:not([data-sticky]) {
					background-color: var(---backgroundColor);
				}
				&[data-sticky] {
					--sticky-backgroundColor: var(---backgroundColor);
					--sticky-backdropFilter: blur(16px);

					&[data-sticky~='backdrop-stuck'][data-sticky~="backdrop-before"]::before {
						background-color: var(---backgroundColor);
					}
				}

				border-radius:
					var(---startRadius)
					var(---endRadius)
					var(---endRadius)
					var(---startRadius)
				;
				padding:
					var(--navItem-paddingBlock)
					var(--navItem-paddingInline)
				;

				color: var(---color);
				font-weight: 500;

				transition-property:
					opacity,
					scale,
					background-color,
					color
				;

				:global(mark) {
					font-weight: 600;
					text-decoration: underline;
					background-color: transparent;
					color: inherit;
				}
			}

			summary {
				&::after {
					margin-inline-start: auto;
				}

				details:not([open]) > &::after {
					transform: perspective(100px) rotateX(180deg) rotate(-90deg);
				}

				> a {
					border-radius: inherit;
					flex: 0 auto;
				}
			}

			menu {
				margin-block-start: var(--nav-submenu-gap);
				margin-inline-start: calc(
					var(--nav-submenu-parentIconSize) + var(--navItem-rowGap)
				);

				position: relative;
				padding-inline-start: 0;

				&::before {
					content: '';
					position: absolute;
					inset-block: 0;
					inset-inline-start: calc(
						var(--navItem-paddingInline)
						- var(--nav-submenu-parentIconSize) / 2
						- var(--navItem-rowGap)
					);
					inline-size: 1px;
					background-color: var(--border-color);
				}
			}

			+ menu {
				margin-block-start: auto;
			}
		}
	}
</style>
