<script lang="ts">
	// Types/constants
	import type { FullyQualifiedReference } from '@/schema/reference'


	// Props
	const {
		references,
		cardBackground = 'primary',
	}: {
		references: FullyQualifiedReference[]
		cardBackground?: 'primary' | 'secondary'
	} = $props()


	// Components
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
</script>


{#if references.length > 0}
	{@const totalUrls = references.flatMap(ref => ref.urls).length}

	<section
		class="references"
		data-card={cardBackground}
	>
		<h5>
			{totalUrls > 1 ? 'Sources' : 'Source'}
			{#if totalUrls > 1}
				({totalUrls})
			{/if}
		</h5>

		<ul class="references-list" data-list="gap-2">
			{#each references as ref, index (index + '::' + ref.urls.map(url => url.url).toSorted().join('|'))}
				{#snippet Url({ url, label }: { url: string, label: string })}
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<cite>{label}</cite>
						<span>{@html ExternalLinkIcon}</span>
					</a>
				{/snippet}

				<li data-list-item="gap-2">
					{#if ref.explanation}

						<p class="explanation">
							{#if ref.urls.length === 1}
								{@render Url(ref.urls[0])}
								<br>
							{/if}
							{ref.explanation}
						</p>
					{/if}

					{#if ref.urls.length === 1}
						{#if !ref.explanation}
							{@render Url(ref.urls[0])}
						{/if}
					{:else}
						<ul data-list="gap-1">
							{#each ref.urls as url (url.url)}
								<li>
									{@render Url(url)}
								</li>
							{/each}
						</ul>
					{/if}

					{#if ref.lastRetrieved}
						<small class="last-retrieved">
							Last retrieved <time datetime={ref.lastRetrieved}>{ref.lastRetrieved}</time>
						</small>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}


<style>
	.references {
		font-size: 0.875em;
		line-height: 1.7;
	}

	h5 {
		font-size: 1em;
	}

	cite {
		font-style: normal;
	}

	.last-retrieved {
		color: var(--text-secondary);
		font-size: 0.875em;
	}
</style>
