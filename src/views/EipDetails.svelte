<script lang="ts">
	// Types/constants
	import type { Eip } from '@/schema/eips'
	import type { Snippet } from 'svelte'
	import { childHeadingLevel } from '@/types/heading'


	// Props
	const {
		eip,
		headingLevel = 2,
		timestamp,
	}: {
		eip: Eip
		// Level of the EIP name heading; sections derive their level from it.
		headingLevel?: 1 | 2
		timestamp?: Snippet
	} = $props()

	const subheading = $derived(`h${childHeadingLevel[headingLevel]}`)


	// Functions
	import { eipEthereumDotOrgUrl, eipStatusLabel } from '@/schema/eips'
	import { trimWhitespacePrefix } from '@/types/utils/text'


	// Components
	import Typography from '@/components/Typography.svelte'
	import Timestamp from '@/components/Timestamp.svelte'
	import { ContentType } from '@/types/content'
</script>


<article data-column="gap-8">
	<header data-column="gap-6">
		<div data-row="start wrap gap-2">
			<div
				data-tag="eip"
			>
				{eip.prefix}-{eip.number}
			</div>

			<div
				data-tag="eip-status"
			>
				{eipStatusLabel[eip.status]}
			</div>

			{#if eip.finalizedDate !== null}
				<span class="final-since">since
                    {#if timestamp}
                        {@render timestamp()}
                    {:else}
                        <Timestamp date={eip.finalizedDate} />
                    {/if}
                </span>
			{/if}
		</div>

		<svelte:element this={`h${headingLevel}`} class="title">
			{eip.friendlyName ? eip.friendlyName : eip.formalTitle}
		</svelte:element>

		{#if eip.friendlyName && eip.formalTitle !== eip.friendlyName}
			<p class="formal-title">
				{eip.formalTitle}
			</p>
		{/if}
	</header>

	{#if eip.summaryMarkdown}
		<section data-column="gap-6">
			<svelte:element this={subheading} class="section-title">Summary</svelte:element>

			<Typography
				content={{
					contentType: ContentType.MARKDOWN,
					markdown: trimWhitespacePrefix(eip.summaryMarkdown)
				}}
			/>
		</section>
	{/if}

	{#if eip.whyItMattersMarkdown}
		<section data-column="gap-6">
			<svelte:element this={subheading} class="section-title">Why It Matters</svelte:element>

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
		font-size: 0.875rem;
		text-align: left;

		> header {
			.title {
				font-size: 1.5em;
			}

			.formal-title {
				font-size: 1.17em;
				color: var(--text-secondary);
			}

			.final-since {
				color: var(--text-secondary);

			}
		}

		> section {
			line-height: 1.66;

			color: var(--text-secondary);

			.section-title {
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
