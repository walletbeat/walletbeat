<script module lang="ts">
	const WalletTypeFor7702 = {
		EIP7702: 'EIP7702',
		NON_7702_SMART_WALLET: 'NON_7702_SMART_WALLET',
		NON_7702_EOA: 'NON_7702_EOA',
		OTHER: 'OTHER',
	} as const

	type WalletTypeFor7702 = (typeof WalletTypeFor7702)[keyof typeof WalletTypeFor7702]
</script>


<script lang="ts">
	// Types/constants
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { ratedSoftwareWallets } from '@/data/software-wallets'
	import type { EVMAddress, SmartWalletContract } from '@/schema/contracts'
	import { AccountType, isAccountTypeSupported } from '@/schema/features/account-support'
	import { refs } from '@/schema/reference'
	import { isLabeledUrl } from '@/schema/url'
	import type { Variant } from '@/schema/variants'
	import {
		getVariantResolvedWallet,
		getWalletVariants,
		type RatedWallet,
		walletSupportedAccountTypes,
	} from '@/schema/wallet'
	import { isNonEmptyArray, nonEmptyGet, setContains, setItems } from '@/types/utils/non-empty'
	import type { Column } from '@/lib/DataTable.svelte'
	import type { Filter } from '@/ui/molecules/Filters.svelte'

	// Functions
	const walletContractUrl = (contractAddress: EVMAddress, anchor?: string): string =>
		`https://etherscan.io/address/${contractAddress}` +
		(anchor !== undefined && anchor !== '' ? `#${anchor}` : '')

	const getWalletTypeFor7702 = (wallet: RatedWallet) => {
		const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
		const hasErc4337 =
			accountTypes !== null && setContains<AccountType>(accountTypes, AccountType.rawErc4337)
		const hasEip7702 =
			accountTypes !== null && setContains<AccountType>(accountTypes, AccountType.eip7702)
		const hasEoa =
			accountTypes !== null &&
			(hasEip7702 || setContains<AccountType>(accountTypes, AccountType.eoa))
		
		return hasEip7702
			? WalletTypeFor7702.EIP7702
			: hasErc4337
				? WalletTypeFor7702.NON_7702_SMART_WALLET
				: hasEoa
					? WalletTypeFor7702.NON_7702_EOA
					: WalletTypeFor7702.OTHER
	}

	const getWalletContract = (wallet: RatedWallet): SmartWalletContract | 'UNKNOWN' | 'NONE' => {
		for (const variant of setItems<Variant>(getWalletVariants(wallet))) {
			const variantWallet = getVariantResolvedWallet(wallet, variant)

			if (variantWallet === null || variantWallet.features.accountSupport === null) {
				continue
			}

			if (isAccountTypeSupported(variantWallet.features.accountSupport.eip7702)) {
				return variantWallet.features.accountSupport.eip7702.contract
			}

			if (isAccountTypeSupported(variantWallet.features.accountSupport.rawErc4337)) {
				return variantWallet.features.accountSupport.rawErc4337.contract
			}
		}

		return 'NONE'
	}

	const getSortPriority = (wallet: RatedWallet) => {
		const typeFor7702 = getWalletTypeFor7702(wallet)
		switch (typeFor7702) {
			case WalletTypeFor7702.EIP7702:
				return 0
			case WalletTypeFor7702.NON_7702_SMART_WALLET:
				return 1
			case WalletTypeFor7702.NON_7702_EOA:
				return 2
			case WalletTypeFor7702.OTHER:
				return 3
		}
	}

	// State
	let activeFilters = $state(new Set<Filter<RatedWallet>>())
	let filteredWallets = $state<RatedWallet[]>([])

	// Actions
	let toggleFilterById: Filters<RatedWallet>['$$prop_def']['toggleFilterById'] = $state()
	let toggleFilter: Filters<RatedWallet>['$$prop_def']['toggleFilter'] = $state()

	// Components
	import Filters from '@/ui/molecules/Filters.svelte'
	import Tooltip from '@/ui/atoms/Tooltip.svelte'
	import EipDetails from '@/ui/molecules/EipDetails.svelte'
	import Table from '@/ui/atoms/Table.svelte'

	import KeyIcon from 'lucide-static/icons/key.svg?raw'

	// Sort wallets by priority
	const sortedWallets = Object.values(ratedSoftwareWallets).sort((a, b) => getSortPriority(a) - getSortPriority(b))
</script>


<header
	data-sticky="inline"
	class="row wrap"
>
	<Filters
		items={sortedWallets}
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
						filterFunction: wallet => getWalletTypeFor7702(wallet) === 'EIP7702',
					},
					{
						id: 'accountType-erc4337',
						label: 'ERC-4337',
						icon: KeyIcon,
						filterFunction: wallet => getWalletTypeFor7702(wallet) === 'NON_7702_SMART_WALLET',
					},
					{
						id: 'accountType-eoa',
						label: 'EOA',
						icon: KeyIcon,
						filterFunction: wallet => getWalletTypeFor7702(wallet) === 'NON_7702_EOA',
					},
				],
			},
		]}
		bind:activeFilters
		bind:filteredItems={filteredWallets}
		bind:toggleFilter
		bind:toggleFilterById
	/>
</header>

