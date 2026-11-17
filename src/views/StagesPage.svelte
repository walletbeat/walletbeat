<script lang="ts">
	import { onMount } from 'svelte'

	// Types/constants
	import { softwareWalletLadder } from '@/schema/stages/software-wallet-stages'
	import { wbIconEmojiSequences } from '@/styles/wbicons'
	import { isTypographicContent } from '@/types/content'
	import { stageToColor } from '@/utils/colors'
	import { attributesById, getCriterionAttributeId } from '@/utils/stage-attributes'

	// Components
	import Typography from '@/components/Typography.svelte'

	let article: HTMLElement

	onMount(() => {
		const navigation = window.navigation

		const historyEntryKey = (): unknown => history.state?.walletbeatStagesEntryKey
		const entryKey = () => {
			const fallback = historyEntryKey()

			return navigation?.currentEntry?.key ?? (typeof fallback === 'string' ? fallback : undefined)
		}
		const initialKey = entryKey()

		if (!initialKey) return

		const { pathname, search } = location
		let articleEntryKey = initialKey
		const offsets = new Map<string, [number, number]>()
		const layout = article.closest<HTMLElement>('#layout')
		const storageKey = (key: string) => `walletbeat:stages-scroll:${key}`
		const save = () => {
			if (articleEntryKey === pendingKey || !article.isConnected) return

			const offset: [number, number] = [article.scrollTop, layout?.scrollTop ?? 0]

			offsets.set(articleEntryKey, offset)

			try {
				sessionStorage.setItem(storageKey(articleEntryKey), JSON.stringify(offset))
			} catch {
				// The mounted article still retains its own history.
			}
		}
		const restore = (key: string) => {
			let offset: unknown = offsets.get(key)

			if (offset === undefined) {
				try {
					offset = JSON.parse(sessionStorage.getItem(storageKey(key)) ?? 'null')
				} catch {
					return
				}
			}

			if (!Array.isArray(offset) || offset.length !== 2) return

			const [articleTop, layoutTop]: unknown[] = offset

			if (typeof articleTop !== 'number' || !Number.isFinite(articleTop) ||
				typeof layoutTop !== 'number' || !Number.isFinite(layoutTop)) return

			pendingKey = key
			frame = requestAnimationFrame(() => {
				pendingKey = undefined

				if (!article.isConnected || entryKey() !== key) return

				layout?.scrollTo({ top: layoutTop, behavior: 'instant' })
				article.scrollTo({ top: articleTop, behavior: 'instant' })
			})
		}
		let frame = 0
		let pendingKey: string | undefined
		const listeners = new AbortController()
		const options = { signal: listeners.signal }

		const state: unknown = history.state

		if (navigation?.currentEntry && state && typeof state === 'object' && historyEntryKey() !== initialKey) {
			try {
				history.replaceState({ ...state, walletbeatStagesEntryKey: initialKey }, '')
			} catch {
				// The Navigation entry still identifies this article.
			}
		}

		navigation?.addEventListener('navigate', () => {
			save()
			cancelAnimationFrame(frame)
			pendingKey = undefined
		}, options)
		document.addEventListener('astro:before-swap', save, options)
		window.addEventListener('pagehide', save, options)

		navigation?.addEventListener('currententrychange', event => {
			const entry = navigation?.currentEntry

			if (!entry?.url || !entry.sameDocument || event.from.key !== articleEntryKey) return

			const destination = new URL(entry.url)

			if (destination.pathname !== pathname || destination.search !== search) return

			articleEntryKey = entry.key

			if (event.navigationType === 'traverse') restore(entry.key)
		}, options)


		restore(initialKey)

		return () => {
			listeners.abort()
			cancelAnimationFrame(frame)
		}
	})
</script>


<div
	class="container"
	data-sticky-container
