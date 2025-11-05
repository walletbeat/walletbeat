<script lang="ts">
	// Types/constants
	import type { Eip } from '@/schema/eips'


	// Props
	const {
		eip,
	}: {
		eip: Eip
	} = $props()


	// Functions
	import { eipEthereumDotOrgUrl } from '@/schema/eips'
	import { trimWhitespacePrefix } from '@/types/utils/text'


	// Components
	import Typography from '@/components/Typography.svelte'
	import { ContentType } from '@/types/content'
</script>


<article data-column>
	<header data-column="gap-6">
		<div class="tags" data-row="start gap-2">
			<div
				data-tag="eip"
			>
				{eip.prefix}-{eip.number}
			</div>

			<div
				data-tag="eip-status"
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
		<section data-column>
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
		<section data-column>
			<h4>Why It Matters</h4>

			<Typography
				content={{
					contentType: ContentType.MARKDOWN,
					markdown: trimWhitespacePrefix(eip.whyItMattersMarkdown)
				}}
			/>
		</section>
	{/if}

	<footer data-row="end">
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
		&[data-column] {
			gap: 2.25em;
		}

		font-size: 0.875rem;
		text-align: left;

		> header {
			h3 {
				color: var(--text-secondary);
			}
		}

		> section {
			&[data-column] {
				gap: 1.75em;
			}

			line-height: 1.66;

			color: var(--text-secondary);

			h4 {
				font-size: 0.75rem;
				text-transform: uppercase;
				letter-spacing: 0.05em;
			}

			:global {
				.markdown {
					&[data-column] {
						gap: 1.75em;
					}
				}
			}
		}
	}
</style>
