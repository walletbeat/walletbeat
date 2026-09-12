<script lang="ts">
	// Types/constants
	import { computeDataSourceCredits, type FullyQualifiedReference } from '@/schema/reference'
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

		<ul class="data-credits-list" data-list="gap-2">
			{#each credits as credit (credit.source.entity.id)}
				<li data-list-item="gap-2">
					{#if isUrl(credit.source.entity.url)}
						<a
							href={getUrl(credit.source.entity.url)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<cite>{credit.source.entity.name}</cite>
						</a>
					{:else}
						<cite>{credit.source.entity.name}</cite>
					{/if}

					<ul data-list="gap-1">
						{#each credit.reportUrls as reportUrl (reportUrl.url)}
							<li>
								<a
									href={reportUrl.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									<cite>{reportUrl.label}</cite>
									<span>{@html ExternalLinkIcon}</span>
								</a>
							</li>
						{/each}
					</ul>

					<p>
						<a
							href={getUrl(credit.source.license.url)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<cite>{credit.source.license.name}</cite>
							<span>{@html ExternalLinkIcon}</span>
						</a>
					</p>

					<p class="attribution">{credit.source.attributionText}</p>
				</li>
			{/each}
		</ul>
	</section>
{/if}


<style>
	.data-credits {
		font-size: 0.875em;
		line-height: 1.7;
	}

	h5 {
		font-size: 1em;
	}

	cite {
		font-style: normal;
	}

	.attribution {
		margin: 0;
	}
</style>
