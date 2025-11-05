<script lang="ts">
	// Types/constants
	import type { FullyQualifiedReference } from '@/schema/reference'


	// Props
	const {
		references,
	}: {
		references: FullyQualifiedReference[]
	} = $props()
</script>


{#if references.length > 0}
	<!-- {@const totalUrls = references.reduce((count: number, ref: FullyQualifiedReference) => count + ref.urls.length, 0)} -->

	<div>
		<!-- <h5>{totalUrls > 1 ? 'Sources' : 'Source'}</h5> -->

		<ul class="references">
			{#each references as ref, index (index + '::' + ref.urls.map(url => url.url).toSorted().join('|'))}
				<li data-card="secondary padding-3">
					{#if ref.explanation}
						<p>{ref.explanation}</p>
					{/if}

					<div class="urls">
						<ul data-row="start gap-2">
							{#each ref.urls as url (url.url)}
								<li data-card="padding-3">
									<a
										href={url.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										<cite>{url.label}</cite>
									</a>
								</li>
							{/each}
						</ul>

						{#if ref.lastRetrieved}
							as of
							<time datetime={ref.lastRetrieved}>{ref.lastRetrieved}</time>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
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

	ul.references {
		font-size: smaller;
		list-style: none;

		> * + * {
			margin-top: 1em;
		}

		> li {
			padding-left: 2em;

			> * + * {
				margin-top: 1em;
			}

			ul {
				list-style: none;
				padding: 0;
			}
		}
	}

	cite {
		font-style: normal;
	}

	p {
		margin-top: 0.5em;
	}
</style>
