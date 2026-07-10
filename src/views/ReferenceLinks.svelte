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
	const imageUrls = $derived(
		references
			.flatMap(ref => ref.urls)
			.filter(url => isImageUrl(url.url)),
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
				{#snippet Url({ url, label }: { url: string, label: string })}
					{#if isImageUrl(url)}
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							onclick={(event: MouseEvent) => {
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

				<li data-list-item="gap-2">
					{#if ref.explanation}

						<p class="explanation">
							{#if ref.urls.length === 1}
								{@render Url(ref.urls[0])}
								<br>
							{/if}
							<Typography content={markdown(ref.explanation)} />
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

					<div class="lightbox-content">
						<figure>
							<img
								src={image.url}
								alt={image.label}
							/>
							<figcaption>{image.label}</figcaption>
						</figure>

						<div class="lightbox-controls" data-row="gap-2 wrap">
							{#if imageUrls.length > 1}
								<button
									type="button"
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
									aria-label="Next image"
									onclick={() => {
										stepLightbox(1)
									}}
								>
									{@html ChevronRightIcon}
								</button>
							{/if}

							<a
								class="lightbox-original"
								href={image.url}
								target="_blank"
								rel="noopener noreferrer"
							>
								Open original
								<span>{@html ExternalLinkIcon}</span>
							</a>

							<button
								type="button"
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

	.lightbox {
		/* Fixed dimensions: the dialog must not resize while stepping
		   through images of varying sizes and caption lengths. */
		width: min(60rem, calc(100vw - 2rem));
		height: min(45rem, calc(100vh - 2rem));
		margin: auto;
		padding: 0;

		background: var(--background-primary);
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		color: var(--text-primary);

		&::backdrop {
			background: rgba(0, 0, 0, 0.6);
		}
	}

	.lightbox-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		height: 100%;
		padding: 1rem;
	}

	.lightbox figure {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		flex: 1;
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

	.lightbox-controls {
		justify-content: center;

		button :global(svg) {
			width: 1em;
			height: 1em;
		}
	}

	.lightbox-counter {
		color: var(--text-secondary);
	}

	.lightbox-original {
		span :global(svg) {
			width: 1em;
			height: 1em;
			vertical-align: -0.125em;
		}
	}
</style>
