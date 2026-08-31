<script lang="ts">
	// Types/constants
	import type { FullyQualifiedReference } from '@/schema/reference'
	import { getUrlLabel, isRepoImageUrl, type LabeledUrl } from '@/schema/url'
	import { codeSnippetForUrl, type ResolvedCodeSnippet } from '@/utils/code-snippet-index'


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

	// Only repo-hosted images are rendered inline or as thumbnails;
	// rendering an externally-hosted image would leak visitor traffic to
	// that host, so `isRepoImageUrl` filters those out and they stay plain
	// links. References arrive deduplicated by `mergeRefs`, so every image
	// URL appears at most once here.
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


	// A reference URL together with its locally stored code snippet.
	// Snippet-backed URLs are rendered as inline code blocks with their own
	// caption link, so they are excluded from the plain link list.
	const codeSnippetEntries = (
		urls: LabeledUrl[],
	): { url: LabeledUrl; snippet: ResolvedCodeSnippet }[] => {
		const entries: { url: LabeledUrl; snippet: ResolvedCodeSnippet }[] = []

		for (const url of urls) {
			const snippet = codeSnippetForUrl(url.url)

			if (snippet !== null) {
				entries.push({ snippet, url })
			}
		}

		return entries
	}


	// Actions

	// Scope-header/context lines can push the highlighted (referenced) lines
	// below the fold of the fixed-height snippet box, so scroll them into view
	// as soon as the box mounts. Sets `pre.scrollTop` directly (rather than
	// `scrollIntoView`) so only the snippet box scrolls, not the page.
	const scrollToHighlight = (pre: HTMLElement) => {
		const highlighted = pre.querySelectorAll<HTMLElement>('.row.highlighted')

		if (highlighted.length === 0) {
			return
		}

		const first = highlighted[0]
		const last = highlighted[highlighted.length - 1]
		const center = (first.offsetTop + last.offsetTop + last.offsetHeight) / 2

		pre.scrollTop = Math.max(0, center - pre.clientHeight / 2)
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
			lightbox?.open(url)
		}
	}


	// Components
	import ImageLightbox from '@/components/ImageLightbox.svelte'
	import Typography from '@/components/Typography.svelte'
	import CodeIcon from 'lucide-static/icons/code.svg?raw'
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
				{@const refSnippets = codeSnippetEntries(ref.urls)}
				{@const snippetUrls = new Set(refSnippets.map(entry => entry.url.url))}
				{@const linkUrls = ref.urls.filter(
					url => url.url !== inlineImage?.url && !snippetUrls.has(url.url),
				)}

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

					{#each refSnippets as { url, snippet } (url.url)}
						{@const sourceLocation = getUrlLabel(url.url)}
						<figure class="code-snippet" data-column="start gap-1">
							<figcaption>
								<a
									href={url.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									<cite>{url.label}</cite>
									{#if sourceLocation !== url.label}
										<br>
										<span class="source-location">{sourceLocation}</span>
									{/if}
									<span>{@html CodeIcon}</span>
								</a>
							</figcaption>
							<pre use:scrollToHighlight><code>{#each snippet.rows as row, rowIndex (rowIndex)}{#if row.type === 'gap'}<span class="row gap"><span class="line-number">...</span><span class="line-content"></span></span>{:else}<span class="row line" class:highlighted={row.highlighted}><span class="line-number">{row.number}</span><span class="line-content">{@html row.html}</span></span>{/if}{/each}</code></pre>
						</figure>
					{/each}

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

	.source-location {
		font-weight: normal;
		font-size: 0.85em;
		color: var(--text-secondary);
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

	.code-snippet {
		margin: 0;
		inline-size: 100%;
		max-inline-size: 100%;
		min-inline-size: 0;

		pre {
			margin: 0;
			contain: inline-size;
			inline-size: 100%;
			max-inline-size: 100%;
			min-inline-size: 0;
			max-block-size: 32em;
			overflow: auto;

			padding: 0.75em 1em;
			border: 1px solid var(--border-color);
			border-radius: 0.5em;
			background-color: var(--background-secondary);

			font-size: 0.8125em;
			line-height: 1.6;
		}

		code {
			display: block;
			inline-size: max-content;
			min-inline-size: 100%;

			font-family:
				ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
				'Courier New', monospace;
		}

		.row {
			display: flex;
			white-space: pre;
		}

		.row.line.highlighted {
			inline-size: calc(100% + 2em);
			margin-inline: -1em;
			padding-inline: 1em;
			background-color: var(--background-tertiary);
		}

		.row.gap {
			justify-content: center;

			.line-number {
				min-inline-size: 0;
				margin-inline-end: 0;
			}

			.line-content {
				display: none;
			}
		}

		.line-number {
			flex-shrink: 0;
			min-inline-size: 4ch;
			margin-inline-end: 1.25em;

			text-align: end;
			color: var(--text-secondary);
			user-select: none;
		}

		.line-content {
			flex: 1;
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
