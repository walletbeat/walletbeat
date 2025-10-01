<script lang="ts">
	// Types/constants
	import type { EVMAddress, SmartWalletContract } from '@/schema/contracts'
	import type { Variant } from '@/schema/variants'
	import type { RatedWallet } from '@/schema/wallet'
	import { AccountType } from '@/schema/features/account-support'
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { ratedSoftwareWallets } from '@/data/software-wallets'

	const WalletTypeFor7702 = {
		EIP7702: 'EIP7702',
		EIP4337: 'EIP4337',
		NON_7702_EOA: 'NON_7702_EOA',
		OTHER: 'OTHER',
	} as const

	type WalletTypeFor7702 = (typeof WalletTypeFor7702)[keyof typeof WalletTypeFor7702]

	const WalletTypeFor7702SortPriority = {
		[WalletTypeFor7702.EIP7702]: 0,
		[WalletTypeFor7702.EIP4337]: 1,
		[WalletTypeFor7702.NON_7702_EOA]: 2,
		[WalletTypeFor7702.OTHER]: 3,
	} as const


	// Props
	let {
		title
	}: {
		title?: string
	} = $props()


	// Functions
	import { isNonEmptyArray, nonEmptyGet, setContains, setItems } from '@/types/utils/non-empty'
	import { getVariantResolvedWallet, walletSupportedAccountTypes } from '@/schema/wallet'
	import { getVariants } from '@/schema/variants'
	import { isLabeledUrl } from '@/schema/url'
	import { isAccountTypeSupported } from '@/schema/features/account-support'
	import { refs } from '@/schema/reference'

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
				? WalletTypeFor7702.EIP4337
				: hasEoa
					? WalletTypeFor7702.NON_7702_EOA
					: WalletTypeFor7702.OTHER
	}

	const getWalletContract = (wallet: RatedWallet): SmartWalletContract | 'UNKNOWN' | undefined => {
		for (const variant of setItems<Variant>(getVariants(wallet.variants))) {
			const variantWallet = getVariantResolvedWallet(wallet, variant)

			if (variantWallet === null || variantWallet.features.accountSupport === null)
				continue

			if (isAccountTypeSupported(variantWallet.features.accountSupport.eip7702))
				return variantWallet.features.accountSupport.eip7702.contract

			if (isAccountTypeSupported(variantWallet.features.accountSupport.rawErc4337))
				return variantWallet.features.accountSupport.rawErc4337.contract
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
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
</script>


<header
	data-sticky="inline"
	class="row wrap"
>
	{#if title}
		<h2>{title}</h2>
	{/if}

	<Filters
		items={Object.values(ratedSoftwareWallets)}
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
						filterFunction: wallet => getWalletTypeFor7702(wallet) === WalletTypeFor7702.EIP7702,
					},
					{
						id: 'accountType-erc4337',
						label: 'ERC-4337',
						icon: KeyIcon,
						filterFunction: wallet => getWalletTypeFor7702(wallet) === WalletTypeFor7702.EIP4337,
					},
					{
						id: 'accountType-eoa',
						label: 'EOA',
						icon: KeyIcon,
						filterFunction: wallet => getWalletTypeFor7702(wallet) === WalletTypeFor7702.NON_7702_EOA,
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
			getValue: wallet => WalletTypeFor7702SortPriority[getWalletTypeFor7702(wallet)],
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

				<div class="name">
					<h3>
						<a
							href={`/${wallet.metadata.id}`}
						>
							{wallet.metadata.displayName}
						</a>
					</h3>
				</div>
			</div>

		{:else if column.id === 'type'}
			{@const typeFor7702 = getWalletTypeFor7702(wallet)}

			{#if typeFor7702 === WalletTypeFor7702.EIP7702}
				<Tooltip placement="block-start">
					<button
						class="tag"
						data-tag-variant="eip"
						aria-label="Filter by EIP-7702"
						onclick={e => {
							e.stopPropagation()
							toggleFilterById!('accountType-eip7702')
						}}
					>
						EIP-7702
					</button>

					{#snippet tooltip()}
						<EipDetails eip={eip7702} />
					{/snippet}
				</Tooltip>
			{:else}
				{#if typeFor7702 === WalletTypeFor7702.EIP4337}
					<Tooltip placement="block-start">
						<button
							class="tag"
							data-tag-variant="eip"
							aria-label="Filter by ERC-4337"
							onclick={e => {
								e.stopPropagation()
								toggleFilterById!('accountType-erc4337')
							}}
						>
							ERC-4337
						</button>

						{#snippet tooltip()}
							<EipDetails eip={erc4337} />
						{/snippet}
					</Tooltip>
				{:else}
					{#if typeFor7702 === WalletTypeFor7702.NON_7702_EOA}
						<button
							class="tag"
							data-tag-variant="eoa"
							aria-label="Filter by EOA"
							onclick={e => {
								e.stopPropagation()
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
			{@const contract = getWalletContract(wallet)}

			{#if contract === undefined}
				<span class="muted-text">–</span>
			{:else if contract === 'UNKNOWN'}
				<span class="muted-text">Unknown</span>
			{:else}
				{@const getContractUrl = (contractAddress: EVMAddress, anchor?: string) =>
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
					{#if contract.sourceCode.available}
						{@const sourceRefs = refs(contract.sourceCode)}
						{@const sourceUrl = (
							isNonEmptyArray(sourceRefs) ?
								nonEmptyGet(nonEmptyGet(sourceRefs).urls)
							:
								getContractUrl(contract.address, 'code')
						)}
						{@const rawUrl = isLabeledUrl(sourceUrl) ? sourceUrl.url : sourceUrl}

						<a 
							href={rawUrl} 
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
			{@const contract = getWalletContract(wallet)}

			{#if contract === 'NONE'}
				<span class="muted-text">–</span>
			{:else}
				<span class="muted-text">Coming soon</span>
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

		.wallet-icon {
			filter: drop-shadow(rgba(255, 255, 255, 0.1) 0px 0px 4.66667px);
			width: 2.25em;
			height: 2.25em;
			object-fit: contain;
			border-radius: 0.25em;
		}

		.name {
			font-size: 0.85em;

			h3 {
				font-weight: 600;

				a {
					color: var(--text-primary);

					&:not(:hover) {
						text-decoration: none;
					}
				}
			}

		}
	}

	.tag {
		:global(button:has(&)) {
			display: inline-flex;
		}
	}

	.muted-text {
		color: var(--text-secondary);
	}
</style>
