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
			<div class="tag" data-tag-type="eip">
				{eip.prefix}-{eip.number}
			</div>

			<div class="tag" data-tag-type="eip-status">
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

				.tag {
					&[data-tag-type='eip'] {
						--tag-backgroundColor: light-dark(oklch(0.95 0.03 300), oklch(0.25 0.05 300));
						--tag-textColor: light-dark(oklch(0.65 0.15 300), oklch(0.70 0.25 300));
						--tag-borderColor: light-dark(oklch(0.90 0.06 300), oklch(0.40 0.08 300));
						--tag-hover-backgroundColor: light-dark(oklch(0.92 0.05 300), oklch(0.30 0.07 300));
						--tag-hover-textColor: light-dark(oklch(0.60 0.18 300), oklch(0.85 0.15 300));
						--tag-hover-borderColor: light-dark(oklch(0.85 0.08 300), oklch(0.50 0.10 300));
					}

					&[data-tag-type='eip-status'] {
						--tag-backgroundColor: light-dark(oklch(0.95 0.03 250), oklch(0.25 0.05 250));
						--tag-textColor: light-dark(oklch(0.65 0.15 250), oklch(0.70 0.25 250));
						--tag-borderColor: light-dark(oklch(0.90 0.06 250), oklch(0.40 0.08 250));
						--tag-hover-backgroundColor: light-dark(oklch(0.92 0.05 250), oklch(0.30 0.07 250));
						--tag-hover-textColor: light-dark(oklch(0.60 0.18 250), oklch(0.85 0.15 250));
						--tag-hover-borderColor: light-dark(oklch(0.85 0.08 250), oklch(0.50 0.10 250));
					}
				}
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
