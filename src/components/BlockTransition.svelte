<script lang="ts" generics="
	Key extends string | number | undefined = undefined,
	Value extends object | string | number | bigint | boolean | undefined | null = object | string | number | bigint | boolean | undefined | null
">
	// Types
	import type { Snippet } from 'svelte'


	// Props
	let {
		key,
		value,
		clip = true,

		// Snippets
		children,

		// View options
		align = 'top',
	}: {
		key?: Key
		value?: Value
		clip?: boolean

		// Snippets
		children?: Snippet<[{ key?: Key, value: Value | undefined }]>

		// View options
		align?: 'top' | 'center' | 'bottom'
	} = $props()


	// State
	let borderBoxSize: ResizeObserverSize[] | undefined = $state()

	// (Computed)
	const alignBlock = $derived(
		({ 'top': 'start', 'center': 'center', 'bottom': 'end' } as const)[align]
	)


	// Transitions
	import { expoOut } from 'svelte/easing'
	import { fade } from 'svelte/transition'
</script>


<div
	data-container
	data-layout="block"
	data-contain={borderBoxSize ? 'block' : undefined}
	style:--blockSize={borderBoxSize ? `${borderBoxSize[0].blockSize}px` : undefined}
	data-align-block={alignBlock}
	data-clip={clip ? '' : undefined}
	style:--transitionDuration="250ms"
	style:--transitionDelay="0ms"
	data-stack
	class={`align-${align}`}
>
	{#key key ?? value}
		<div
			data-content
			bind:borderBoxSize
			data-column
			class={`align-${align}`}
			transition:fade={{ duration: 200, easing: expoOut }}
		>
			{#if children}
				{@render children({ key, value })}
			{:else}
				{value}
			{/if}
		</div>
	{/key}
</div>


<style>
	[data-container] {
		&[data-layout="block"] {
			display: grid;

			& > [data-content] {
				@layer Reset {
					display: block;
				}
				block-size: max-content;
			}
		}

		&[data-contain] {
			transition-property: display;
			transition-duration: var(--transitionDuration);
			transition-delay: var(--transitionDelay, 0ms);
			transition-timing-function: var(--ease-out-expo);

			&[data-contain="block"] {
				&[data-clip] {
					contain: paint;
				}

				transition-property: display, block-size, margin-block;
				will-change: block-size;
				block-size: var(--blockSize);
			}
		}

		&[data-align-block="start"] {
			align-content: start;

			& > [data-content] {
				--transformOriginY: top;
			}
		}
		&[data-align-block="center"] {
			align-content: center;

			& > [data-content] {
				--transformOriginY: center;
			}
		}
		&[data-align-block="end"] {
			align-content: end;

			& > [data-content] {
				--transformOriginY: bottom;
			}
		}
	}
</style>
