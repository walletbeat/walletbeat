<script
	lang="ts"
	generics="
		_Strings extends Strings = Strings
	"
>
	// Types
	import type { HTMLAttributes } from 'svelte/elements'
	import { ContentType, type TypographicContent } from '@/types/content'
	import type { Strings } from '@/types/utils/string-templates'


	// Props
	let {
		content,
		strings,
	}: HTMLAttributes<HTMLDivElement> & {
		content: TypographicContent<_Strings>
		strings?: _Strings extends null ? never : _Strings
	} = $props()


	// Functions
	import { renderStrings } from '@/types/utils/text'

	import { micromark } from 'micromark'

	import { splitEipLinks, type EipLinkHtmlNode } from '@/utils/markdown-eip-links'

	const parseMarkdown = (markdown: string) => {
		return micromark(markdown, {
			allowDangerousHtml: false,
		})
	}


	// Components
	import EipLink from '@/components/EipLink.svelte'
</script>


{#snippet HtmlNodes(nodes: EipLinkHtmlNode[])}
	{#each nodes as node, i (i)}
		{#if node.type === 'html'}
			{@html node.html}
		{:else if node.type === 'eipLink'}
			<EipLink
				eipNumber={node.eipNumber}
				url={node.url}
				labelHtml={node.labelHtml}
			/>
		{:else if node.type === 'element'}
			<svelte:element this={node.tag} {...node.attributes}>
				{@render HtmlNodes(node.children)}
			</svelte:element>
		{/if}
	{/each}
{/snippet}


{#if content.contentType === ContentType.TEXT}
	{strings ? renderStrings(content.text, strings) : content.text}

{:else if content.contentType === ContentType.MARKDOWN}
	{@const text = strings ? renderStrings(content.markdown, strings) : content.markdown}

	{@render HtmlNodes(splitEipLinks(parseMarkdown(text)))}
{/if}
