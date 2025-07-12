<script lang="ts">
	// Types
	import type { EasingFunction } from 'svelte/transition'
	import type { Snippet } from 'svelte'
	import type { SvelteHTMLElements } from 'svelte/elements'
	import type { TransitionConfig } from 'svelte/transition'

	type Key = $$Generic<any>
	type Value = $$Generic<any>
	type TransitionParams = $$Generic<{delay?: number; duration?: number; easing?: EasingFunction}>

	type TransitionFnAndParams<
		Fn extends (node: Element, _?: any) => TransitionConfig = any
	> = (
		Fn extends (node: Element, _?: infer Params) => TransitionConfig
			? [Fn] | [Fn, Params | undefined]
			: never
	)


	// Inputs
	let {
		key,
		value,
		clip = true,

		// Snippets
		children,

		// View options
		align = 'top',
		contentTransition = [fade, { duration: 200, easing: expoOut }],
	}: {
		key?: Key
		value?: Value
		clip?: boolean

		// Snippets
		children?: Snippet<[{ key?: Key, value: any }]>

		// View options
		align?: 'top' | 'center' | 'bottom'
		contentTransition?: TransitionFnAndParams | { in?: TransitionFnAndParams, out?: TransitionFnAndParams }
	} = $props()


	// Internal state
	let borderBoxSize: ResizeObserverSize[] | undefined = $state()


	// (Computed)
	let alignBlock = $derived(
		({ 'top': 'start', 'center': 'center', 'bottom': 'end' } as const)[align]
	)

	let [ transition, transitionParams ] = $derived(
		[() => {}]
	)


	// Transitions
	import { fade } from 'svelte/transition'
	import { expoOut } from 'svelte/easing'
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
	transition:transition={transitionParams}
	class={`stack align-${align}`}
>
	{#if contentTransition}
		{#if 'in' in contentTransition && contentTransition.in && 'out' in contentTransition && contentTransition.out}
			{@const { in: [inTransition, inParams], out: [outTransition, outParams] } = contentTransition}

			{#key key ?? value}
				<div
					data-content
					bind:borderBoxSize
					class={`column align-${align}`}
					in:inTransition={inParams}
					out:outTransition={outParams}
				>
					{#if children}
						{@render children({ key, value })}
					{:else}
						{value}
					{/if}
				</div>
			{/key}

		{:else if 'in' in contentTransition && contentTransition.in}
			{@const { in: [inTransition, inParams] } = contentTransition}

			{#key key ?? value}
				<div
					data-content
					bind:borderBoxSize
					class={`column align-${align}`}
					in:inTransition={inParams}
				>
					{#if children}
						{@render children({ key, value })}
					{:else}
						{value}
					{/if}
				</div>
			{/key}

		{:else if 'out' in contentTransition && contentTransition.out}
			{@const { out: [outTransition, outParams] } = contentTransition}

			{#key key ?? value}
				<div
					data-content
					bind:borderBoxSize
					class={`column align-${align}`}
					out:outTransition={outParams}
				>
					{#if children}
						{@render children({ key, value })}
					{:else}
						{value}
					{/if}
				</div>
			{/key}

		{:else if Array.isArray(contentTransition)}
			{@const [transition, transitionParams] = contentTransition}

			{#key key ?? value}
				<div
					data-content
					bind:borderBoxSize
					class={`column align-${align}`}
					transition:transition={transitionParams}
				>
					{#if children}
						{@render children({ key, value })}
					{:else}
						{value}
					{/if}
				</div>
			{/key}
		{/if}

	{:else}
		{#key key ?? value}
			<div
				data-content
				bind:borderBoxSize
				class={`column align-${align}`}
			>
				{#if children}
					{@render children({ key, value })}
				{:else}
					{value}
				{/if}
			</div>
		{/key}
	{/if}
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
