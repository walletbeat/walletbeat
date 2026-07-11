<script lang="ts">
	// Types/constants
	import type { FullyQualifiedReference } from '@/schema/reference'
	import { isImageUrl } from '@/schema/url'


	// Props
	const {
		references,
		cardBackground = 'primary',
	}: {
		references: FullyQualifiedReference[]
		cardBackground?: 'primary' | 'secondary'
	} = $props()


	// Internal state
	let lightbox = $state<HTMLDialogElement>()
	let lightboxIndex = $state(0)
	let isLightboxOpen = $state(false)

	// (Derived)

	// The same image may back multiple references; the lightbox and the
	// single-image inline display both work on distinct images only.
	const imageUrls = $derived(
		references
			.flatMap(ref => ref.urls)
			.filter(url => isImageUrl(url.url))
			.filter((url, index, urls) => urls.findIndex(other => other.url === url.url) === index),
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
	const openLightbox = (url: string) => {
		lightboxIndex = Math.max(
			0,
			imageUrls.findIndex(image => image.url === url),
		)
		isLightboxOpen = true
		lightbox?.showModal()
	}

	const interceptClickToLightbox = (event: MouseEvent, url: string) => {
		// Plain left-clicks open the lightbox; modified clicks
		// (middle, ctrl/cmd/shift) keep default link behavior
		// so the raw image URL stays reachable and copyable.
		if (
			event.button === 0 &&
			!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
		) {
			event.preventDefault()
			openLightbox(url)
		}
	}

	const stepLightbox = (delta: number) => {
		lightboxIndex = (lightboxIndex + delta + imageUrls.length) % imageUrls.length
	}


	// Components
	import Typography from '@/components/Typography.svelte'
	import ChevronLeftIcon from 'lucide-static/icons/chevron-left.svg?raw'
	import ChevronRightIcon from 'lucide-static/icons/chevron-right.svg?raw'
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
	import ImageIcon from 'lucide-static/icons/image.svg?raw'
	import XIcon from 'lucide-static/icons/x.svg?raw'
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
				{@const refImages = ref.urls.filter(url => isImageUrl(url.url))}
				{@const inlineImage = index === soleImageRefIndex ? soleImage : undefined}
				{@const linkUrls =
					inlineImage === undefined
						? ref.urls
						: ref.urls.filter(url => url.url !== inlineImage.url)}

				{#snippet Url({ url, label }: { url: string, label: string })}
					{#if isImageUrl(url)}
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

		{#if imageUrls.length > 0}
			<dialog
				bind:this={lightbox}
				class="lightbox"
				aria-label="Reference image viewer"
				onclose={() => {
					isLightboxOpen = false
				}}
				onclick={(event: MouseEvent) => {
					if (event.target === lightbox) {
						lightbox?.close()
					}
				}}
				onkeydown={(event: KeyboardEvent) => {
					if (event.key === 'ArrowLeft') {
						stepLightbox(-1)
					} else if (event.key === 'ArrowRight') {
						stepLightbox(1)
					}
				}}
			>
				{#if isLightboxOpen}
					{@const image = imageUrls[lightboxIndex]}

					<div class="lightbox-content" data-card data-column="gap-3">
						<figure data-column="gap-2" data-column-item="flexible">
							<img
								src={image.url}
								alt={image.label}
							/>
							<figcaption>{image.label}</figcaption>
						</figure>

						<div data-row="center gap-2 wrap">
							{#if imageUrls.length > 1}
								<button
									type="button"
									data-icon="circle"
									aria-label="Previous image"
									onclick={() => {
										stepLightbox(-1)
									}}
								>
									{@html ChevronLeftIcon}
								</button>

								<span
									class="lightbox-counter"
									aria-live="polite"
								>
									{lightboxIndex + 1} / {imageUrls.length}
								</span>

								<button
									type="button"
									data-icon="circle"
									aria-label="Next image"
									onclick={() => {
										stepLightbox(1)
									}}
								>
									{@html ChevronRightIcon}
								</button>
							{/if}

							<a
								href={image.url}
								target="_blank"
								rel="noopener noreferrer"
							>
								Open original
								<span>{@html ExternalLinkIcon}</span>
							</a>

							<button
								type="button"
								data-icon="circle"
								aria-label="Close image viewer"
								onclick={() => {
									lightbox?.close()
								}}
							>
								{@html XIcon}
							</button>
						</div>
					</div>
				{/if}
			</dialog>
		{/if}
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

	.lightbox {
		/* Fixed dimensions: the dialog must not resize while stepping
		   through images of varying sizes and caption lengths. */
		width: min(60rem, calc(100vw - 2rem));
		height: min(45rem, calc(100vh - 2rem));
		margin: auto;
		padding: 0;
		overflow: hidden;

		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: 0.5em;
		color: var(--text-primary);

		&::backdrop {
			background: rgba(0, 0, 0, 0.6);
		}
	}

	.lightbox-content {
		height: 100%;
	}

	.lightbox figure {
		min-height: 0;
		margin: 0;

		img {
			flex: 1;
			min-height: 0;
			width: 100%;

			object-fit: contain;
		}

		figcaption {
			color: var(--text-secondary);
			font-size: 0.875em;
			text-align: center;
		}
	}

	.lightbox-counter {
		color: var(--text-secondary);
	}
</style>
