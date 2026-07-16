<script lang="ts">
	// Types/constants
	import type { LabeledUrl } from '@/schema/url'


	// Props
	const {
		images,
	}: {
		images: LabeledUrl[]
	} = $props()


	// Internal state
	let dialog = $state<HTMLDialogElement>()
	let imageIndex = $state(0)
	let isOpen = $state(false)


	// Actions
	export const open = (url: string) => {
		imageIndex = Math.max(
			0,
			images.findIndex(image => image.url === url),
		)
		isOpen = true
		dialog?.showModal()
	}

	const step = (delta: number) => {
		imageIndex = (imageIndex + delta + images.length) % images.length
	}


	// Components
	import ChevronLeftIcon from 'lucide-static/icons/chevron-left.svg?raw'
	import ChevronRightIcon from 'lucide-static/icons/chevron-right.svg?raw'
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
	import XIcon from 'lucide-static/icons/x.svg?raw'
</script>


{#if images.length > 0}
	<dialog
		bind:this={dialog}
		class="lightbox"
		aria-label="Reference image viewer"
		onclose={() => {
			isOpen = false
		}}
		onclick={(event: MouseEvent) => {
			if (event.target === dialog) {
				dialog?.close()
			}
		}}
		onkeydown={(event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft') {
				step(-1)
			} else if (event.key === 'ArrowRight') {
				step(1)
			}
		}}
	>
		{#if isOpen}
			{@const image = images[imageIndex]}

			<div class="lightbox-content" data-card data-column="gap-3">
				<figure data-column="gap-2" data-column-item="flexible">
					<img
						src={image.url}
						alt={image.label}
					/>
					<figcaption>{image.label}</figcaption>
				</figure>

				<div data-row="center gap-2 wrap">
					{#if images.length > 1}
						<button
							type="button"
							data-icon="circle"
							aria-label="Previous image"
							onclick={() => {
								step(-1)
							}}
						>
							{@html ChevronLeftIcon}
						</button>

						<span
							class="lightbox-counter"
							aria-live="polite"
						>
							{imageIndex + 1} / {images.length}
						</span>

						<button
							type="button"
							data-icon="circle"
							aria-label="Next image"
							onclick={() => {
								step(1)
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
							dialog?.close()
						}}
					>
						{@html XIcon}
					</button>
				</div>
			</div>
		{/if}
	</dialog>
{/if}


<style>
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
