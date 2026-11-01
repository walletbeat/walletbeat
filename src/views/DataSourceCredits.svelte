<script lang="ts">
	// Types/constants
	import type { Entity } from '@/schema/entity'
	import {
		computeDataSourceCredits,
		dataCreditAnchorId,
		type DataSourceCredit,
		type FullyQualifiedReference,
	} from '@/schema/reference'
	import { getUrl, isUrl } from '@/schema/url'


	// Props
	const {
		references,
	}: {
		references: FullyQualifiedReference[]
	} = $props()


	// (Derived)
	const credits = $derived(computeDataSourceCredits(references))


	// Components
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
</script>


{#if credits.length > 0}
	{#snippet sourceHeading(entity: Entity)}
		{#if entity.icon !== 'NO_ICON'}
			<span data-icon aria-hidden="true">
				<img
					src={`/images/entities/${entity.id}.${entity.icon.extension}`}
					alt=""
				/>
			</span>
		{/if}<cite>{entity.name}</cite>
	{/snippet}

	{#snippet labeledLink(href: string, label: string)}
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
		>
			<cite>{label}</cite>
			<span>{@html ExternalLinkIcon}</span>
		</a>
	{/snippet}

	{#snippet creditLine(credit: DataSourceCredit)}
		{#if isUrl(credit.source.entity.url)}
			<a
				href={getUrl(credit.source.entity.url)}
				target="_blank"
				rel="noopener noreferrer"
				data-link="camouflaged"
				class="source-name"
			>{@render sourceHeading(credit.source.entity)}</a>
		{:else}
			<span class="source-name">{@render sourceHeading(credit.source.entity)}</span>
		{/if}<span>:&nbsp;</span>{#each credit.reportUrls as reportUrl, index (reportUrl.url)}{#if index > 0}<span>,&nbsp;</span>{/if}{@render labeledLink(reportUrl.url, reportUrl.label)}{/each}<span>,&nbsp;</span>{@render labeledLink(getUrl(credit.source.license.url), credit.source.license.name)}<span>.&nbsp;</span>{credit.source.attributionText}
	{/snippet}

	<section
		class="data-credits"
		data-card="secondary"
	>
		<h5>
			{credits.length > 1 ? 'Data credits' : 'Data credit'}
			{#if credits.length > 1}
				({credits.length})
			{/if}
		</h5>

		<ul class="data-credits-list">
			{#each credits as credit (credit.source.entity.id)}
				<li id={dataCreditAnchorId(credit.source.entity)}>{@render creditLine(credit)}</li>
			{/each}
		</ul>
	</section>
{/if}


<style>
	.data-credits {
		font-size: 0.875em;
		line-height: 1.7;
	}

	.data-credits-list li {
		/* Ensures inline `#data-credit-*` anchor links from reference
		   markers do not land underneath the sticky page header. */
		scroll-margin-block-start: 4em;
	}

	h5 {
		font-size: 1em;
	}

	cite {
		font-style: normal;
	}

	.source-name {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		vertical-align: middle;
	}

	.data-credits a:not(.source-name) > span {
		margin-inline-end: -0.2em;
	}
</style>
