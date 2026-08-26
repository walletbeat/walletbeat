<script lang="ts">
	// Types/constants
	import type { InlineText } from '@/types/content/inline'
	import { renderStrings } from '@/types/utils/text'
	import type { StructuredDetailsContext } from '@/utils/structured-details/context'

	// Props
	const {
		inline,
		context,
	}: {
		inline: InlineText
		context: StructuredDetailsContext
	} = $props()

	const spans = $derived(
		inline.map(span => ({ ...span, text: renderStrings(span.text, { ...context.strings }) })),
	)
</script>


{#each spans as span, index (index)}{#if span.kind === 'link'}<a
			href={span.url}
			target={span.url.startsWith('/') ? undefined : '_blank'}
			rel={span.url.startsWith('/') ? undefined : 'noopener noreferrer'}
		>{#if span.strong}<strong>{span.text}</strong>{:else}{span.text}{/if}</a
		>{:else if span.code}<code>{span.text}</code>{:else if span.strong}<strong
		>{span.text}</strong
	>{:else if span.emphasis}<em>{span.text}</em>{:else}{span.text}{/if}{/each}
