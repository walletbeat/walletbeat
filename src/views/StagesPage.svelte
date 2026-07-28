<script lang="ts">
	// Types/constants
	import { softwareWalletLadder } from '@/schema/stages/software-wallet-stages'
	import { stageToColor } from '@/utils/colors'
	import { isTypographicContent } from '@/types/content'

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

		{#each softwareWalletLadder.stages as stage, index}
			{@const stageColor = stageToColor(index, softwareWalletLadder.stages.length)}

			<section id={stage.id}>
				<header
					data-sticky="block"
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
						<p class="stage-description">
							<Typography content={stage.description} />
						</p>
					{/if}

					{#each stage.criteriaGroups as criteriaGroup}
						<details
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
									data-card="padding-4"
									data-list="gap-4"
								>
									{#each criteriaGroup.criteria as criterion}
										<li>
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
			--scrollItem-inlineDetached-maxPaddingMatchEnd: 5rem;
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
		margin-bottom: 1.25rem;
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
