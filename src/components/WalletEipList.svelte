<script lang="ts">
	import type { Eip } from '@/schema/eips'
	import { EipPrefix, eipEthereumDotOrgUrl, eipShortLabel, eipStatusLabel } from '@/schema/eips'
	import Typography from '@/components/Typography.svelte'
	import { markdown } from '@/types/content'

	type Props = {
		eips: Eip[]
	}

	let { eips }: Props = $props()

	// Filter state
	type FilterPrefix = EipPrefix | 'ALL'
	let activeFilter = $state<FilterPrefix>('ALL')

	const filters: { value: FilterPrefix; label: string }[] = [
		{ value: 'ALL', label: 'All' },
		{ value: EipPrefix.EIP, label: 'EIPs' },
		{ value: EipPrefix.ERC, label: 'ERCs' },
	]

	const filtered = $derived(
		activeFilter === 'ALL' ? eips : eips.filter((e) => e.prefix === activeFilter),
	)

	// Accordion open state per EIP
	let openStates = $state<Record<string, boolean>>(
		Object.fromEntries(eips.map((e) => [e.number, false])),
	)
</script>

<!-- Filter pills -->
<nav class="filter-nav" aria-label="Filter EIPs">
	{#each filters as f (f.value)}
		<button
			class="filter-pill"
			class:active={activeFilter === f.value}
			onclick={() => (activeFilter = f.value)}
		>
			{f.label}
		</button>
	{/each}
	<span class="filter-count">{filtered.length} standard{filtered.length === 1 ? '' : 's'}</span>
</nav>

<!-- EIP list -->
<div class="eip-list">
	{#each filtered as eip (eip.number)}
		<div class="eip-item">
			<details
				bind:open={openStates[eip.number]}
				data-card="secondary padding-0 radius-4"
				class:open={openStates[eip.number]}
			>
				<summary>
					<div class="eip-row">
						<span class="eip-label">{eipShortLabel(eip)}</span>
						<span class="eip-name">{eip.friendlyName}</span>
						<span class="eip-status" data-status={eip.status}>
							{eipStatusLabel[eip.status]}
						</span>
					</div>
				</summary>

				<div class="eip-detail">
					<section class="eip-detail__section">
						<h4>Summary</h4>
						<Typography content={markdown(eip.summaryMarkdown)} />
					</section>

					<section class="eip-detail__section">
						<h4>Why it matters for wallets</h4>
						<Typography content={markdown(eip.whyItMattersMarkdown)} />
					</section>

					{#if eip.noteMarkdown}
						<section class="eip-detail__section">
							<h4>Notes</h4>
							<Typography content={markdown(eip.noteMarkdown)} />
						</section>
					{/if}

					<a
						class="eip-detail__spec-link"
						href={eipEthereumDotOrgUrl(eip)}
						target="_blank"
						rel="noopener noreferrer"
					>
						Read full spec ↗
					</a>
				</div>
			</details>
		</div>
	{/each}
</div>

{#if filtered.length === 0}
	<p class="empty">No standards match the current filter.</p>
{/if}

<style>
	/* Filter nav  */
	.filter-nav {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.filter-pill {
		font-size: 0.82rem;
		font-weight: 500;
		padding: 0.35em 0.9em;
		border: 1px solid var(--border);
		border-radius: 99px;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;

		&:hover {
			border-color: var(--accent);
			color: var(--accent);
		}

		&.active {
			border-color: var(--accent);
			background: color-mix(in srgb, var(--accent) 12%, transparent);
			color: var(--accent);
		}
	}

	.filter-count {
		margin-left: auto;
		font-size: 0.8rem;
		color: var(--text-secondary);
		opacity: 0.6;
	}

	/* EIP list */
	.eip-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.eip-item {
		details {
			overflow: hidden;
			transition: border-color 0.15s ease;
			border: 1px solid transparent;
			padding: 0.875rem 1rem 0.875rem 1.5rem;

			&.open {
				border-color: var(--accent);
				padding-bottom: 1.25rem;
			}

			summary {
				list-style: none;
				cursor: pointer;
				padding: 0;
				user-select: none;

				&::-webkit-details-marker {
					display: none;
				}

				&::after {
					content: '›';
					font-size: 1.1rem;
					color: var(--text-secondary);
					opacity: 0.5;
					transition: transform 0.2s ease;
					flex-shrink: 0;
				}
			}

			&.open summary::after {
				transform: rotate(90deg);
			}
		}
	}

	/* Row (summary line) */
	.eip-row {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
	}

	.eip-label {
		font-family: var(--fontFamily-spMonorium);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent);
		min-width: 5.5rem;
		flex-shrink: 0;
	}

	.eip-name {
		flex: 1;
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	.eip-status {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2em 0.6em;
		border-radius: 99px;
		flex-shrink: 0;

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

	/* Expanded detail */
	.eip-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		margin-top: 0.875rem;
	}

	.eip-detail__section {
		h4 {
			font-size: 0.75rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.07em;
			color: var(--accent);
			margin: 0 0 0.375rem;
		}

		:global(p) {
			margin: 0;
			font-size: 0.9rem;
			color: var(--text-secondary);
			line-height: 1.65;
		}
	}

	.eip-detail__spec-link {
		align-self: flex-start;
		font-size: 0.82rem;
		color: var(--text-secondary);
		text-decoration: none;
		opacity: 0.7;

		&:hover {
			opacity: 1;
		}
	}

	/* Empty state */
	.empty {
		font-size: 0.9rem;
		color: var(--text-secondary);
		opacity: 0.6;
		padding: 2rem 0;
		text-align: center;
	}
</style>
