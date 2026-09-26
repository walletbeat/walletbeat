<script lang="ts">
	// Types/constants
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import {
		WalletTypeFor7702,
		WalletTypeFor7702SortPriority,
		type Eip7702Row,
	} from '@/schema/eip-support'
	import { Rating } from '@/schema/attributes'


	// Props
	let {
		title,
		rows,
	}: {
		title?: string
		rows: Eip7702Row[]
	} = $props()


	// State
	let activeFilters: Filters<Eip7702Row>['$$prop_def']['activeFilters'] = $state(
		new Set()
	)

	let filteredRows: Eip7702Row[] = $state(
		[]
	)


	// Actions
	let toggleFilterById: Filters<Eip7702Row>['$$prop_def']['toggleFilterById'] = $state(
		undefined
	)

	let toggleFilter: Filters<Eip7702Row>['$$prop_def']['toggleFilter'] = $state(
		undefined
	)


	// Components
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
	import KeyIcon from 'lucide-static/icons/key.svg?raw'

	import Filters from '@/components/Filters.svelte'
	import Table, { type Column, SortDirection } from '@/components/Table.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import EipDetails from '@/views/EipDetails.svelte'
</script>


<section
	data-sticky-container
	data-column="gap-6"
>
	<header
		data-row="wrap"
		data-scroll-item='inline-detached padding-match-start'
	>
		{#if title}
			<h2>{title}</h2>
		{/if}

		<Filters
			items={rows}
			filterGroups={[
				{
					id: 'accountType',
					label: 'Account Type',
					displayType: 'group',
					exclusive: false,
					filters: [
						{
							id: 'accountType-eip7702',
							label: 'EIP-7702',
							icon: KeyIcon,
							filterFunction: (row: Eip7702Row) =>
									row.type === WalletTypeFor7702.EIP7702,
						},
						{
							id: 'accountType-erc4337',
							label: 'ERC-4337',
							icon: KeyIcon,
							filterFunction: (row: Eip7702Row) =>
								row.type === WalletTypeFor7702.EIP4337,
						},
						{
							id: 'accountType-eoa',
							label: 'EOA',
							icon: KeyIcon,
							filterFunction: (row: Eip7702Row) =>
								row.type === WalletTypeFor7702.NON_7702_EOA,
						},
					],
				},
			]}
			bind:activeFilters
			bind:filteredItems={filteredRows}
			bind:toggleFilter
			bind:toggleFilterById
		/>
	</header>

	<div data-scroll-item="inline-attached underflow-center overflow-start">
		<Table
			rows={filteredRows}
			rowId={(row: Eip7702Row) => row.id}

			columns={[
				{
					id: 'wallet',
					name: 'Wallet',
					value: (row: Eip7702Row) => row.displayName,
					isSticky: true,
					sort: {
						defaultDirection: SortDirection.Ascending,
					},
				},
				{
					id: 'type',
					name: 'Type',
					value: (row: Eip7702Row) => WalletTypeFor7702SortPriority[row.type],
					sort: {
						isDefault: true,
						defaultDirection: SortDirection.Ascending,
					},
				},
				{
					id: 'contract',
					name: 'Contract',
					value: (row: Eip7702Row) => row.contract,
				},
				{
					id: 'batching',
					name: 'Batching',
					value: (row: Eip7702Row) => row.batching,
				},
			]}
		>
			{#snippet Cell({ row, column, value }: { row: Eip7702Row; column: Column<Eip7702Row>; value: unknown })}
				{#if column.id === 'wallet'}
					<div class="wallet-info" data-row>
						<span class="row-count" data-row="center"></span>

						<span class="wallet-icon" data-icon="shadow">
							<img
								src={`/images/wallets/${row.id}.svg`}
								alt={row.displayName}
								onerror={event => {
									if (event.currentTarget instanceof HTMLImageElement)
										event.currentTarget.src = '/images/wallets/default.svg'
								}}
							/>
						</span>

						<div class="name">
							<h3>
								<a
									href={row.url}
								>
									{row.displayName}
								</a>
							</h3>
						</div>
					</div>

				{:else if column.id === 'type'}
					{@const typeFor7702 = row.type}

					{#if typeFor7702 === WalletTypeFor7702.EIP7702}
						<Tooltip
							placement="inline-end"
						>
							<button
								data-tag="eip"
								aria-label="Filter by EIP-7702"
								onclick={event => {
									event.stopPropagation()
									toggleFilterById!('accountType-eip7702')
								}}
							>
								EIP-7702
							</button>

							{#snippet TooltipContent()}
								<EipDetails eip={eip7702} />
							{/snippet}
						</Tooltip>
					{:else}
						{#if typeFor7702 === WalletTypeFor7702.EIP4337}
							<Tooltip
								placement="inline-end"
							>
								<button
									data-tag="eip"
									aria-label="Filter by ERC-4337"
									onclick={event => {
										event.stopPropagation()
										toggleFilterById!('accountType-erc4337')
									}}
								>
									ERC-4337
								</button>

								{#snippet TooltipContent()}
									<EipDetails eip={erc4337} />
								{/snippet}
							</Tooltip>
						{:else}
							{#if typeFor7702 === WalletTypeFor7702.NON_7702_EOA}
								<button
									data-tag="eoa"
									aria-label="Filter by EOA"
									onclick={event => {
										event.stopPropagation()
										toggleFilterById!('accountType-eoa')
									}}
								>
									EOA
								</button>
							{/if}
						{/if}

						<small class="muted-text">(non-7702)</small>
					{/if}

				{:else if column.id === 'contract'}
					{@const contract = row.contract}

					{#if contract === undefined}
						<span class="muted-text">–</span>
					{:else if contract === 'UNKNOWN'}
						<span class="muted-text">Unknown</span>
					{:else}
						{@const getContractUrl = (contractAddress: string, anchor?: string) =>
							`https://etherscan.io/address/${contractAddress}${anchor ? `#${anchor}` : ''}`
						}

						<div class="contract-info">
							<strong>
								<a
									href={getContractUrl(contract.address)}
									target="_blank"
									rel="noopener noreferrer"
								>
									{contract.name}
								</a>
							</strong>
						</div>

						<small>
							{#if contract.sourceAvailable}
								<a
									href={contract.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="source-link"
								>
									Source code
									<span>{@html ExternalLinkIcon}</span>
								</a>
							{:else}
								<span class="muted-text">Source unavailable</span>
							{/if}
						</small>
					{/if}

				{:else if column.id === 'batching'}
					{@const batchingRating = row.batching}

					{#if batchingRating === Rating.PASS}
						✅
					{:else if batchingRating === Rating.FAIL}
						❌
					{:else}
						<span class="muted-text">–</span>
					{/if}

				{:else}
					{value}
				{/if}
			{/snippet}
		</Table>
	</div>
</section>


<style>
	section {
		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 60.5rem;
			--scrollItem-inlineDetached-paddingStart: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
			--scrollItem-inlineDetached-paddingEnd: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
		}
	}

	.wallet-info {
		gap: 0.85em;
		padding: 0.5em 0;

		.row-count {
			width: 1.25em;
			height: 1.25em;

			font-weight: 600;
			color: var(--text-secondary);

			&::before {
				content: counter(TableRowCount);
			}

			:global([data-disabled]) &::before {
				content: '–';
			}
		}

		.wallet-icon {
			--icon-size: 2.25em;
		}

		.name {
			font-size: 0.85em;

			h3 {
				font-weight: 600;
			}
		}
	}

	[data-tag] {
		&:is(button) {
			display: inline-flex;
		}
	}

	.muted-text {
		color: var(--text-secondary);
	}
</style>
