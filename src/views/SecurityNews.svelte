<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { WBIconID } from '@/styles/wbicons'
	import type { WalletSecurityNews } from '@/types/content/news'
	import {
		incidentStatuses,
		newsTypes,
		severities,
		impactCategories,
	} from '@/types/content/news'
	import { refs as extractRefs } from '@/schema/reference'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'

	const {
		news,
		heading,
		allNewsResolved = false,
	}: {
		news: WalletSecurityNews[]
		heading: Snippet<[string, string, WBIconID, Snippet?, Snippet?]>
		allNewsResolved?: boolean
	} = $props()
</script>


<aside
	class="security-news"
	id="security-news"
	aria-label="Security News"
	style:--accent="#e564bc"
	data-scroll-item="inline-detached padding-match-end flow"
	data-sticky-container
	data-sticky-breadcrumb="scope clearance size"
	style:--stickyBreadcrumb-entryTimeline="--security-news-entry"
>
	{#snippet description()}<p>{allNewsResolved ? 'Past security incidents (all resolved)' : 'Recent security updates and incidents'}</p>{/snippet}
	{@render heading('security-news', 'Security News', 'newsletter', description)}

		<div class="news-items" data-column="gap-6">
			{#each news as newsItem (newsItem.slug)}
				{@const statusInfo = incidentStatuses[newsItem.status]}
				{@const severityInfo = severities[newsItem.severity]}
				{@const typeInfo = newsTypes[newsItem.type]}
				{@const impactInfo = impactCategories[newsItem.impact.category]}
				{@const newsRefs = extractRefs(newsItem)}
				<article data-card="padding-5 secondary radius-4" data-column="gap-0"
					id={`security-news-${newsItem.slug}`}
					data-sticky-container data-sticky-breadcrumb="scope clearance"
					style:--stickyBreadcrumb-entryTimeline={`--security-news-${newsItem.slug}-entry`}>
					<details data-column="gap-0">
					<summary data-row="gap-2" data-sticky-breadcrumb="position" data-sticky="block block-start backdrop-before backdrop-stuck">
						<div data-column="span-start" data-row-item="flexible"
							style:--column-sizeTimelinePrefix="var(--stickyBreadcrumb-entryTimeline)">
							<div data-row="start" data-sticky="block block-start backdrop-self backdrop-always">
							<h3 data-sticky-breadcrumb="source"><a data-sticky-breadcrumb="item" data-link="camouflaged" href={`#security-news-${newsItem.slug}`}>{newsItem.title}</a></h3>
							<div class="news-meta" data-row="end gap-2 wrap" data-row-item="wrap-end" data-sticky-breadcrumb="end contents">
								<span
									class="news-badge news-type"
									data-badge="small"
								>{typeInfo.label}</span>
								<span
									class="news-badge news-severity"
									data-badge="small"
									style:--accent={severityInfo.color}
								>{severityInfo.label}</span>
								<span
									class="news-badge news-status"
									data-badge="small"
									style:--accent={statusInfo.color}
								>
									{@html statusInfo.icon}
									{statusInfo.label}
								</span>
							</div>
							</div>
						</div>
					</summary>

					<div data-column="gap-4" data-scroll-item="snap-prose">
						<p class="news-summary">{newsItem.summary}</p>

						<div class="news-details" data-column="gap-2">
							<div class="news-impact" data-column="gap-1">
								<span class="news-detail-label">Impact:</span>
								<div data-row="gap-2">
									<span class="news-detail-value">{impactInfo.label}</span>
									{#if newsItem.impact.fundsImpacted}
										<span
											class="news-badge funds-impacted"
											data-badge="small"
											style:--accent="#ef4444"
										>Funds Impacted</span>
									{/if}
								</div>
							</div>

							<div class="news-dates" data-row="gap-4 wrap">
								<span>
									<span class="news-detail-label">Published:</span>
									<span class="news-detail-value">{newsItem.publishedAt}</span>
								</span>
								{#if newsItem.updatedAt !== newsItem.publishedAt}
									<span>
										<span class="news-detail-label">Updated:</span>
										<span class="news-detail-value">{newsItem.updatedAt}</span>
									</span>
								{/if}
							</div>

							{#if newsRefs.length > 0}
								<ReferenceLinks
									references={newsRefs}
								/>
							{/if}
						</div>
					</div>
				</details>
				<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
				<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
				</article>
			{/each}
		</div>
		<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
	<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
</aside>


<style>
	.news-items {
		.news-meta {
			font-size: 0.85rem;
		}

		.news-badge {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;

			:global(svg) {
				width: 1em;
				height: 1em;
			}
		}

		.news-type {
			--accent: var(--color-accent-purple);
		}

		.news-summary {
			color: var(--text-secondary);
		}

		.news-details {
			font-size: 0.9rem;
		}

		.news-detail-label {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.news-detail-value {
			color: var(--text-primary);
		}

		.funds-impacted {
			font-weight: 600;
		}

		.news-dates {
			color: var(--text-secondary);
			font-size: 0.85rem;
		}
	}
</style>
