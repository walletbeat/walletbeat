<script lang="ts">
	// Types/constants
	import { softwareWalletLadder } from '@/schema/stages/software-wallet-stages'
	import { wbIconEmojiSequences } from '@/styles/wbicons'
	import { isTypographicContent } from '@/types/content'
	import { stageToColor } from '@/utils/colors'
	import { attributesById, getCriterionAttributeId } from '@/utils/stage-attributes'

	// Components
	import Typography from '@/components/Typography.svelte'
</script>


<div
	class="container"
>
	<article
		data-sticky-container
		data-sticky-breadcrumb="scope root"
		style:--stickyBreadcrumb-itemInlineTimeline="--breadcrumb-root-item-inline"
		style:--stickyBreadcrumb-itemBlockTimeline="--breadcrumb-root-item-block"
		style:--stickyBreadcrumb-entryTimeline="--breadcrumb-root-entry"
		data-column="gap-8"
	>
		<header
			id="top"
			data-sticky-breadcrumb="position"
			data-sticky="block block-start backdrop-after backdrop-stuck"
			data-column="gap-4"
			data-scroll-item="inline-detached"
		>
			<div data-row data-sticky="block block-start backdrop-self backdrop-always">
				<h1 data-sticky-breadcrumb="source">
					<a data-link="camouflaged" data-sticky-breadcrumb="item" href="#top">Wallet Stages</a>
				</h1>
			</div>
			<p class="subtitle" data-sticky-breadcrumb="support">
				<span>
					Stages describe the milestones Ethereum wallets should work toward. Each stage builds
					on the previous, forming a roadmap for wallet teams to follow.
				</span>
			</p>
		</header>

		<div data-column="gap-8">
		{#each softwareWalletLadder.stages as stage, index (stage.id)}
			{@const stageColor = stageToColor(index, softwareWalletLadder.stages.length)}

			<section
				id={stage.id}
				data-sticky-container
				data-sticky-breadcrumb="scope"
				style:--stickyBreadcrumb-entryTimeline={`--stages-page-stage-${index}-entry`}
			>
				<header
					data-sticky="block block-start backdrop-before backdrop-stuck"
					data-sticky-breadcrumb="position"
					data-row
					data-scroll-item="inline-detached"
				>
					<h2 data-row="gap-3" data-sticky-breadcrumb="source">
						<a
							data-link="camouflaged"
							data-row="gap-3"
							data-sticky-breadcrumb="item"
							href={`#${stage.id}`}
						>
							<data
								data-badge="medium"
								value={`STAGE_${index}`}
								style:--accent={stageColor}
							>
								<strong>{stage.label}</strong>
							</data>
							{stage.name}
						</a>
					</h2>
				</header>

				<div
					data-scroll-item="inline-detached padding-match-end"
					data-column="gap-5"
					style:--accent={stageColor}
				>
					{#if isTypographicContent(stage.description)}
						<p class="stage-description">
							<Typography content={stage.description} />
						</p>
					{/if}

					{#each stage.criteriaGroups as criteriaGroup (criteriaGroup.id)}
						<details
							open
							data-card="padding-5 radius-4"
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
									data-card="padding-4"
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
				<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
				<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
			</section>
		{/each}
		</div>
		<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
		<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
	</article>
</div>


<style>
	.container {
		> article[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 58rem;
			--scrollItem-inlineDetached-paddingStart: 2rem;
			--scrollItem-inlineDetached-maxPaddingMatchStart: 5rem;
			--scrollItem-inlineDetached-paddingEnd: 2rem;
			--scrollItem-inlineDetached-maxPaddingMatchEnd: 5rem;
		}

		line-height: 1.6;

		article {
			padding-block-end: 4rem;
			display: grid;
		}
	}

	[data-sticky-breadcrumb~="root"] {
		--stickyBreadcrumb-scale: calc(1.5rem / 2.25rem);
		--stickyBreadcrumb-insetBlockStart: var(--navigation-mobile-blockSize);
		--stickyBreadcrumb-minBlockSize: 2.4rem;
		--stickyBreadcrumb-nativeBlockSize: var(--navigation-mobile-blockSize);
	}

	section[data-sticky-breadcrumb~="scope"] {
		--stickyBreadcrumb-forceRow: 1;
		--stickyBreadcrumb-scale: calc(sqrt(1.5rem * 1rem) / 1.3rem);
		--stickyBreadcrumb-paddingBlock: calc(0.5rem * sqrt(sqrt(1.5rem * 1rem) / 1.5rem));
		--stickyBreadcrumb-sourcePaddingBlock: 0.75rem;
		--stickyBreadcrumb-nativeBlockSize: calc(var(--navigation-mobile-blockSize) * 1.3rem / 2.25rem);
	}

	h1 {
		font-size: 2.25rem;
	}

	h2 {
		font-size: 1.3rem;
	}

	section > header {
		--sticky-backgroundColor: var(--background-primary);
		--sticky-backdropFilter: none;

		margin-bottom: 1.25rem;
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
		font-weight: normal;
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

	details {
		&[data-card] {
			--card-backgroundColor: color-mix(in srgb, var(--accent) 5%, var(--background-primary));
		}
	}

	li {
		list-style: none;

		strong {
			display: block;
		}

		.criterion-rationale {
			display: block;
			margin-top: 0.2rem;
		}
	}
</style>
