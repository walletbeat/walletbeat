<script lang="ts">
	import type { Eip, EipNumber } from '@/schema/eips'
	import { EipPrefix, eipEthereumDotOrgUrl, eipShortLabel, eipStatusLabel } from '@/schema/eips'
	import { eips as eipsRecord } from '@/data/eips'
	import { ratedSoftwareWallets } from '@/data/software-wallets'
	import { isSupported } from '@/schema/features/support'
	import { walletEipSupport } from '@/schema/eip-support'
	import { getVariants } from '@/schema/variants'
	import { getVariantResolvedWallet } from '@/schema/wallet'
	import { setItems } from '@/types/utils/non-empty'
	import Typography from '@/components/Typography.svelte'
	import { markdown } from '@/types/content'

	const eips: Eip[] = Object.values(eipsRecord)

	type FilterPrefix = EipPrefix | 'ALL'
	let activeFilter = $state<FilterPrefix>('ALL')

	const filters: { value: FilterPrefix; label: string }[] = [
		{ value: 'ALL', label: 'All' },
		{ value: EipPrefix.EIP, label: 'EIPs' },
		{ value: EipPrefix.ERC, label: 'ERCs' },
	]

	const filtered = $derived(
		activeFilter === 'ALL' ? eips : eips.filter(eip => eip.prefix === activeFilter),
	)

	type SupportState = 'supported' | 'unsupported'

	type WalletSupportEntry = {
		id: string
		displayName: string
		iconExtension: 'png' | 'svg'
		state: SupportState
		walletUrl: string
	}

	/**
	 * For a given EIP, determine each wallet's support state by consuming the
	 * shared walletEipSupport() building block. Wallets for which the EIP is not
	 * applicable or not yet assessed (across all variants) are omitted.
	 */
	function walletSupportForEip(eipNumber: EipNumber): WalletSupportEntry[] {
		const results: WalletSupportEntry[] = []

		for (const wallet of Object.values(ratedSoftwareWallets)) {
			let anySupported = false
			let anyAssessed = false

			for (const variant of setItems(getVariants(wallet.variants))) {
				const resolved = getVariantResolvedWallet(wallet, variant)

				if (resolved === null) {
					continue
				}

				const support = walletEipSupport(resolved.features)[eipNumber]

				if (support === 'NOT_APPLICABLE' || support === 'UNKNOWN') {
					continue
				}

				anyAssessed = true

				if (isSupported(support)) {
					anySupported = true
				}
			}

			if (!anyAssessed) {
				continue
			}

			results.push({
				id: wallet.metadata.id,
				displayName: wallet.metadata.displayName,
				iconExtension: wallet.metadata.iconExtension,
				state: anySupported ? 'supported' : 'unsupported',
				walletUrl: `/${wallet.metadata.id}/`,
			})
		}

		return results.sort((a, b) => {
			if (a.state !== b.state) {
				return a.state === 'supported' ? -1 : 1
			}

			return a.displayName.localeCompare(b.displayName)
		})
	}
</script>

