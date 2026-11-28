<script lang="ts">
	import {
		donationAssets,
		type DonationsSnapshot,
		type DonorTotal,
		formatAssetAmount,
		formatUsd,
		rankDonors,
	} from '@/lib/donations'
	import type { Erc55Address } from '@/types/utils/ethereum-address'
	import Table, { type Column, ColumnAlignment, SortDirection } from '@/components/Table.svelte'

	let {
		snapshot,
		excludedSenders,
	}: {
		snapshot: DonationsSnapshot
		excludedSenders: ReadonlySet<Erc55Address>
	} = $props()

	interface DonorRow {
		rank: number
		donor: DonorTotal
	}

	const donors = $derived(rankDonors(snapshot.transfers, excludedSenders))
	const totalRaised = $derived(donors.reduce((sum, donor) => sum + donor.usdValue, 0n))
	const donationCount = $derived(donors.reduce((sum, donor) => sum + donor.donationCount, 0))
	const donorRows = $derived(donors.map((donor, index): DonorRow => ({ rank: index + 1, donor })))

	function donorLabel(address: `0x${string}`): string {
		return snapshot.ensNames[address] ?? `${address.slice(0, 6)}…${address.slice(-4)}`
	}

	function assetBreakdown(amounts: Record<string, bigint>): string {
		return donationAssets.items
			.filter(asset => amounts[asset] > 0n)
			.map(asset => `${formatAssetAmount(asset, amounts[asset])} ${asset}`)
			.join(' + ')
	}
</script>


<div class="top-donors" data-column="gap-6">
	<div class="stats">
		<div class="stat" data-card="padding-5" data-column="gap-1">
			<span class="stat-label">Donors</span>
			<strong class="stat-value">{donors.length}</strong>
		</div>
		<div class="stat" data-card="padding-5" data-column="gap-1">
			<span class="stat-label">Raised from donors</span>
			<strong class="stat-value">{formatUsd(totalRaised)}</strong>
		</div>
		<div class="stat" data-card="padding-5" data-column="gap-1">
			<span class="stat-label">Donations</span>
			<strong class="stat-value">{donationCount}</strong>
		</div>
	</div>

	{#if donors.length === 0}
		<p class="muted">No donations yet. Yours could be the first!</p>
	{:else}
		<Table
			class="donors-table"
			pageSize={10}
			rows={donorRows}
			rowId={(row: DonorRow) => row.donor.sender}
			columns={[
				{
					id: 'rank',
					name: '#',
					value: (row: DonorRow) => row.rank,
					sort: { defaultDirection: SortDirection.Ascending },
				},
				{
					id: 'donor',
					name: 'Donor',
					value: (row: DonorRow) => donorLabel(row.donor.sender),
					sort: { defaultDirection: SortDirection.Ascending },
				},
				{
					id: 'donated',
					name: 'Donated',
					value: (row: DonorRow) => assetBreakdown(row.donor.amounts),
				},
				{
					id: 'total',
					name: 'Total (USD)',
					// Ranks follow USD totals and never tie, so sorting by rank keeps tied totals in rank order.
					value: (row: DonorRow) => -row.rank,
					align: ColumnAlignment.End,
					sort: { isDefault: true, defaultDirection: SortDirection.Descending },
				},
			]}
		>
			{#snippet Cell({ row, column, value }: { row: DonorRow; column: Column<DonorRow>; value: unknown })}
				{#if column.id === 'donor'}
					<a
						href={`https://eth.blockscout.com/address/${row.donor.sender}`}
						target="_blank"
						rel="noopener noreferrer"
						title={row.donor.sender}
					>
						{donorLabel(row.donor.sender)}
					</a>
				{:else if column.id === 'total'}
					<span class="numeric">{formatUsd(row.donor.usdValue)}</span>
				{:else if column.id === 'rank'}
					<span class="muted">{row.rank}</span>
				{:else}
					<span class="muted">{value}</span>
				{/if}
			{/snippet}
		</Table>
	{/if}
</div>


<style>
	p {
		margin: 0;
		line-height: 1.6;
	}

	.muted {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 1rem;
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--accent);
	}

	.numeric {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
