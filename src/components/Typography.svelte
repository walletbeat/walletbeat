<script
	lang="ts"
	generics="
		_Strings extends Strings = Strings
	"
>
	// Types
	import type { SvelteHTMLElements } from 'svelte/elements'
	import { ContentType, type TypographicContent } from '@/types/content'
	import type { Strings } from '@/types/utils/string-templates'


	// Props
	let {
		content,
		strings,
	}: SvelteHTMLElements['div'] & {
		content: TypographicContent<_Strings>
		strings?: _Strings extends null ? never : _Strings
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
