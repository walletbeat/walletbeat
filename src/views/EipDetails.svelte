<script lang="ts">
	// Types/constants
	import type { Eip } from '@/schema/eips'


	// Props
	const {
		eip,
		headingLevel = 2,
	}: {
		eip: Eip
		// Level of the EIP name heading; the formal title and sections sit one level below.
		headingLevel?: 1 | 2
	} = $props()

	const subheading = $derived(`h${headingLevel + 1}`)


	// Functions
	import { eipEthereumDotOrgUrl, eipFinalForLabel } from '@/schema/eips'
	import { daysSince } from '@/types/date'
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

			{#if eip.finalizedDate !== null}
				<!-- `data-final-since` lets pages refresh the day count client-side. -->
				<span class="final-since">
					<strong data-final-since={eip.finalizedDate}>{eipFinalForLabel(daysSince(eip.finalizedDate))}</strong>,
					since <time datetime={eip.finalizedDate}>{
						new Date(eip.finalizedDate).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							timeZone: 'UTC',
						})
					}</time>
				</span>
			{/if}
		</div>

		<svelte:element this={`h${headingLevel}`} class="title">
			{eip.friendlyName ? eip.friendlyName : eip.formalTitle}
		</svelte:element>

		{#if eip.formalTitle && eip.formalTitle !== eip.friendlyName}
			<svelte:element this={subheading} class="formal-title">
				{eip.formalTitle}
			</svelte:element>
		{/if}
	</header>

	{#if eip.summaryMarkdown}
		<section data-column>
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
		<section data-column>
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
		&[data-column] {
			gap: 2.25em;
		}

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

			.tags {
				flex-wrap: wrap;
				align-items: center;
			}

			.final-since {
				color: var(--text-secondary);

				strong {
					color: var(--text-primary);
				}
			}
		}

		> section {
			&[data-column] {
				gap: 1.75em;
			}

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
