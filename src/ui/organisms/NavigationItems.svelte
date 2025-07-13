<script lang="ts">
	// Types
	import type { NavigationItem } from '@/components/navigation'


	// Props
	let {
		items,
		currentPathname,
	}: {
		items: NavigationItem[]
		currentPathname: string
	} = $props()


	// Functions
	const hasCurrentPage = (item: NavigationItem) => (
		currentPathname === item.href
		|| (item.children?.some(hasCurrentPage) ?? false)
	)
</script>


{@render navigationItems(items)}


{#snippet navigationItems(items: NavigationItem[])}
	<menu>
		{#each items as item (item.id)}
			<li>
				{@render navigationItem(item)}
			</li>
		{/each}
	</menu>
{/snippet}


{#snippet navigationItem(item: NavigationItem)}
	{#if !item.children?.length}
		{@render linkable(item)}
	{:else}
		<details
			open={hasCurrentPage(item)}
			data-sticky-container
		>
			<summary data-sticky>
				{@render linkable(item)}
			</summary>

			{@render navigationItems(item.children)}
		</details>
	{/if}
{/snippet}


{#snippet linkable(item: NavigationItem)}
	{#if item.href}
		<a
			href={item.href}
			aria-current={currentPathname === item.href ? 'page' : undefined}
			{...item.href.startsWith('http') && {
				target: '_blank',
				rel: 'noreferrer',
			}}
		>
			{#if item.icon}
				<span>{@html item.icon}</span>
			{/if}

			{item.title}
		</a>
	{:else}
		{#if item.icon}
			<span>{@html item.icon}</span>
		{/if}

		{item.title}
	{/if}
{/snippet}


<style>
	menu {
		display: grid;
		gap: 2px;
		list-style: none;
		font-size: 0.975em;

		li {
			display: grid;
		}
	}

	a {
		color: inherit;

		&:hover {
			color: var(--accent);
			text-decoration: none;
		}

		&[aria-current] {
			background-color: var(--background-primary);
		}
	}

	summary,
	a {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		> span {
			display: flex;
			font-size: 1.25em;
			width: 1em;
			height: 1em;
			line-height: 1;

			:global(
				img,
				svg
			) {
				border-radius: 0.125rem;
				width: 100%;
				height: 100%;
			}
		}
	}

	summary,
	a:not(summary a) {
		padding: 0.45rem 0.45rem;
		border-radius: 0.375rem;
		font-weight: 500;

		transition-property: background-color, color, outline;

		&:hover:not(:has(a:hover)) {
			background-color: var(--background-primary);
			color: var(--accent);
		}

		&:focus {
			outline: 2px solid var(--accent);
			outline-offset: -1px;
		}

		&:active {
			background-color: var(--background-primary);
		}
	}

	details:not([open]) > summary::after {
		transform: perspective(100px) rotateX(180deg) rotate(-90deg);
	}

	summary ~ * {
		margin-inline-start: 2em;
		margin-block-start: 2px;

		margin-inline-start: 1.25em;
		margin-block-start: 2px;
		padding-inline-start: 0.75em;
		box-shadow: -1px 0 var(--border-color);
	}
</style>
