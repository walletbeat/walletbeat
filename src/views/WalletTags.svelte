<script lang="ts" generics="_AttributeGroupId extends string">
	import Tooltip from '@/components/Tooltip.svelte'
	import EipDetails from '@/views/EipDetails.svelte'
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { AccountType } from '@/schema/features/account-support'
	import { HardwareWalletManufactureType } from '@/schema/features/profile'
	import { hasVariant, Variant } from '@/schema/variants'
	import { type RatedWallet, walletSupportedAccountTypes } from '@/schema/wallet'

	let { wallet, selectedVariant, onFilter }: {
		wallet: RatedWallet<_AttributeGroupId>
		selectedVariant?: Variant
		onFilter?: (filterId: string) => void
	} = $props()

	const accountTypes = $derived(walletSupportedAccountTypes(wallet, selectedVariant ?? 'ALL_VARIANTS'))
</script>

{#each (
										[
											// Wallet type tags
											hasVariant(wallet.variants, Variant.HARDWARE) && {
												label: 'Hardware',
												filterId: 'walletType-hardware',
												type: 'wallet-type',
											},
											!hasVariant(wallet.variants, Variant.HARDWARE) && {
												label: 'Software',
												filterId: 'walletType-software',
												type: 'wallet-type',
											},
											// Manufacture type tags
											hasVariant(wallet.variants, Variant.HARDWARE) && wallet.metadata.hardwareWalletManufactureType && {
												label: wallet.metadata.hardwareWalletManufactureType === HardwareWalletManufactureType.FACTORY_MADE ? 'Factory-Made' : 'DIY',
												filterId: `manufactureType-${wallet.metadata.hardwareWalletManufactureType}`,
												type: 'manufacture-type',
											},
											// Account type tags
											...(
												accountTypes !== null ?
													[
														AccountType.eoa in accountTypes && {
															label: 'EOA',
															filterId: 'accountType-eoa',
															type: 'account-type',
														},
														AccountType.rawErc4337 in accountTypes && {
															label: `#${erc4337.number}`,
														eipTooltipContent: erc4337,
															filterId: 'accountType-erc4337',
															type: 'eip',
														},
														AccountType.eip7702 in accountTypes && {
															label: `#${eip7702.number}`,
														eipTooltipContent: eip7702,
															filterId: 'accountType-eip7702',
															type: 'eip',
														},
														AccountType.safe in accountTypes && {
															label: 'Safe',
															filterId: 'accountType-safe',
															type: 'safe',
														},
														AccountType.mpc in accountTypes && {
															label: 'MPC',
															filterId: 'accountType-mpc',
															type: 'account-type',
														},
													]
												:
													[]
											),
										]
											.filter(tag => tag !== false && tag !== undefined)
									) as tag (tag.label)}
	{#snippet Tag()}
		{#if onFilter}
			<button data-tag={tag.type} aria-label="Filter by {tag.label}" onclick={event => {
				event.stopPropagation()
				onFilter?.(tag.filterId)
			}}>{tag.label}</button>
		{:else}
			<span data-tag={tag.type}>{tag.label}</span>
		{/if}
	{/snippet}
	{#if 'eipTooltipContent' in tag && tag.eipTooltipContent}
		<Tooltip placement="inline-end" buttonTriggerPlacement={onFilter ? 'behind' : 'around'}>
			{@render Tag()}
			{#snippet TooltipContent()}
				<div class="eip-tooltip-content"><EipDetails eip={tag.eipTooltipContent} /></div>
			{/snippet}
		</Tooltip>
	{:else}
		{@render Tag()}
	{/if}
{/each}

<style>
	.eip-tooltip-content {
		width: 34rem;
	}
</style>
