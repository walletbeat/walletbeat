<script lang="ts">
	// Types/constants
	import { Variant } from '@/schema/variants'
	import {
		ecosystemAttributeGroup,
		privacyAttributeGroup,
		securityAttributeGroup,
		selfSovereigntyAttributeGroup,
		transparencyAttributeGroup,
	} from '@/schema/attribute-groups'
	import { ratedWallets } from '@/data/wallets'

	const attributeGroups = {
		[securityAttributeGroup.id]: securityAttributeGroup,
		[privacyAttributeGroup.id]: privacyAttributeGroup,
		[selfSovereigntyAttributeGroup.id]: selfSovereigntyAttributeGroup,
		[transparencyAttributeGroup.id]: transparencyAttributeGroup,
		[ecosystemAttributeGroup.id]: ecosystemAttributeGroup,
	}


	// State
	import { WalletTableState } from '../WalletTableState.svelte'

	let walletTableState = new WalletTableState()


	// Components
	import WalletAttributeGroupRating from '@/components/ui/molecules/WalletAttributeGroupRating.svelte'
	import Table from '@/components/ui/atoms/Table.svelte'

	import PhoneAndroidIcon from '@material-icons/svg/svg/phone_android/baseline.svg?raw'
	import LanguageIcon from '@material-icons/svg/svg/language/baseline.svg?raw'
	import MonitorIcon from '@material-icons/svg/svg/monitor/baseline.svg?raw'
	import SettingsEthernetIcon from '@material-icons/svg/svg/settings_ethernet/baseline.svg?raw'

	const variantIcons = {
		[Variant.BROWSER]: LanguageIcon,
		[Variant.DESKTOP]: MonitorIcon,
		[Variant.MOBILE]: PhoneAndroidIcon,
		[Variant.EMBEDDED]: SettingsEthernetIcon,
	}
</script>


<Table
	rows={
		Object.entries(ratedWallets)
			.map(([id, wallet]) => ({ id, wallet }))
	}
	getId={({ id }) => id}
	columns={[
		{
			id: 'displayName',
			key: 'displayName',
			name: 'Wallet',
			getValue: ({ wallet }) => (
				wallet.metadata.displayName
			),
		},
		...(
			Object.values(attributeGroups)
				.map(attrGroup => ({
					id: attrGroup.id,
					key: attrGroup.id,
					name: `${attrGroup.icon} ${attrGroup.displayName}`,
					getValue: ({ wallet }) => (
						wallet.overall[attrGroup.id] && attrGroup.score(wallet.overall[attrGroup.id])?.score || undefined
					),
				}))
		),
	]}
	onRowClick={({ id }) => {
		walletTableState.toggleRowExpanded(id)
	}}
	class="wallet-table"
>
	{#snippet cellSnippet({
		row: { wallet },
		column,
		value,
	})}
		{@const isExpanded = walletTableState.isRowExpanded(wallet.metadata.id)}

		{#if column.id === 'displayName'}
			{@const displayName = value}

			<div
				class="wallet-name-cell column"
				data-is-expanded={isExpanded ? '' : undefined}
			>
				<div class="wallet-name-title row">
					<div class="row">
						<img
							alt={displayName}
							src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
							width="16"
							height="16"
						/>
						{displayName}
					</div>

					<div class="variants row inline">
						{#each (
							Object.entries(wallet.variants)
								.filter(([, hasVariant]) => hasVariant)
								.map(([variant]) => variant)
						) as variant}
							<button
								class:selected={!walletTableState.selectedVariant || variant === walletTableState.selectedVariant}
								onclick={e => {
									e.stopPropagation()
									walletTableState.selectVariant(variant as Variant)
								}}
							>
								<span
									class="icon"
									title={variant}
								>
									{@html variantIcons[variant]}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			{@const attrGroup = attributeGroups[column.id]}
			{@const evalGroup = wallet.overall[attrGroup.id]}
			{@const groupScore = value}

			<WalletAttributeGroupRating
				{wallet}
				{attrGroup}
				{evalGroup}
				{groupScore}
				bind:selectedEvaluationAttribute={walletTableState.selectedEvaluationAttribute}
				bind:selectedVariant={walletTableState.selectedVariant}
				{isExpanded}
				toggleExpanded={id => {
					walletTableState.toggleRowExpanded(id)
				}}
			/>
		{/if}
	{/snippet}
</Table>


<style>
	:global(.wallet-table) {
		font-size: 1.1em;
	}

	img {
		filter: drop-shadow(rgba(255, 255, 255, 0.1) 0px 0px 4.66667px);
		width: auto;
		height: 1.66rem;
		vertical-align: middle;
	}

	.variants {
		:global(svg) {
			fill: currentColor;
		}
	}
</style>
