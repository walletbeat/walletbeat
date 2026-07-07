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
		currentPathname,
		ariaLabel = 'Navigation',
		defaultOpen = false,
		iconSnippet,
		showSearch = true,
	}: {
		items: NavigationItem[]
		groups?: NavigationGroup[]
		currentPathname: string
		ariaLabel?: string
		defaultOpen?: boolean
		iconSnippet?: Snippet<[NavigationItem, number]>
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
		currentPathname === item.href
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

{#if showSearch}
	<search
		class="navigation-items"
		data-column="gap-3"
		data-column-item="flexible"
		data-sticky-container
	>
		<label
			data-sticky="block"
		>
			<span class="navigation-search-icon" aria-hidden="true">{@html SearchIcon}</span>

			<input
				type="search"
				bind:value={searchValue}
				placeholder="Search..."
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

			<kbd class="navigation-search-shortcut" aria-hidden="true">⌘+K</kbd>
		</label>

		{@render navigationGroupsList(navigationGroups)}
	</search>
{:else}
	<nav class="navigation-items" data-column="gap-3" data-column-item="flexible" aria-label={ariaLabel}>
		{@render navigationGroupsList(navigationGroups)}
	</nav>
{/if}


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
			<li data-current={currentPathname === item.href ? true : undefined}>
				{@render navigationItem(item, depth)}
			</li>
		{/each}
	</menu>
{/snippet}


{#snippet navigationItem(item: NavigationItem, depth = 0)}
	{#if !item.children?.length}
		{@render linkable(item, depth, true)}
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
				data-sticky="block"
				data-row="gap-2"
			>
				{@render linkable(item, depth)}
			</summary>

			{@render navigationItems(item.children, depth + 1)}
		</details>
	{/if}
{/snippet}


{#snippet linkable(item: NavigationItem, depth = 0, sticky = false)}
	{#if item.href}
		<a
			href={item.href}
			aria-current={currentPathname === item.href ? 'page' : undefined}
			{...item.href.startsWith('http') && {
				target: '_blank',
				rel: 'noreferrer',
			}}
			data-sticky={sticky ? 'block' : undefined}
			data-row="start gap-2"
			style:--accent={item.accentColor ?? undefined}
		>
			{@render navigationIcon(item, depth)}

			<span data-row-item="flexible">{@html effectiveSearchValue ? highlightText(item.title, effectiveSearchValue) : item.title}</span>
		</a>
	{:else}
		{@render navigationIcon(item, depth)}

		<span data-row-item="flexible">{@html effectiveSearchValue ? highlightText(item.title, effectiveSearchValue) : item.title}</span>
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
		--navigationItem-gap: 0.5rem;
		--navigationItem-paddingBlock: 0.45rem;
		--navigationItem-paddingInline: 0.45rem;
		--navigationItem-rowGap: 0.5em;
		--navigationItem-endRadius: 0.5em;
		--navigationItem-currentBackground: color-mix(in oklch, var(--accent) 24%, transparent);
		--navigationItem-hoverBackground: var(--background-primary);
		--navigationItem-currentHoverBackground: color-mix(in oklch, var(--accent) 34%, var(--background-primary));
		--navigationIcon-size: 1.25em;

		--navigationSubmenu-gap: 0.33rem;

		--navigation-search-blockSize: 2.375rem;
		--navigation-search-gap: 0.75rem;
		--navigation-search-sidestepBlock: 0px;
		--navigation-search-paddingInlineStart: 2.35rem;
		--navigation-search-paddingInlineEnd: 3.15rem;

		&:has(> label) {
			--navigation-search-sidestepBlock: calc(var(--navigation-search-blockSize) + var(--navigation-search-gap));
		}

		scroll-target-group: auto;

		label {
			block-size: var(--navigation-search-blockSize);
			min-block-size: var(--navigation-search-blockSize);
			position: relative;
			inline-size: 100%;
			border-color: var(--icon-navigation-borderColor);
			font-size: inherit;
			inset-block-end: auto;

			@media (max-width: 1024px) {
				order: 10;

				&[data-sticky] {
					inset-block-start: auto;
					inset-block-end: var(--sticky-insetBlockEnd);
					z-index: 2;
				}

				.navigation-search-shortcut {
					display: none;
				}
			}

			input[type='search'] {
				position: absolute;
				inset: calc(-1 * var(--separator-width));
				padding-inline-start: var(--navigation-search-paddingInlineStart);
				padding-inline-end: var(--navigation-search-paddingInlineEnd);
				padding-block: 0;
				text-overflow: ellipsis;
			}

			.navigation-search-icon,
			.navigation-search-shortcut {
				position: absolute;
				inset-block: 0;
				display: inline-flex;
				align-items: center;
				pointer-events: none;
			}

			.navigation-search-icon {
				inset-inline-start: 0.75rem;
				color: var(--text-secondary);

				:global(svg) {
					inline-size: 1rem;
					block-size: 1rem;
				}
			}

			.navigation-search-shortcut {
				inset-inline-end: 0.625rem;
				block-size: 1.35rem;
				margin-block: auto;
				display: inline-flex;
				padding-inline: 0;
				color: var(--text-secondary);
				font: inherit;
				font-size: 0.75em;
				line-height: 1;
				white-space: nowrap;

				&::before {
					content: none;
				}

				&::after {
					content: none;
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
				--navigationIcon-size: 2em;
			}

			&[data-navigation-depth='1'] {
				--navigationIcon-size: 1.5em;
			}

			&[data-navigation-depth='2'] {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
			}

			&[data-sticky-container][data-navigation-depth='0'] {
				--sticky-marginBlockStart: var(--navigation-search-sidestepBlock);
			}

			&[data-sticky-container]:not([data-navigation-depth='0']) {
				--sticky-marginBlockStart: calc(
					var(--navigationSubmenu-parentIconSize) + 2 * var(--navigationItem-paddingBlock) +
						var(--navigationSubmenu-gap)
				);
				--sticky-marginBlockEnd: var(--navigationItem-gap);
			}

			details {
				--navigationSubmenu-parentIconSize: var(--navigationIcon-size);
			}

			a {
				color: var(--text-primary);

				&:hover {
					color: var(--accent);
					text-decoration: none;
				}

				&[href^='#']::scroll-marker {
					content: '';
					border-radius: inherit;
				}

				&[href^='#']:target-current,
				&[href^='#']::scroll-marker:target-current {
					--navigationItem-background: var(--navigationItem-currentBackground);
				}
			}

			li[data-current] > a,
			li[data-current] > details > summary {
				--navigationItem-background: var(--navigationItem-currentBackground);
			}

			li[data-current] > a:hover,
			li[data-current] > a:focus-visible,
			li[data-current] > details > summary:hover,
			li[data-current] > details > summary:is(:focus-visible, :focus-within),
			a[href^='#']:target-current:hover,
			a[href^='#']:target-current:focus-visible {
				--navigationItem-background: var(--navigationItem-currentHoverBackground);
			}

			summary,
			li > a {
				:global(mark) {
					font-weight: 600;
					text-decoration: underline;
					background-color: transparent;
					color: inherit;
				}
			}

			summary,
			li > a {
				--icon-size: var(--navigationIcon-size);
				--navigationItem-startRadius: var(--navigationItem-endRadius);

				padding: var(--navigationItem-paddingBlock) var(--navigationItem-paddingInline);
				border-radius:
					var(--navigationItem-startRadius)
					var(--navigationItem-endRadius)
					var(--navigationItem-endRadius)
					var(--navigationItem-startRadius)
				;
				font-weight: 500;
				--sticky-backgroundColor: color-mix(in oklch, var(--background-primary) 96%, transparent);
				--sticky-backdropFilter: blur(16px);
				background-color: var(--navigationItem-background, transparent);

				transition-property:
					opacity,
					scale,
					background-color,
					color
				;

				&:has(
					> [data-icon~='circle'],
					> a > [data-icon~='circle']
				) {
					--navigationItem-startRadius: calc((var(--navigationIcon-size) + 2 * var(--navigationItem-paddingBlock)) / 2);
				}

				&:hover:not(:has(a:hover)) {
					--navigationItem-background: var(--navigationItem-hoverBackground);
					color: var(--accent);
				}

				&:is(:focus-visible, :focus-within) {
					--navigationItem-background: var(--navigationItem-hoverBackground);
					color: var(--accent);
				}
			}

			summary {
				> a {
					border-radius: inherit;
				}

				&::after {
					margin-inline-start: auto;
				}

				details:not([open]) > &::after {
					transform: perspective(100px) rotateX(180deg) rotate(-90deg);
				}

				> a {
					flex: 0 auto;
				}

				~ * {
					margin-block-start: var(--navigationSubmenu-gap);
					margin-inline-start: calc(
						var(--navigationSubmenu-parentIconSize) + var(--navigationItem-rowGap)
					);
					padding-inline-start: 0;
					position: relative;

					&::before {
						content: '';
						position: absolute;
						inset-block: 0;
						inset-inline-start: calc(
							var(--navigationItem-paddingInline) + var(--navigationSubmenu-parentIconSize) / 2 -
								var(--navigationSubmenu-parentIconSize) - var(--navigationItem-rowGap)
						);
						inline-size: 1px;
						background-color: var(--border-color);
					}
				}
			}
		}

		> menu + menu {
			margin-block-start: auto;
		}

		@media (max-width: 1024px) {
			&:has(> label) {
				display: contents;
			}

			menu[data-sticky-container][data-navigation-depth='0'] {
				--sticky-marginBlockStart: 0px;
				--sticky-marginBlockEnd: var(--navigation-search-sidestepBlock);
			}
		}
	}
</style>
