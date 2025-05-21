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
</script>


{#if content.contentType === ContentType.TEXT}
	{strings ? renderStrings(content.text, strings) : content.text}

<!-- {:else if content.contentType === ContentType.MARKDOWN}
	{content.markdown} -->
{/if}
