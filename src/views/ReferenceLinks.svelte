<script lang="ts">
	// Types/constants
	import type { FullyQualifiedReference } from '@/schema/reference'
	import { isRepoImageUrl } from '@/schema/url'


	// Props
	const {
		references,
		cardBackground = 'primary',
	}: {
		references: FullyQualifiedReference[]
		cardBackground?: 'primary' | 'secondary'
	} = $props()


	// Internal state
	let lightbox = $state<{ open: (url: string) => void }>()

	// (Derived)

	// References arrive deduplicated by `mergeRefs`, so every image URL
	// appears at most once here.
	const imageUrls = $derived(
		references.flatMap(ref => ref.urls).filter(url => isRepoImageUrl(url.url)),
	)

	// When the whole section references a single distinct image, it is
	// displayed inline within the first reference that uses it.
	const soleImage = $derived(imageUrls.length === 1 ? imageUrls[0] : undefined)
	const soleImageRefIndex = $derived(
		soleImage === undefined
			? -1
			: references.findIndex(ref => ref.urls.some(url => url.url === soleImage.url)),
	)


	// Actions
	const interceptClickToLightbox = (event: MouseEvent, url: string) => {
		// Plain left-clicks open the lightbox; modified clicks
		// (middle, ctrl/cmd/shift) keep default link behavior
		// so the raw image URL stays reachable and copyable.
		if (
			event.button === 0 &&
			!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
		) {
			event.preventDefault()
			lightbox?.open(url)
		}
	}


	// Components
	import ImageLightbox from '@/components/ImageLightbox.svelte'
	import Typography from '@/components/Typography.svelte'
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
	import ImageIcon from 'lucide-static/icons/image.svg?raw'
	import { markdown } from '@/types/content'
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
				{@const refImages = ref.urls.filter(url => isRepoImageUrl(url.url))}
				{@const inlineImage = index === soleImageRefIndex ? soleImage : undefined}
				{@const linkUrls =
					inlineImage === undefined
						? ref.urls
						: ref.urls.filter(url => url.url !== inlineImage.url)}

				{#snippet Url({ url, label }: { url: string, label: string })}
					{#if isRepoImageUrl(url)}
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							onclick={(event: MouseEvent) => {
								interceptClickToLightbox(event, url)
							}}
						>
							<cite>{label}</cite>
							<span>{@html ImageIcon}</span>
						</a>
					{:else}
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
						>
							<cite>{label}</cite>
							<span>{@html ExternalLinkIcon}</span>
						</a>
					{/if}
				{/snippet}

				{#snippet ReferenceContent()}
					{#if ref.explanation}

						<p class="explanation">
							{#if linkUrls.length === 1}
								{@render Url(linkUrls[0])}
								<br>
							{/if}
							<Typography content={markdown(ref.explanation)} />
						</p>
					{/if}

					{#if linkUrls.length === 1}
						{#if !ref.explanation}
							{@render Url(linkUrls[0])}
						{/if}
					{:else if linkUrls.length > 1}
						<ul data-list="gap-1">
							{#each linkUrls as url (url.url)}
								<li>
									{@render Url(url)}
								</li>
							{/each}
						</ul>
					{/if}

					{#if inlineImage !== undefined}
						<figure class="inline-image" data-column="start gap-1">
							<a
								href={inlineImage.url}
								target="_blank"
								rel="noopener noreferrer"
								onclick={(event: MouseEvent) => {
									interceptClickToLightbox(event, inlineImage.url)
								}}
							>
								<img
									src={inlineImage.url}
									alt={inlineImage.label}
									loading="lazy"
								/>
							</a>
							<figcaption>
								<a
									href={inlineImage.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									<cite>{inlineImage.label}</cite>
									<span>{@html ImageIcon}</span>
								</a>
							</figcaption>
						</figure>
					{/if}

					{#if ref.lastRetrieved}
						<small class="last-retrieved">
							Last retrieved <time datetime={ref.lastRetrieved}>{ref.lastRetrieved}</time>
						</small>
					{/if}
				{/snippet}

				<li data-list-item="gap-2">
					{#if imageUrls.length > 1 && refImages.length > 0}
						<div data-row="start gap-4 align-start">
							<div data-row-item="flexible" data-column="gap-2">
								{@render ReferenceContent()}
							</div>

							<div data-column="gap-2">
								{#each refImages as image (image.url)}
									<a
										class="thumbnail"
										href={image.url}
										target="_blank"
										rel="noopener noreferrer"
										onclick={(event: MouseEvent) => {
											interceptClickToLightbox(event, image.url)
										}}
									>
										<img
											src={image.url}
											alt={image.label}
											loading="lazy"
										/>
									</a>
								{/each}
							</div>
						</div>
					{:else}
						{@render ReferenceContent()}
					{/if}
				</li>
			{/each}
		</ul>

		<ImageLightbox
			bind:this={lightbox}
			images={imageUrls}
		/>
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

	.inline-image {
		margin: 0;

		img {
			display: block;
			max-inline-size: 100%;
			max-block-size: 20em;

			border: 1px solid var(--border-color);
			border-radius: 0.5em;
		}
	}

	.thumbnail {
		display: block;
		flex-shrink: 0;

		img {
			display: block;
			/* Every thumbnail occupies the same fixed box regardless of
			   the underlying image's aspect ratio. */
			inline-size: 8em;
			block-size: 6em;

			object-fit: cover;
			border: 1px solid var(--border-color);
			border-radius: 0.5em;
		}
	}
</style>