<Table
	rows={filteredWallets}
	columns={[
		{
			id: 'wallet',
			name: 'Wallet',
			getValue: wallet => wallet.metadata.displayName,
			isSticky: true,
		},
		{
			id: 'type',
			name: 'Type',
			getValue: wallet => getWalletTypeFor7702(wallet),
			defaultSortDirection: 'asc',
		},
		{
			id: 'contract',
			name: 'Contract',
			getValue: wallet => getWalletContract(wallet),
			isSortable: false,
		},
		{
			id: 'batching',
			name: 'Batching',
			getValue: () => 'Coming soon',
			isSortable: false,
		},
	]}
	getId={wallet => wallet.metadata.id}
	isRowDisabled={() => false}
	defaultSort={{
		columnId: 'type',
		direction: 'asc',
	}}
>
	{#snippet cellSnippet({ row: wallet, column, value })}
		{#if column.id === 'wallet'}
			<div class="wallet-info">
				<span class="row-count"></span>

				<img
					src={`/images/wallets/${wallet.metadata.id}.svg`}
					alt={wallet.metadata.displayName}
					class="wallet-icon"
					onerror={e => {
						const target = e.target as HTMLImageElement
						if (target) target.src = '/images/wallets/default.svg'
					}}
				/>
				<a href={`/${wallet.metadata.id}`} class="wallet-name">
					{wallet.metadata.displayName}
				</a>
			</div>
		{:else if column.id === 'type'}
			{@const typeFor7702 = getWalletTypeFor7702(wallet)}
			<div class="row inline">
				{#if typeFor7702 === WalletTypeFor7702.EIP7702}
					<Tooltip placement="top">
						<span class="tag eip-7702">EIP-7702</span>
						{#snippet tooltip()}
							<EipDetails eip={eip7702} />
						{/snippet}
					</Tooltip>
				{:else if typeFor7702 === WalletTypeFor7702.NON_7702_SMART_WALLET}
					<Tooltip placement="top">
						<span class="tag eip-4337">ERC-4337</span>
						{#snippet tooltip()}
							<EipDetails eip={erc4337} />
						{/snippet}
					</Tooltip>
				{:else if typeFor7702 === WalletTypeFor7702.NON_7702_EOA}
					<span class="type-label">Non-7702 EOA</span>
				{:else}
					<span class="type-label">Non-7702</span>
				{/if}
			</div>
		{:else if column.id === 'contract'}
			{@const contract = getWalletContract(wallet)}
			{#if contract === 'NONE'}
				<span class="na-text">N/A</span>
			{:else if contract === 'UNKNOWN'}
				<span class="unknown-text">Unknown - Send PR!</span>
			{:else}
				<div class="contract-info">
					<a
						href={walletContractUrl(contract.address)}
						target="_blank"
						rel="noopener noreferrer"
					>
						{contract.name}
					</a>
				</div>

				{#if contract.sourceCode.available}
					{@const sourceRefs = refs(contract.sourceCode)}
					{@const sourceUrl = isNonEmptyArray(sourceRefs)
						? nonEmptyGet(nonEmptyGet(sourceRefs).urls)
						: walletContractUrl(contract.address, 'code')}
					{@const rawUrl = isLabeledUrl(sourceUrl) ? sourceUrl.url : sourceUrl}

					<div>
						<a 
							href={rawUrl} 
							target="_blank" 
							rel="noopener noreferrer"
							class="source-link"
						>
							Source Code
						</a>
					</div>
				{/if}
			{/if}
		{:else if column.id === 'batching'}
			{@const contract = getWalletContract(wallet)}
			{#if contract === 'NONE'}
				<span class="na-text">N/A</span>
			{:else}
				<span class="coming-soon-text">Coming soon</span>
			{/if}
		{:else}
			{value}
		{/if}
	{/snippet}
</Table>


<style>
	.wallet-info {
		display: flex;
		align-items: center;
		gap: 0.85em;
		padding: 0.5em 0;

		.row-count {
			display: inline-flex;
			justify-content: center;
			align-items: center;
			width: 1.25em;
			height: 1.25em;

			text-align: center;
			font-weight: 600;
			color: var(--text-secondary);

			&::before {
				content: counter(TableRowCount);
			}

			:global([data-disabled]) &::before {
				content: '–';
			}
		}
	}

	.wallet-icon {
		filter: drop-shadow(rgba(255, 255, 255, 0.1) 0px 0px 4.66667px);
		width: 2.25em;
		height: 2.25em;
		object-fit: contain;
		border-radius: 0.25em;
	}

	.wallet-name {
		font-weight: 600;
		text-decoration: none;
		color: var(--text-primary);

		&:hover {
			text-decoration: underline;
		}
	}

	.tag.eip-7702 {
		color: #fff;
		background: var(--accent);
		border-color: var(--accent);
	}

	.tag.eip-4337 {
		color: var(--accent);
		background: var(--background-secondary);
		border-color: var(--accent);
	}

	.type-label {
		color: var(--text-secondary);
	}

	.na-text,
	.coming-soon-text {
		color: var(--text-secondary);
	}

	.unknown-text {
		color: var(--text-secondary);
	}

	.contract-info {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.source-link {
		color: var(--text-secondary);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
</style>
