<script
	lang="ts"
	generics="
		Content extends TypographicContent
	"
>
	// Types
	import { ContentType, type TypographicContent } from '@/types/content'
	import { renderStrings } from '@/types/utils/text'


	// Props
	let {
		content,
		strings,
	}: {
		content: Content
		strings?: Content extends TypographicContent<infer Strings> ? Strings : undefined
	} = $props()


	// Functions
	import { marked } from 'marked'

	marked.setOptions({
		gfm: false,
	})
</script>


{#if content.contentType === ContentType.TEXT}
	{strings ? renderStrings(content.text, strings) : content.text}

{:else if content.contentType === ContentType.MARKDOWN}
	{@const text = strings ? renderStrings(content.markdown, strings) : content.markdown}

	<div class="markdown">
		{#await marked.parse(text, {})}
			...
		{:then html}
			{@html html}
		{/await}
	</div>
{/if}


<style>
	.markdown {
		display: grid;
		gap: 1.25em;

		:global {
			ul, ol {
				list-style-type: revert;
				padding-inline-start: 1.5em;

				li + li {
					margin-top: 1em;
				}
			}
		}
	}
</style>