>
	<article
		bind:this={article}
		data-scroll-container="block"
		data-column="gap-8"
	>
		<header
			id="top"
			data-column="gap-4"
			data-scroll-item="inline-detached padding-match-start"
		>
			<h1>Wallet Stages</h1>
			<p class="subtitle">
				Stages describe the milestones Ethereum wallets should work toward. Each stage builds
				on the previous, forming a roadmap for wallet teams to follow.
			</p>
		</header>

		{#each softwareWalletLadder.stages as stage, index (stage.id)}
			{@const stageColor = stageToColor(index, softwareWalletLadder.stages.length)}

			<section id={stage.id}>
				<header
					data-sticky="block backdrop-before backdrop-stuck"
					data-row
					data-scroll-item="inline-detached"
				>
					<a
						data-link="camouflaged"
						href={`#${stage.id}`}
					>
						<h2 data-row="gap-3">
							<data
								data-badge="medium"
								value={`STAGE_${index}`}
								style:--accent={stageColor}
							>
								<strong>{stage.label}</strong>
							</data>
							{stage.name}
						</h2>
					</a>
				</header>

				<div
					data-scroll-item="inline-detached padding-match-end"
					data-column="gap-5"
					style:--accent={stageColor}
				>
					{#if isTypographicContent(stage.description)}
						<div class="stage-description">
							<Typography content={stage.description} />
						</div>
					{/if}

					<div data-card="radius-6 padding-6">
						{#each stage.criteriaGroups as criteriaGroup (criteriaGroup.id)}
							<details
								open
							>
								<summary>
									<div data-row="wrap">
										<h3
											class="criteria-group-title"
											data-row-item="flexible basis-2"
										>
											{#if isTypographicContent(criteriaGroup.description)}
												<Typography content={criteriaGroup.description} />
											{:else}
												{criteriaGroup.id}
											{/if}
										</h3>
									</div>
								</summary>

								<div>
									<ul
										class="criteria-list"
										data-list="gap-4"
									>
										{#each criteriaGroup.criteria as criterion (criterion.id)}
											{@const attributeId = getCriterionAttributeId(criterion)}
											{@const attribute = attributeId ? (attributesById.get(attributeId) ?? null) : null}

											<li
												data-list-item-marker={attribute?.icon ? wbIconEmojiSequences[attribute.icon] : undefined}
											>
												<div data-column="gap-1">
													<strong>{criterion.displayName}</strong>

													<span class="criterion-description">
														{#if isTypographicContent(criterion.description)}
															<Typography content={criterion.description} />
														{:else}
															{criterion.id}
														{/if}
													</span>

													{#if isTypographicContent(criterion.rationale)}
														<span class="criterion-rationale">
															<Typography content={criterion.rationale} />
														</span>
													{/if}
												</div>
											</li>
										{/each}
									</ul>
								</div>
							</details>
						{/each}
					</div>
				</div>
			</section>
		{/each}
	</article>
</div>


<style>
	.container {
		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 58rem;
			--scrollItem-inlineDetached-paddingStart: 2rem;
			--scrollItem-inlineDetached-maxPaddingMatchStart: 5rem;
			--scrollItem-inlineDetached-paddingEnd: 2rem;
			--scrollItem-inlineDetached-maxPaddingMatchEnd: 2rem;
		}

		line-height: 1.6;

		article {
			&[data-scroll-container] {
				overscroll-behavior-block: auto;
				scroll-behavior: auto;
			}

			max-height: 100dvh;
			overflow: auto;
			padding-block-end: 4rem;
			display: grid;
		}
	}

	h1 {
		font-size: 2rem;
	}

	h2 {
		font-size: 1.3rem;
	}

	section > header {
		&[data-sticky] {
			--sticky-backgroundColor: var(--background-primary);
			--sticky-backdropFilter: none;
		}

		padding-block: 0.75rem;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 1rem;
		max-width: 52ch;
		line-height: 1.5;
	}

	.stage-description {
		color: var(--text-secondary);
	}

	.criteria-group-title {
		font-size: 1rem;
		font-weight: 600;

		:global(p) {
			margin: 0;
		}
	}

	.criterion-description {
		color: var(--text-secondary);
	}

	.criterion-rationale {
		color: var(--text-secondary);
		font-size: 0.85em;
	}

	.criteria-list {
		--list-marker-fontFamily: var(--fontFamily-wbicons-simple);
	}

</style>
