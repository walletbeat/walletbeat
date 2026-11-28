<script module lang="ts">
	import type { WalkawayCriterionEvaluation, WalkawayTestResult } from '@/schema/walkaway'
	import type { NonEmptyArray } from '@/types/utils/non-empty'

	/** A wallet listed on the walkaway test page. */
	export type WalkawayPageWallet = {
		id: string
		displayName: string
		href: string
		iconSrc: string
		result: WalkawayTestResult
		criteria: NonEmptyArray<WalkawayCriterionEvaluation<string>>
	}
</script>


<script lang="ts">
	// Types/constants
	import { StageCriterionRating, stageCriterionRatings } from '@/schema/stages'
	import { walkawayTestResults } from '@/schema/walkaway'
	import { softwareWalletWalkawayTest as test } from '@/schema/walkaway/software-wallet-walkaway'
	import { isTypographicContent } from '@/types/content'
	import { countsAndStatusOfEvaluations } from '@/utils/stage-attributes'
	import { walkawayTestResultLabels } from '@/utils/walkaway'


	// Props
	const {
		wallets,
		children,
	}: {
		wallets: WalkawayPageWallet[]

		/** Introduction to the walkaway test. */
		children: Snippet
	} = $props()


	// Derived
	const resultGroups = $derived(
		walkawayTestResults.items.map(result => ({
			result,
			display: walkawayTestResultLabels[result],
			rating: stageCriterionRatings[result],
			wallets: wallets
				.filter(wallet => wallet.result === result)
				.toSorted((a, b) => a.displayName.localeCompare(b.displayName)),
		}))
	)


	// Components
	import type { Snippet } from 'svelte'
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
			<h1>{test.label}</h1>

			<div class="intro">
				{@render children()}
			</div>
		</header>

		<section id="criteria">
			<header
				data-sticky="block backdrop-before backdrop-stuck"
				data-scroll-item="inline-detached"
			>
				<a
					data-link="camouflaged"
					href="#criteria"
				>
					<h2>Criteria</h2>
				</a>
			</header>

			<div data-scroll-item="inline-detached padding-match-end">
				<div
					class="card"
					data-card="radius-6 padding-6"
					data-column="gap-4"
				>
					<p class="secondary">
						Each criterion removes a way in which users depend on the wallet team. Together, they let
						users reach Ethereum through their own node, withdraw their funds from L2s, move their
						account to another wallet, keep it safe from takeover, and rebuild the wallet from its
						source code. A wallet passes the walkaway test only if every variant passes all of
						these criteria.
					</p>

					<ol data-list="gap-4">
						{#each test.criteria as criterion, index (criterion.id)}
							<li
								id={criterion.id}
								data-list-item-marker={`${index + 1}.`}
							>
								<div data-column="gap-1">
									<strong>{criterion.displayName}</strong>

									{#if isTypographicContent(criterion.description)}
										<span class="secondary">
											<Typography content={criterion.description} />
										</span>
									{/if}

									{#if isTypographicContent(criterion.rationale)}
										<span class="secondary rationale">
											<Typography content={criterion.rationale} />
										</span>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				</div>
			</div>
		</section>

		{#each resultGroups as { result, display, rating, wallets } (result)}
			<section id={result.toLowerCase()}>
				<header
					data-sticky="block backdrop-before backdrop-stuck"
					data-scroll-item="inline-detached"
				>
					<a
						data-link="camouflaged"
						href={`#${result.toLowerCase()}`}
					>
						<h2 data-row="gap-3 start">
							<data
								data-badge="medium"
								value={result}
								style:--accent={rating.color}
							>
								<strong>{display.label}</strong>
							</data>
							{wallets.length} {wallets.length === 1 ? 'wallet' : 'wallets'}
						</h2>
					</a>
				</header>

				<div
					data-scroll-item="inline-detached padding-match-end"
					data-column="gap-3"
				>
					{#if wallets.length === 0}
						<p class="secondary">No wallets yet.</p>
					{/if}

					{#each wallets as wallet (wallet.id)}
						{@const { passedCount, totalCount } = countsAndStatusOfEvaluations(wallet.criteria.map(({ evaluation }) => evaluation))}

						<details
							id={`wallet-${wallet.id}`}
							data-card="padding-5 secondary radius-4"
							style:--accent={rating.color}
						>
							<summary>
								<div data-row="wrap">
									<h3
										data-row-item="flexible"
										data-row="start gap-2"
									>
										<img
											src={wallet.iconSrc}
											alt=""
											width="24"
											height="24"
										/>
										{wallet.displayName}
									</h3>

									<div
										data-row-item="wrap-end"
										data-row="gap-2"
									>
										<span>{passedCount}/{totalCount}</span>
										<data
											value={result}
											title={display.title}
										>
											{rating.icon}
										</data>
									</div>
								</div>
							</summary>

							<div data-column="gap-3">
								<ul
									data-card="padding-4"
									data-list="gap-3"
								>
									{#each wallet.criteria as { criterion, evaluation } (criterion.id)}
										{@const ratingMeta = stageCriterionRatings[evaluation.rating]}

										<li
											data-list-item-marker={ratingMeta.icon}
											title={ratingMeta.label}
										>
											<a href={`#${criterion.id}`}>
												<strong>{criterion.displayName}</strong>
											</a>
											<span class="secondary">
												—
												{#if evaluation.rating !== StageCriterionRating.UNRATED}
													<Typography
														content={evaluation.explanation}
														strings={{ WALLET_NAME: wallet.displayName }}
													/>
												{:else}
													Not enough data to rate this criterion.
												{/if}
											</span>
										</li>
									{/each}
								</ul>

								<a
									class="wallet-link"
									href={wallet.href}
								>
									View {wallet.displayName}'s full rating →
								</a>
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

	h3 {
		font-size: 1rem;

		img {
			border-radius: 0.25rem;
		}
	}

	section > header {
		--sticky-backgroundColor: var(--background-primary);
		--sticky-backdropFilter: none;

		padding-block: 0.75rem;
	}

	.intro {
		display: grid;
		gap: 0.75rem;
		color: var(--text-secondary);
		max-width: 65ch;
		line-height: 1.6;

		:global(p) {
			margin: 0;
		}

		:global(strong) {
			color: var(--text-primary);
		}
	}

	.card {
		border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
		box-shadow:
			0 1px 2px rgb(19 10 43 / 0.04),
			0 12px 32px -16px rgb(19 10 43 / 0.12);
	}

	.secondary {
		color: var(--text-secondary);

		:global(p) {
			display: inline;
			margin: 0;
		}
	}

	.rationale {
		font-size: 0.85em;
	}

	data[value='UNRATED'][data-badge] {
		--badge-backdropFilter: var(--rating-unrated-backdropFilter);

		border-style: dashed;
	}

	.wallet-link {
		font-size: 0.85em;
		align-self: end;
	}
</style>
