<script
	lang="ts"
	generics="
		TypographicContent extends _TypographicContent = _TypographicContent
	"
>
	// Types
	import type { SvelteHTMLElements } from 'svelte/elements'
	import { ContentType, type TypographicContent as _TypographicContent } from '@/types/content'


	// Props
	let {
		content,
		strings,
		...restProps
	}: SvelteHTMLElements['div'] & {
		content: TypographicContent
		strings?: TypographicContent extends _TypographicContent<infer Strings> ? Strings extends null ? never : Strings : never
	} = $props()


	// Functions
	import { renderStrings } from '@/types/utils/text'

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

	{@html parseMarkdown(text)}
{/if}
