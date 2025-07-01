<script lang="ts">
	// Types/constants
	import type { FullyQualifiedReference } from '@/schema/reference'


	// Props
	let {
		references,
		explanation,
	}: {
		references: FullyQualifiedReference[]
		explanation?: string
	} = $props()
</script>


{#if references.length > 0}
	{@const totalUrls = references.reduce((count: number, ref: FullyQualifiedReference) => count + ref.urls.length, 0)}
	
	<div>
		<span>{totalUrls > 1 ? 'Sources:' : 'Source:'}</span>
		{#each references as ref, refIndex}
			{#if refIndex > 0}, {/if}
			{#each ref.urls as url, urlIndex}
				{#if urlIndex > 0}, {/if}
				<a
					href={url.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					{url.label}
				</a>
			{/each}
		{/each}
		{#if explanation !== undefined && explanation !== ''}
			<p>({explanation})</p>
		{/if}
	</div>
{/if}


<style>
	hr {
		border: none;
		border-top: 1px solid var(--border);
	}

	small {
		color: var(--text-secondary);
		line-height: 1.4;
	}

	strong {
		margin-right: 0.25rem;
	}

	p {
		margin-left: 0.25rem;
		font-style: italic;
	}
</style> 