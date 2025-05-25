<script
	lang="ts"
	generics="
		TypographicContent extends _TypographicContent
	"
>
	// Types
	import { ContentType, type TypographicContent as _TypographicContent } from '@/types/content'
	import { renderStrings } from '@/types/utils/text'


	// Props
	let {
		content,
		strings,
	}: {
		content: TypographicContent
		strings?: TypographicContent extends _TypographicContent<infer Strings> ? Strings : undefined
	} = $props()


	// Functions
	import { micromark } from 'micromark'

	const parseMarkdown = (markdown: string) => {
		return micromark(markdown, {
			allowDangerousHtml: false,
		})
	}
</script>


{#if content.contentType === ContentType.TEXT}
	{strings ? renderStrings(content.text, strings) : content.text}

{:else if content.contentType === ContentType.MARKDOWN}
	{@const text = strings ? renderStrings(content.markdown, strings) : content.markdown}

	<div class="markdown">
		{@html parseMarkdown(text)}
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
