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
		<button type="button">
			<selectedcontent></selectedcontent>
		</button>
	{/snippet}

	{#each options as option (option)}
		<option
			value={option.value}
			selected={option.value === defaultValue}
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


		@keyframes -global-select-compact-tail {
			from { translate: 0px; }
			to { translate: calc((-100% + var(---select-compactSize)) * var(---inlineDirection, 1)); }
		}
		@keyframes -global-select-compact-bridge {
			from { scale: 1 1; }
			to { scale: 0 1; }
		}
		@keyframes -global-select-compact-icon {
			from { translate: 0px; }
			to {
				translate: calc((var(---select-compactSize) / 2 - var(---select-naturalPadding) - 0.5em) * var(---inlineDirection, 1));
			}
		}
		@keyframes -global-select-compact-picker {
			from { translate: 0px; opacity: var(---select-opacity); }
			to {
				translate: calc((var(---select-compactSize) / 2 - 100% + var(---select-naturalPadding) + 0.375em) * var(---inlineDirection, 1));
				opacity: var(---select-pickerEndOpacity, var(---select-opacity));
			}
		}
		@keyframes -global-select-compact-label {
			from { opacity: 1; }
			35%, to { opacity: 0; }
		}

		select {
			appearance: base-select;
			cursor: pointer;
			---select-compactSize: calc(var(--icon-size, 2rem) / var(--select-compactScale, 1));
			---select-timeline: var(--select-compactTimeline, none);
			---select-easing: var(--select-compactEasing, var(--transition-easeInOutExpo));
			---select-naturalPadding: calc(0.66em + 1px);
			isolation: isolate;
			position: relative;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 0px;
			min-inline-size: 0px;
			min-block-size: var(---select-compactSize);
			inline-size: auto;
			block-size: if(style(---select-timeline: none): auto; else: var(---select-compactSize));
			padding: 0px;
			outline: 0;
			color: var(--text-primary);
			pointer-events: if(style(---select-timeline: none): auto; else: none);
			background-color: if(style(---select-timeline: none): var(--background-primary); else: transparent);
			border: if(style(---select-timeline: none): 1px solid var(---select-borderColor); else: 0px solid transparent);
			---select-borderColor: var(--icon-navigation-borderColor);
			---select-borderWidth: 1px;
			&:hover { ---select-borderColor: var(--accent); }
			&:focus-visible {
				---select-borderColor: var(--accent);
				---select-borderWidth: 3px;
				box-shadow: if(style(---select-timeline: none): 0 0 0 3px var(--accent-backgroundColor); else: none);
			}
			&::before,
			&::after {
				content: if(style(---select-timeline: none): none; else: '');
				position: absolute;
				inset: 0;
				z-index: -2;
				pointer-events: auto;
				clip-path: circle(calc(var(---select-compactSize) / 2) at calc(var(---select-compactSize) / 2) 50%);
				background-image: radial-gradient(circle at calc(var(---select-compactSize) / 2) 50%, var(--background-primary) calc(var(---select-compactSize) / 2 - var(---select-borderWidth)), var(---select-borderColor) calc(var(---select-compactSize) / 2 - var(---select-borderWidth)) calc(var(---select-compactSize) / 2), transparent calc(var(---select-compactSize) / 2));
				background-size: calc(var(---select-compactSize) / 2) 100%;
				background-repeat: no-repeat;
			}
			&::after {
				background-position: right center;
				clip-path: circle(calc(var(---select-compactSize) / 2) at calc(100% - var(---select-compactSize) / 2) 50%);
				background-image: radial-gradient(circle at calc(100% - var(---select-compactSize) / 2) 50%, var(--background-primary) calc(var(---select-compactSize) / 2 - var(---select-borderWidth)), var(---select-borderColor) calc(var(---select-compactSize) / 2 - var(---select-borderWidth)) calc(var(---select-compactSize) / 2), transparent calc(var(---select-compactSize) / 2));
				animation: if(style(---select-timeline: none): none; else: select-compact-tail auto var(---select-easing) both);
				animation-timeline: var(---select-timeline);
				animation-range: var(--select-compactRange, contain 0% contain 100%);
			}
			&:dir(rtl)::before { scale: -1 1; }
			&:dir(rtl)::after { transform: scaleX(-1); }

			> button {
				font: inherit;
				&::after {
					content: '';
					position: absolute;
					pointer-events: none;
					visibility: hidden;
					inline-size: var(---select-compactSize);
					block-size: var(---select-compactSize);
					anchor-name: var(--select-visual-anchor, none);
				}
				anchor-name: var(--select-natural-anchor, none);
				position: static;
				display: block;
				flex-shrink: 0;
				inline-size: max-content;
				padding: var(---select-naturalPadding);
				padding-inline-end: calc(var(---select-naturalPadding) + 0.75em + 0.5rem);
				border: 0;
				background: transparent;
				color: inherit;
				pointer-events: none;
			}

			> button > selectedcontent {
				min-inline-size: 0;
				display: flex;
				align-items: center;
				gap: 0.5rem;
				white-space: nowrap;

				.select-label {
					display: inline-block;
					animation: if(style(---select-timeline: none): none; else: select-compact-label auto var(---select-easing) both);
					animation-timeline: var(---select-timeline);
					animation-range: var(--select-compactRange, contain 0% contain 100%);
				}
				.select-icon {
					flex-shrink: 0;
					scale: calc(1 / var(--select-compactScale, 1));
					animation: if(style(---select-timeline: none): none; else: select-compact-icon auto var(---select-easing) both);
					animation-timeline: var(---select-timeline);
					animation-range: var(--select-compactRange, contain 0% contain 100%);
					&:empty { display: none; }
					:global(:is(img, svg)) {
						inline-size: 1em;
						block-size: 1em;
						object-fit: contain;
					}
				}
			}
			& > button::before {
				content: '';
				height: 1lh;
				background-color: currentColor;
				mask: var(--icon-chevron) no-repeat center;
				---select-opacity: 0.66;
				opacity: var(---select-opacity);
				transform: perspective(100px) rotateX(0deg);
				transition-property: transform;
				scale: calc(1 / var(--select-compactScale, 1));
				position: absolute;
				inset-block: 0;
				margin-block: auto;
				inset-inline: 0;
				width: 100%;
				mask-position: calc(100% - var(---select-naturalPadding)) center;
				mask-size: 0.75em 1lh;
				transform-origin: calc(100% - var(---select-naturalPadding) - 0.375em) 50%;
				animation: if(style(---select-timeline: none): none; else: select-compact-picker auto var(---select-easing) both);
				animation-timeline: var(---select-timeline);
				animation-range: var(--select-compactRange, contain 0% contain 100%);
			}
			&:dir(rtl) > button::before { mask-position: var(---select-naturalPadding) center; transform-origin: calc(var(---select-naturalPadding) + 0.375em) 50%; }
			&:has(selectedcontent .select-icon:not(:empty)) {
				---select-pickerEndOpacity: 0;
			}
			@media (prefers-reduced-motion: reduce) {
				&::before,
				&::after,
				&::picker-icon,
				& > button::before,
				> button,
				> button > selectedcontent :is(.select-label, .select-icon) {
					animation-timing-function: steps(1, end);
				}
			}
			&:open > button::before { transform: perspective(100px) rotateX(180deg); }
			&::picker-icon {
				content: if(style(---select-timeline: none): none; else: '');
				position: absolute;
				margin: 0;
				inset-block: 0;
				inset-inline: calc(var(---select-compactSize) / 2);
				background: var(--background-primary);
				border-block: var(---select-borderWidth) solid var(---select-borderColor);
				box-sizing: border-box;
				z-index: -1;
				pointer-events: auto;
				transform-origin: left center;
				animation: if(style(---select-timeline: none): none; else: select-compact-bridge auto var(---select-easing) both);
				animation-timeline: var(---select-timeline);
				animation-range: var(--select-compactRange, contain 0% contain 100%);
			}
			&:dir(rtl)::picker-icon { transform-origin: right center; }
			option {
				display: flex;
				align-items: center;
				gap: 0.5rem;

				color: var(--text-primary);


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

		::picker(select) {
			appearance: base-select;
			pointer-events: auto;

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

			transition-property: display, opacity;

			@starting-style {
				opacity: 0;
			}
		}

		select:not(:open)::picker(select) {
			opacity: 0;
		}
	}

	@supports not (appearance: base-select) {
		select {
			inline-size: auto;
			block-size: auto;
			min-block-size: unset;
			border: revert;
			padding: revert;
			color: revert;
			appearance: auto;
			clip-path: none;
		}
	}
</style>