<div class="filters">
	{#each filters as filter (filter.value)}
		<button
			class="filter-pill"
			class:filter-pill--active={activeFilter === filter.value}
			onclick={() => (activeFilter = filter.value)}
		>
			{filter.label}
		</button>
	{/each}
	<span class="filter-count">{filtered.length} standards</span>
</div>

<div class="eip-list">
	{#each filtered as eip (eip.number)}
		<div data-card='secondary padding-0 radius-4'>
			<details>
				<summary>
					<span class="eip-summary">
						<span class="eip-summary__label">{eipShortLabel(eip)}</span>
						<span class="eip-summary__name">{eip.friendlyName}</span>
					</span>
					<span class="eip-status" data-status={eip.status}>{eipStatusLabel[eip.status]}</span>
					<span class="eip-chevron" aria-hidden="true"></span>
				</summary>

				<div class="eip-detail">
					<section class="eip-detail__section">
						<h3>Summary</h3>
						<Typography content={markdown(eip.summaryMarkdown)} />
					</section>

					<section class="eip-detail__section">
						<h3>Why it matters for wallets</h3>
						<Typography content={markdown(eip.whyItMattersMarkdown)} />
					</section>

					{#if eip.noteMarkdown}
						<section class="eip-detail__section">
							<h3>Notes</h3>
							<Typography content={markdown(eip.noteMarkdown)} />
						</section>
					{/if}

					{#key eip.number}
						{@const walletSupport = walletSupportForEip(eip.number)}
						{@const supported = walletSupport.filter(w => w.state === 'supported')}
						{@const unsupported = walletSupport.filter(w => w.state === 'unsupported')}

						{#if walletSupport.length > 0}
							<section class="eip-detail__section">
								<h3>Wallet implementation</h3>

								{#if supported.length > 0}
									<div class="wallet-group">
										<span class="wallet-group__label wallet-group__label--supported">Supports</span>
										<div class="wallet-icons">
											{#each supported as w (w.id)}
												<a href={w.walletUrl} class="wallet-icon" title={w.displayName}>
													<img src="/images/wallets/{w.id}.{w.iconExtension}" alt={w.displayName} />
												</a>
											{/each}
										</div>
									</div>
								{/if}

								{#if unsupported.length > 0}
									<div class="wallet-group">
										<span class="wallet-group__label wallet-group__label--unsupported">
											Not supported
										</span>
										<div class="wallet-icons">
											{#each unsupported as w (w.id)}
												<a
													href={w.walletUrl}
													class="wallet-icon wallet-icon--fail"
													title={w.displayName}
												>
													<img src="/images/wallets/{w.id}.{w.iconExtension}" alt={w.displayName} />
												</a>
											{/each}
										</div>
									</div>
								{/if}
							</section>
						{/if}
					{/key}

					<div class="eip-detail__links">
						<a class="eip-detail__page-link" href="/wallet-eips/{eip.number}/">
							View wallet support →
						</a>
						<a
							class="eip-detail__spec-link"
							href={eipEthereumDotOrgUrl(eip)}
							target="_blank"
							rel="noopener noreferrer"
						>
							Read full spec ↗
						</a>
					</div>
				</div>
			</details>
		</div>
	{/each}
</div>

{#if filtered.length === 0}
	<p class="empty">No standards match the current filter.</p>
{/if}

<style>
	.filters {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.filter-pill {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0.35rem 0.9rem;
		border-radius: 99px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;

		&:hover {
			border-color: var(--accent);
		}

		&--active {
			background: color-mix(in srgb, var(--accent) 15%, transparent);
			border-color: var(--accent);
			color: var(--accent);
		}
	}

	.filter-count {
		margin-left: auto;
		font-size: 0.8rem;
		color: var(--text-secondary);
		opacity: 0.6;
	}

	.eip-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	details {
		summary {
			display: flex;
			align-items: center;
			gap: 1rem;
			padding: 1rem 1.25rem;
			cursor: pointer;
			list-style: none;
			user-select: none;

			&::-webkit-details-marker {
				display: none;
			}
		}
	}

	.eip-summary {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex: 1;
		min-width: 0;
	}

	.eip-summary__label {
		font-family: var(--fontFamily-spMonorium);
		font-weight: 600;
		color: var(--accent);
		white-space: nowrap;
	}

	.eip-summary__name {
		font-size: 1.05rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.eip-status {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2em 0.6em;
		border-radius: 99px;
		white-space: nowrap;

		&[data-status='FINAL'] {
			background: color-mix(in srgb, #4ade80 15%, transparent);
			color: #4ade80;
		}

		&[data-status='DRAFT'] {
			background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
			color: var(--text-secondary);
		}

		&[data-status='REVIEW'] {
			background: color-mix(in srgb, #a78bfa 15%, transparent);
			color: #a78bfa;
		}

		&[data-status='LIVING'] {
			background: color-mix(in srgb, #38bdf8 15%, transparent);
			color: #38bdf8;
		}

		&[data-status='LAST_CALL'] {
			background: color-mix(in srgb, #facc15 15%, transparent);
			color: #facc15;
		}
	}

	.eip-chevron {
		width: 0.6rem;
		height: 0.6rem;
		border-right: 2px solid var(--text-secondary);
		border-bottom: 2px solid var(--text-secondary);
		transform: rotate(-45deg);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	details[open] .eip-chevron {
		transform: rotate(45deg);
	}

	.eip-detail {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 0 1.25rem 1.5rem;
	}

	.eip-detail__section {
		h3 {
			font-size: 0.78rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: var(--accent);
			margin: 0 0 0.5rem;
		}

		:global(p) {
			margin: 0;
			font-size: 0.92rem;
			line-height: 1.65;
			color: var(--text-secondary);
		}
	}

	.wallet-group {
		display: flex;
		align-items: center;
		gap: 1rem;

		& + & {
			margin-top: 0.75rem;
		}
	}

	.wallet-group__label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		width: 6.5rem;
		flex-shrink: 0;

		&--supported {
			color: #4ade80;
		}

		&--unsupported {
			color: var(--text-secondary);
			opacity: 0.6;
		}
	}

	.wallet-icons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.wallet-icon {
		display: block;
		width: 1.9rem;
		height: 1.9rem;

		img {
			width: 100%;
			height: 100%;
			border-radius: 0.4rem;
		}

		&--fail img {
			filter: grayscale(100%);
			opacity: 0.4;
		}
	}

	.eip-detail__links {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	.eip-detail__page-link {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--accent);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.eip-detail__spec-link {
		font-size: 0.82rem;
		color: var(--text-secondary);
		text-decoration: none;

		&:hover {
			color: var(--accent);
		}
	}

	.empty {
		color: var(--text-secondary);
		text-align: center;
		padding: 2rem;
	}
</style>
