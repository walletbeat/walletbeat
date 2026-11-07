<script lang="ts">
	let {
		title,
		description,
		isSelected,
		isCompleted,
		isPartial = false,
		isFailed = false,
		isDisabled = false,
		onclick,
	}: {
		title: string
		description?: string
		isSelected: boolean
		isCompleted: boolean
		isPartial?: boolean
		isFailed?: boolean
		isDisabled?: boolean
		onclick: () => void
	} = $props()
</script>


<button
	type="button"
	class="sidebar-item"
	aria-pressed={isSelected}
	data-card={isSelected ? 'padding-3 border-accent' : 'padding-3'}
	data-column="gap-1"
	class:completed={isCompleted}
	class:partial={isPartial}
	class:failed={isFailed}
	disabled={isDisabled}
	{onclick}
>
	<span data-row="gap-2">
		<strong>{title}</strong>
		{#if isCompleted}
			<span>✓</span>
		{:else if isPartial}
			<span>⚠</span>
		{:else if isFailed}
			<span>✗</span>
		{/if}
	</span>
	{#if description}
		<span class="sidebar-item-desc">{description}</span>
	{/if}
</button>


<style>
	.sidebar-item {
		--card-borderWidth: 1px;
		text-align: start;
		line-height: 1.4;

		&[data-column] {
			align-items: stretch;
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}

		&.completed {
			color: var(--rating-pass-text);
		}

		&.partial {
			color: var(--rating-partial-text);
		}

		&.failed {
			color: var(--rating-fail-text);
		}
	}

	.sidebar-item-desc {
		font-size: smaller;
		color: var(--text-secondary);
	}
</style>
