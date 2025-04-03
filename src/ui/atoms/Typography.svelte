<script lang="ts" generics="
	Context extends Record<string, any>
">
	// Types
	import { type Renderable, ContentType } from "@/types/content"


	// Props
	let {
		renderable,
		context,
	}: {
		renderable: Renderable<Context>
		context?: Context
	} = $props()


	// (Derived)
	let content = $derived(
		renderable.render(context)
	)
</script>


{#if content.contentType === ContentType.TEXT}
	{content.text}

<!-- {:else if content.contentType === ContentType.MARKDOWN}
	{content.markdown} -->

{/if}
