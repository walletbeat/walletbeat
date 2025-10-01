<script lang="ts">
	// Types/constants
	import type { Eip } from '@/schema/eips'


	// Props
	let {
		eip,
	}: {
		eip: Eip
	} = $props()


	// Functions
	import { eipEthereumDotOrgUrl } from '@/schema/eips'
	import { trimWhitespacePrefix } from '@/types/utils/text'


	// Components
	import Typography from '@/ui/atoms/Typography.svelte'
	import { ContentType } from '@/types/content'
</script>


<article>
	<header>
		<div class="tags">
			<div
				class="tag"
				data-tag-variant="eip"
			>
				{eip.prefix}-{eip.number}
			</div>

			<div
				class="tag"
				data-tag-variant="eip-status"
			>
				{eip.status}
			</div>
		</div>

		<h2>
			{eip.friendlyName ? eip.friendlyName : eip.formalTitle}
		</h2>

		{#if eip.formalTitle && eip.formalTitle !== eip.friendlyName}
			<h3>
				{eip.formalTitle}
			</h3>
		{/if}
	</header>

	{#if eip.summaryMarkdown}
		<section>
			<h4>Summary</h4>

			<Typography
				content={{
					contentType: ContentType.MARKDOWN,
					markdown: trimWhitespacePrefix(eip.summaryMarkdown)
				}}
			/>
		</section>
	{/if}

	{#if eip.whyItMattersMarkdown}
		<section>
			<h4>Why It Matters</h4>

			<Typography
				content={{
					contentType: ContentType.MARKDOWN,
					markdown: trimWhitespacePrefix(eip.whyItMattersMarkdown)
				}}
			/>
		</section>
	{/if}

	<footer>
		<a
			href={eipEthereumDotOrgUrl(eip)}
			target="_blank"
			rel="noopener noreferrer"
		>
			Read full specification →
		</a>
	</footer>
</article>


<style>
	article {
		display: grid;
		gap: 2.25em;

		font-size: 0.875rem;
		text-align: left;

		> header {
			display: grid;
			gap: 1.5em;

			.tags {
				display: flex;
				align-items: center;
				gap: 0.5em;
			}

			h3 {
				color: var(--text-secondary);
			}
		}

		> section {
			display: grid;
			gap: 1.75em;
			line-height: 1.66;

			color: var(--text-secondary);

			h4 {
				font-size: 0.75rem;
				text-transform: uppercase;
				letter-spacing: 0.05em;
			}

			:global(.markdown) {
				gap: 1.75em;
			}
		}

		footer {
			text-align: right;
		}
	}
</style>
