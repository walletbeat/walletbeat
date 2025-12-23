<script lang="ts">
	// Types/constants
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { ratedSoftwareWallets } from '@/data/software-wallets'
	import type { EVMAddress, SmartWalletContract } from '@/schema/contracts'
	import { AccountType } from '@/schema/features/account-support'
	import type { Variant } from '@/schema/variants'
	import type { RatedWallet } from '@/schema/wallet'
	import { Rating } from '@/schema/attributes'

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
	import { isAccountTypeSupported } from '@/schema/features/account-support'
	import { refs } from '@/schema/reference'
	import { isLabeledUrl } from '@/schema/url'
	import { getVariants } from '@/schema/variants'
	import { getVariantResolvedWallet, walletSupportedAccountTypes } from '@/schema/wallet'
	import { isNonEmptyArray, nonEmptyGet, setContains, setItems } from '@/types/utils/non-empty'

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
	let activeFilters: Filters<RatedWallet>['$$prop_def']['activeFilters'] = $state(new Set())
	let filteredWallets = $state<RatedWallet[]>([])


	// Actions
	let toggleFilterById: Filters<RatedWallet>['$$prop_def']['toggleFilterById'] = $state()
	let toggleFilter: Filters<RatedWallet>['$$prop_def']['toggleFilter'] = $state()


	// Components
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'
	import KeyIcon from 'lucide-static/icons/key.svg?raw'

	import Filters from '@/components/Filters.svelte'
	import Table from '@/components/Table.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import EipDetails from '@/views/EipDetails.svelte'
</script>


<section
	data-sticky-container
	data-column="gap-6"
>
	<header
		data-sticky="inline"
		data-row="wrap"
		data-scroll-item='inline-detached padding-match-start'
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

	<div data-scroll-item="inline-attached underflow-center overflow-start">
		<Table
			rows={filteredWallets}
			rowId={wallet => wallet.metadata.id}

			columns={[
				{
					id: 'wallet',
					name: 'Wallet',
					value: wallet => wallet.metadata.displayName,
					isSticky: true,
					sort: {
						defaultDirection: 'asc',
					},
				},
				{
					id: 'type',
					name: 'Type',
					value: wallet => WalletTypeFor7702SortPriority[getWalletTypeFor7702(wallet)],
					sort: {
						isDefault: true,
						defaultDirection: 'asc',
					},
				},
				{
					id: 'contract',
					name: 'Contract',
					value: wallet => getWalletContract(wallet),
				},
				{
					id: 'batching',
					name: 'Batching',
					value: wallet => wallet.overall.ecosystem.transactionBatching?.evaluation?.value?.rating ?? undefined,
				},
			]}
		>
			{#snippet Cell({ row: wallet, column, value })}
				{#if column.id === 'wallet'}
					<div class="wallet-info" data-row>
						<span class="row-count" data-row="center"></span>

						<img
							src={`/images/wallets/${wallet.metadata.id}.svg`}
							alt={wallet.metadata.displayName}
							class="wallet-icon"
							onerror={e => {
								if (e.currentTarget)
									e.currentTarget.src = '/images/wallets/default.svg'
							}}
						/>

						<div class="name">
							<h3>
								<a
									href={`/${wallet.metadata.id}/`}
								>
									{wallet.metadata.displayName}
								</a>
							</h3>
						</div>
					</div>

				{:else if column.id === 'type'}
					{@const typeFor7702 = getWalletTypeFor7702(wallet)}

					{#if typeFor7702 === WalletTypeFor7702.EIP7702}
						<Tooltip
							placement="inline-end"
						>
							<button
								data-tag="eip"
								aria-label="Filter by EIP-7702"
								onclick={e => {
									e.stopPropagation()
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
									onclick={e => {
										e.stopPropagation()
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
								{@const sourceUrl =
									isNonEmptyArray(sourceRefs) ?
										nonEmptyGet(nonEmptyGet(sourceRefs).urls)
									:
										getContractUrl(contract.address, 'code')
								}
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
					{@const batchingRating = wallet.overall.ecosystem.transactionBatching?.evaluation?.value?.rating}

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
