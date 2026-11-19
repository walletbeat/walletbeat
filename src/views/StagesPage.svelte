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
	data-sticky-container
>
	<article
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
					data-column="gap-0"
					style:--accent={stageColor}
				>
					<div
						class="stage-card"
						data-card="radius-6 padding-6"
						data-column="gap-0"
					>
						{#if isTypographicContent(stage.description)}
							<div class="stage-description">
								<Typography content={stage.description} />
							</div>
						{/if}

						{#each stage.criteriaGroups as criteriaGroup (criteriaGroup.id)}
							<details
								class="criteria-group"
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
		--sticky-backgroundColor: var(--background-primary);
		--sticky-backdropFilter: none;

		padding-block: 0.75rem;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 1rem;
		max-width: 52ch;
		line-height: 1.5;
	}

	.stage-card {
		border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
		box-shadow:
			0 1px 2px rgb(19 10 43 / 0.04),
			0 12px 32px -16px rgb(19 10 43 / 0.12);
	}

	.stage-description {
		padding-block-end: 1.25rem;
		color: var(--text-secondary);

		:global(p) {
			margin: 0;
		}
	}

	/* Criteria groups are divided rows inside the stage card, not cards of their own. */
	.criteria-group {
		border-block-start: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);

		> summary {
			padding-block: 1rem;
		}

		> :not(summary) {
			padding-block-end: 1.25rem;
		}

		/* The card's own padding closes the last group. */
		&:last-child > :not(summary) {
			padding-block-end: 0;
		}
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
