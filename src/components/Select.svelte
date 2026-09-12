<script module lang="ts">
	export type SelectValue = string | number | undefined

	export type SelectOption = {
		value: SelectValue
		label: string
		icon?: string
	}
</script>

<script
	lang="ts"
	generics="
	_SelectValue extends SelectValue = SelectValue,
	_SelectOption extends SelectOption = SelectOption
"
>
	// Types/constants
	import type { SvelteHTMLElements } from 'svelte/elements'
	import type { Snippet } from 'svelte'

	// Props
	let {
		id,
		defaultValue,
		value = $bindable(),
		options,
		optionContent,
		...restProps
	}: Omit<SvelteHTMLElements['select'], 'value'> & {
		id?: string
		defaultValue?: _SelectValue
		value?: _SelectValue
		options: _SelectOption[]
		optionContent?: Snippet<[_SelectOption]>
	} = $props()
</script>

<select {id} bind:value {...restProps}>
	{@render selectedContent()}
	{#snippet selectedContent()}
		<button
			type="button"
			onclick={event => {
				event.stopPropagation()
			}}
		>
			<selectedcontent></selectedcontent>
		</button>
	{/snippet}

	{#each options as option (option)}
		<option
			value={option.value}
			selected={option.value === defaultValue}
			onclick={event => {
				event.preventDefault()
			}}
		>
			{#if optionContent}
				{@render optionContent(option)}
			{:else}
				{@render defaultOptionContent()}
				{#snippet defaultOptionContent()}
					<span class="select-icon" aria-hidden="true">
						{#if option.icon}
							{#if option.icon?.includes('<svg')}
								{@html option.icon}
							{:else}
								<img alt={option.label} src={option.icon} />
							{/if}
						{/if}
					</span>
					<span class="select-label">{option.label}</span>
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
				box-shadow: 0 0 0 3px var(--accent-backgroundColor);
			}

			&::picker-icon {
				content: '';
				width: 0.75em;
				height: 1lh;
				background-color: currentColor;
				mask: var(--icon-chevron) no-repeat center;
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

			option,
			selectedcontent {
				display: flex;
				align-items: center;
				gap: 0.5rem;

				color: var(--text-primary);

				transition-property: background-color, font-weight, color;

				&:hover {
					background-color: var(--background-secondary);
				}

				&:checked {
					background-color: var(--accent-backgroundColor);
					font-weight: 600;
				}

				&::checkmark {
					content: '✓';
					order: 1;
					color: var(--accent);
					font-weight: bold;
				}

				:global(:is(img, svg)) {
					height: 1em;
					vertical-align: middle;
				}
			}
		}

		select[data-icon~="circle"] {
			--select-compact-progress: 0;
			position: relative;
			inline-size: auto;
			block-size: auto;
			min-block-size: var(--icon-size, 2rem);
			padding: 0.66em;
			border: 1px solid transparent;
			border-radius: 0.5em;
			color: var(--text-primary);
			clip-path: inset(
				-1px -1px -1px calc(var(--select-compact-progress) * (100% - var(--icon-size, 2rem)) - 1px) round
					calc(var(--select-compact-progress) * var(--icon-size, 2rem) / 2)
			);
			&:dir(rtl) {
				clip-path: inset(
					-1px calc(var(--select-compact-progress) * (100% - var(--icon-size, 2rem)) - 1px) -1px -1px round
						calc(var(--select-compact-progress) * var(--icon-size, 2rem) / 2)
				);
			}
			/* Two border shapes share one real control and interpolate only their opacity. */
			&::before,
			&::after {
				content: '';
				position: absolute;
				pointer-events: none;
				border: 1px solid var(--icon-navigation-borderColor);
			}
			&::before {
				inset: -1px;
				border-color: var(--border-color);
				border-radius: inherit;
				opacity: calc(1 - var(--select-compact-progress));
			}
			&::after {
				inset-inline-end: -1px;
				inset-block-start: 50%;
				translate: 0 -50%;
				inline-size: var(--icon-size, 2rem);
				block-size: var(--icon-size, 2rem);
				border-radius: 50%;
				opacity: var(--select-compact-progress);
			}
			> button > selectedcontent {
				display: flex;
				gap: 0.5rem;
				translate: calc(
						var(---inlineDirection, 1) * var(--select-compact-progress) *
							(100% + 1.41em - var(--icon-size, 2rem) / 2)
					)
					0;
				.select-label {
					opacity: calc(1 - var(--select-compact-progress));
				}
				.select-icon:empty {
					display: none;
				}
				.select-icon :global(:is(img, svg)) {
					inline-size: 1em;
					block-size: 1em;
					object-fit: contain;
				}
			}
			&::picker-icon {
				translate: calc(
						var(---inlineDirection, 1) * var(--select-compact-progress) *
							(1.035em - var(--icon-size, 2rem) / 2)
					)
					0;
			}
			&:has(selectedcontent .select-icon:not(:empty))::picker-icon {
				opacity: calc(0.66 * (1 - var(--select-compact-progress)));
			}
		}

		::picker(select) {
			appearance: base-select;

			margin-block: 0.25em;
			position-area: block-end span-inline-end;
			position-try-order: most-block-size;
			position-try-fallbacks:
				block-start span-inline-end,
				block-end span-inline-start,
				block-start span-inline-start;
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
		select[data-icon] {
			inline-size: auto;
			block-size: auto;
			min-block-size: unset;
			border: revert;
			border-radius: 0.25em;
			padding: revert;
			color: revert;
			appearance: auto;
			clip-path: none;
		}
	}
</style>
