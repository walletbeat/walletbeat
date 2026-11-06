<script lang="ts">
	import type { Erc7730MetadataSource } from '@/schema/features/security/erc7730-metadata'
	import { toFullyQualified } from '@/schema/reference'
	import { getUrl } from '@/schema/url'

	import ReferenceLinks from './ReferenceLinks.svelte'

	const { sources }: { sources: Erc7730MetadataSource[] | null } = $props()
</script>

{#if sources === null}
	<p>The metadata sources have not been confirmed.</p>
{:else if sources.length === 0}
	<p>The wallet is confirmed not to use an ERC-7730 metadata source.</p>
{:else}
	<ul data-list="gap-4">
		{#each sources as source (source)}
			<li data-column="gap-3">
				<strong>{source.name}</strong>
				<p>
					Registry:
					{#if source.registry === null}
						Not confirmed.
					{:else}
						<a href={getUrl(source.registry)}>{getUrl(source.registry)}</a>
					{/if}
				</p>
				<p>
					Endpoint:
					{#if source.endpoint === null}
						Not confirmed.
					{:else}
						<a href={getUrl(source.endpoint)}>{getUrl(source.endpoint)}</a>
					{/if}
				</p>
				<ReferenceLinks references={toFullyQualified(source.ref)} headingLevel={4} />
			</li>
		{/each}
	</ul>
{/if}
