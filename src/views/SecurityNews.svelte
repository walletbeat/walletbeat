<script lang="ts">
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
		shouldExpandNews = true,
		allNewsResolved = false,
	}: {
		news: WalletSecurityNews[]
		shouldExpandNews?: boolean
		allNewsResolved?: boolean
	} = $props()
</script>

<section
	class="attribute security-news"
	id="security-news"
	aria-label="Security News"
	style:--accent="#e564bc"
	data-rating="pass"
	data-icon="📰"
>
	<details
		data-card="radius-8 padding-0 border-accent"
		data-column="gap-0"
		open={shouldExpandNews}
	>
		<summary data-row>
			<header data-row>
				<div>
					<div data-row="start gap-2">
						<a data-link="camouflaged" href="#security-news">
							<h3 data-icon="📰">
								Security News
							</h3>
						</a>
					</div>

					<div class="subsection-caption">
						<p>
							{#if !allNewsResolved}
								Recent security updates and incidents
							{:else if shouldExpandNews}
								All incidents resolved. This section will collapse automatically after 30 days.
							{:else}
								Past security incidents (all resolved)
							{/if}
						</p>
					</div>
				</div>

				<data
					data-badge="medium"
					value="INFO"
				>INFO</data>
			</header>
		</summary>


		<div class="attribute-accordions news-items" data-column>
			{#each news as newsItem}
				{@const statusInfo = incidentStatuses[newsItem.status]}
				{@const severityInfo = severities[newsItem.severity]}
				{@const typeInfo = newsTypes[newsItem.type]}
				{@const impactInfo = impactCategories[newsItem.impact.category]}
				{@const newsRefs = extractRefs(newsItem)}
				<details data-card="padding-2 secondary radius-4" data-column="gap-0">
					<summary data-row="gap-2">
						<div data-column="gap-1" data-row-item="flexible">
							<h4>{newsItem.title}</h4>
							<div class="news-meta" data-row="gap-2">
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
					</summary>

					<section data-column="gap-4">
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
									cardBackground="tertiary"
								/>
							{/if}
						</div>
					</section>
				</details>
			{/each}
		</div>
	</details>
</section>

<style>
	.security-news {
		> details {
			display: grid;
			scroll-margin-top: 3.5rem;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
			transition:
				box-shadow 0.2s ease,
				transform 0.2s ease;

			&:hover {
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
				transform: translateY(-1px);
			}

			> summary {
				padding: 1.5rem;

				> header {
					flex-grow: 1;

					> div {
						display: grid;
						gap: 0.5rem;

						h3 {
							font-weight: 600;
						}
					}
				}
			}

			&::details-content {
				padding: 1.5rem;
				padding-top: 0;

				display: grid;
				gap: 1.5rem;
			}

			&:not([open])::details-content {
				padding-block: 0;
			}

			.subsection-caption {
				opacity: 0.8;
				color: var(--text-secondary);
			}
		}
	}

	.attribute-accordions {
		details {
			overflow: hidden;

			summary {
				padding: 1.25rem;

				h4 {
					max-width: 60ch;
					word-wrap: break-word;
					overflow-wrap: break-word;
				}
			}

			section {
				padding: 1.25rem;
				padding-top: 0.25rem;
				overflow: hidden;

				p {
					word-wrap: break-word;
					overflow-wrap: break-word;
				}
			}
		}
	}

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
			word-wrap: break-word;
			overflow-wrap: break-word;
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