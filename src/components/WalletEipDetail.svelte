<script lang="ts">
	import type { Eip, EipNumber } from '@/schema/eips'
	import { eipEthereumDotOrgUrl, eipShortLabel, eipStatusLabel } from '@/schema/eips'
	import { eips as eipsRecord } from '@/data/eips'
	import { ratedSoftwareWallets } from '@/data/software-wallets'
	import { isSupported } from '@/schema/features/support'
	import { walletEipSupport } from '@/schema/eip-support'
	import { getVariants } from '@/schema/variants'
	import { getVariantResolvedWallet } from '@/schema/wallet'
	import { setItems } from '@/types/utils/non-empty'
	import Typography from '@/components/Typography.svelte'
	import { markdown } from '@/types/content'

	type Props = {
		eipNumber: EipNumber
	}

	let { eipNumber }: Props = $props()

	const eip: Eip | undefined = Object.values(eipsRecord).find(e => e.number === eipNumber)

	type SupportState = 'supported' | 'unsupported'

	type WalletSupportEntry = {
		id: string
		displayName: string
		iconExtension: 'png' | 'svg'
		state: SupportState
		walletUrl: string
	}

	function walletSupportForEip(number: EipNumber): WalletSupportEntry[] {
		const results: WalletSupportEntry[] = []

		for (const wallet of Object.values(ratedSoftwareWallets)) {
			let anySupported = false
			let anyAssessed = false

			for (const variant of setItems(getVariants(wallet.variants))) {
				const resolved = getVariantResolvedWallet(wallet, variant)

				if (resolved === null) {
					continue
				}

				const support = walletEipSupport(resolved.features)[number]

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

	const walletSupport = $derived(eip ? walletSupportForEip(eip.number) : [])
	const supported = $derived(walletSupport.filter(w => w.state === 'supported'))
	const unsupported = $derived(walletSupport.filter(w => w.state === 'unsupported'))

	const groups = $derived([
		{ key: 'supported', label: 'Supports', wallets: supported },
		{ key: 'unsupported', label: 'Not supported', wallets: unsupported },
	])
</script>

{#if eip}
	<article class="eip-detail-page">
		<header class="eip-header">
			<div class="eip-header__top">
				<span class="eip-label">{eipShortLabel(eip)}</span>
				<span class="eip-status" data-status={eip.status}>{eipStatusLabel[eip.status]}</span>
			</div>
			<h1>{eip.friendlyName}</h1>
			<p class="eip-formal-title">{eip.formalTitle}</p>
		</header>

		<section class="eip-section">
			<h2>Summary</h2>
			<Typography content={markdown(eip.summaryMarkdown)} />
		</section>

		<section class="eip-section">
			<h2>Why it matters for wallets</h2>
			<Typography content={markdown(eip.whyItMattersMarkdown)} />
		</section>

		{#if eip.noteMarkdown}
			<section class="eip-section">
				<h2>Notes</h2>
				<Typography content={markdown(eip.noteMarkdown)} />
			</section>
		{/if}

		{#if walletSupport.length > 0}
			<section class="eip-section">
				<h2>Wallet implementation</h2>
				<p class="eip-section__subtitle">
					How each tracked wallet implements {eipShortLabel(eip)} today.
				</p>

				<div class="wallet-detail-groups">
					{#each groups as group (group.key)}
						{#if group.wallets.length > 0}
							<div class="wallet-detail-group" data-state={group.key}>
								<div class="wallet-detail-group__header">
									<span class="wallet-detail-group__label">{group.label}</span>
									<span class="wallet-detail-group__count">{group.wallets.length}</span>
								</div>
								<ul class="wallet-detail-list">
									{#each group.wallets as w (w.id)}
										<li>
											<a href={w.walletUrl} class="wallet-row">
												<img
													src="/images/wallets/{w.id}.{w.iconExtension}"
													alt={w.displayName}
													class="wallet-row__icon"
													class:wallet-row__icon--fail={group.key === 'unsupported'}
												/>
												<span class="wallet-row__name">{w.displayName}</span>
											</a>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					{/each}
				</div>
			</section>
		{/if}

		<a
			class="eip-spec-link"
			href={eipEthereumDotOrgUrl(eip)}
			target="_blank"
			rel="noopener noreferrer"
		>
			Read the full specification ↗
		</a>

		<a class="eip-back-link" href="/wallet-eips/">← All wallet EIPs</a>
	</article>
{:else}
	<p class="eip-not-found">EIP not found.</p>
{/if}

<style>
	.eip-detail-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		max-width: 52rem;
	}

	.eip-header__top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.eip-label {
		font-family: var(--fontFamily-spMonorium);
		font-size: 1rem;
		font-weight: 600;
		color: var(--accent);
	}

	.eip-status {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2em 0.6em;
		border-radius: 99px;

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

	.eip-header h1 {
		font-size: 2rem;
		font-weight: 800;
		margin: 0 0 0.25rem;
		line-height: 1.15;
	}

	.eip-formal-title {
		font-size: 1rem;
		color: var(--text-secondary);
		opacity: 0.7;
		margin: 0;
	}

	.eip-section {
		h2 {
			font-size: 0.8rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.07em;
			color: var(--accent);
			margin: 0 0 0.625rem;
		}

		:global(p) {
			margin: 0;
			font-size: 0.95rem;
			color: var(--text-secondary);
			line-height: 1.7;
		}
	}

	.eip-section__subtitle {
		margin: 0 0 1rem !important;
		opacity: 0.8;
	}

	.wallet-detail-groups {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.wallet-detail-group__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.wallet-detail-group__label {
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.wallet-detail-group__count {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.1em 0.5em;
		border-radius: 99px;
		background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
		color: var(--text-secondary);
	}

	.wallet-detail-group[data-state='supported'] .wallet-detail-group__label {
		color: #4ade80;
	}

	.wallet-detail-group[data-state='unsupported'] .wallet-detail-group__label {
		color: var(--text-secondary);
		opacity: 0.6;
	}

	.wallet-detail-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0.5rem;
	}

	.wallet-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		text-decoration: none;
		color: var(--text-primary);
		border: 1px solid transparent;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;

		&:hover {
			border-color: var(--accent);
			background: color-mix(in srgb, var(--accent) 6%, transparent);
		}
	}

	.wallet-row__icon {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		flex-shrink: 0;

		&--fail {
			filter: grayscale(100%);
			opacity: 0.45;
		}
	}

	.wallet-row__name {
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.eip-spec-link,
	.eip-back-link {
		font-size: 0.9rem;
		text-decoration: none;
		color: var(--text-secondary);

		&:hover {
			color: var(--accent);
		}
	}

	.eip-spec-link {
		font-weight: 500;
		color: var(--accent);
		opacity: 0.9;
	}

	.eip-not-found {
		color: var(--text-secondary);
		font-size: 1rem;
	}
</style>
