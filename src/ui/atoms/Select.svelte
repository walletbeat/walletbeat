<script module lang="ts">
	export type SelectValue = string | number | undefined

	export type SelectOption = {
		value: SelectValue
		label: string
		icon?: string
	}
</script>


<script lang="ts" generics="
	_SelectValue extends SelectValue = SelectValue,
	_SelectOption extends SelectOption = SelectOption
">
	// Types/constants
	import type { Snippet } from 'svelte'


	// Props
	let {
		id,
		value = $bindable(),
		options,
		optionContent,
		selectedOption = $bindable(),
		...restProps
	}: {
		id?: string
		value?: _SelectValue
		options: _SelectOption[]
		optionContent?: Snippet<[_SelectOption]>
		selectedOption?: _SelectOption
	} = $props()


	// State
	// (Derived)
	$effect(() => {
		selectedOption = options.find(option => option.value === value) || options[0]
	})
</script>


<select
	{id}
	bind:value
	{...restProps}
>
	{@render selectedContent()}
	{#snippet selectedContent()}
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button
			type="button"
			onclick={e => {
				e.stopPropagation()
			}}
		>
			<selectedcontent></selectedcontent>
		</button>
	{/snippet}

	{#each options as option}
		<option value={option.value}>
			{#if optionContent}
				{@render optionContent(option)}
			{:else}
				{@render defaultOptionContent()}
				{#snippet defaultOptionContent()}
					<span aria-hidden="true">
						{@html option.icon}
					</span>
					{option.label}
				{/snippet}
			{/if}
		</option>
	{/each}
</select>


<style>
	@supports (appearance: base-select) {
		select {
			appearance: base-select;

			min-width: max-content;

			cursor: pointer;
			transition: border-color 0.2s ease;

			&:hover {
				border-color: var(--accent);
			}

			&:focus {
				box-shadow: 0 0 0 3px var(--accent-very-light);
			}

			&::picker-icon {
				content: '';
				width: 0.75em;
				height: 0.75em;
				background-color: var(--icon-color);
				mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 3'%3E%3Cpath d='m.5 1 1 1 1-1' fill='none' stroke='black' stroke-width='0.5' stroke-linecap='round' stroke-linejoin='round' /%3E%3C/svg%3E") no-repeat;
				opacity: 0.66;
				transform: perspective(100px) rotateX(0deg);
				transition: transform 0.2s ease;
			}
			&:open::picker-icon {
				transform: perspective(100px) rotateX(180deg);
			}

			> button {
				display: contents;
				font: inherit;

				> selectedcontent {
					display: contents;
				}
			}

			option {
				display: flex;
				align-items: center;
				gap: 0.5rem;

				color: var(--text-primary);

				transition-property: background-color, font-weight, color;

				&:hover {
					background-color: var(--background-secondary);
				}

				&:checked {
					background-color: var(--accent-very-light);
					font-weight: 600;
				}

				&::checkmark {
					content: "✓";
					order: 1;
					color: var(--accent);
					font-weight: bold;
				}
			}
		}

		::picker(select) {
			appearance: base-select;

			margin-block: 0.25em;
			position-area: block-end span-inline-end;
			position-try-order: most-block-size;
			position-try-fallbacks: block-start span-inline-end, block-end span-inline-start, block-start span-inline-start;
			position-visibility: anchors-visible;
			min-width: anchor-size(width);

			background: var(--background-primary);
			border: 1px solid var(--border-color);
			border-radius: 0.5rem;
			box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);

			transition-property: display, opacity, font-size;

			@starting-style {
				opacity: 0;
				font-size: 0;
			}
		}

		select:not(:open)::picker(select) {
			opacity: 0;
			font-size: 0;
		}
	}

	@supports not (appearance: base-select) {
		select {
			appearance: none;
			padding-right: 2.5em;
			background: var(--background-primary) right 0.75rem center / 1rem no-repeat url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		}
	}
</style>
