<script module lang="ts">
	export type WalletTableState = {
		variantSelected: Variant | undefined
		expandedRowIds: Set<string>
		displayMode: 'separated' | 'combined'
	}
</script>

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

	// Components
	import WalletRating from '@/components/ui/molecules/WalletRating.svelte'
	import Table from '@/components/ui/atoms/Table.svelte'
	import CombinedWalletRating from '@/components/ui/molecules/CombinedWalletRating.svelte'

	import PhoneAndroidIcon from '@material-icons/svg/svg/phone_android/baseline.svg?raw'
	import LanguageIcon from '@material-icons/svg/svg/language/baseline.svg?raw'
	import MonitorIcon from '@material-icons/svg/svg/monitor/baseline.svg?raw'
	import SettingsEthernetIcon from '@material-icons/svg/svg/settings_ethernet/baseline.svg?raw'
	import DefaultViewIcon from '@material-icons/svg/svg/looks/baseline.svg?raw'
	import CombinedViewIcon from '@material-icons/svg/svg/filter_vintage/baseline.svg?raw'

	const variantIcons = {
		[Variant.BROWSER]: LanguageIcon,
		[Variant.DESKTOP]: MonitorIcon,
		[Variant.MOBILE]: PhoneAndroidIcon,
		[Variant.EMBEDDED]: SettingsEthernetIcon,
	}

	// State
	let tableState = $state<WalletTableState>({
		variantSelected: undefined,
		expandedRowIds: new Set<string>(),
		displayMode: 'separated',
	})

	// Create column definitions
	const displayNameColumn = {
		id: 'displayName',
		key: 'displayName',
		name: 'Wallet',
		getValue: ({ wallet }) => wallet.metadata.displayName,
	}

	const combinedColumn = {
		id: 'combined',
		key: 'combined',
		name: 'Overall Rating',
		getValue: ({ wallet }) => wallet,
	}

	const attributeColumns = Object.values(attributeGroups).map(attrGroup => ({
		id: attrGroup.id,
		key: attrGroup.id,
		name: `${attrGroup.icon} ${attrGroup.displayName}`,
		getValue: ({ wallet }) => attrGroup.score(wallet.overall[attrGroup.id]),
	}))

	// Toggle display mode function
	function toggleDisplayMode() {
		tableState.displayMode = tableState.displayMode === 'separated' ? 'combined' : 'separated'
	}

	// Reactive columns based on display mode - using Svelte 5 runes
	let columns = $derived(
		tableState.displayMode === 'combined'
			? [displayNameColumn, combinedColumn]
			: [displayNameColumn, ...attributeColumns],
	)
</script>

<div class="wallet-table-container">
	<div class="table-controls">
		<button
			class="display-toggle"
			onclick={toggleDisplayMode}
			title={tableState.displayMode === 'separated'
				? 'Switch to combined view'
				: 'Switch to separated view'}
		>
			{#if tableState.displayMode === 'separated'}
				<span class="icon">{@html CombinedViewIcon}</span>
				<span class="label">Combined View</span>
			{:else}
				<span class="icon">{@html DefaultViewIcon}</span>
				<span class="label">Detailed View</span>
			{/if}
		</button>
	</div>

	<Table
		key={tableState.displayMode}
		rows={Object.entries(ratedWallets).map(([id, wallet]) => ({ id, wallet }))}
		getId={({ id }) => id}
		{columns}
		onRowClick={({ id }) => {
			if (tableState.expandedRowIds.has(id)) tableState.expandedRowIds.delete(id)
			else tableState.expandedRowIds.add(id)
		}}
		class="wallet-table"
	>
		{#snippet cellSnippet({ row: { wallet }, column, value })}
			{#if column.key === 'displayName'}
				{@const displayName = value}

				<div class="row">
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
						{#each Object.entries(wallet.variants)
							.filter(([, hasVariant]) => hasVariant)
							.map(([variant]) => variant) as variant}
							<span title={variant}>
								{@html variantIcons[variant]}
							</span>
						{/each}
					</div>
				</div>
			{:else if column.key === 'combined'}
				<CombinedWalletRating
					{wallet}
					attributeGroups={Object.values(attributeGroups)}
					bind:tableState
					rowId={wallet.metadata.id}
				/>
			{:else}
				{@const attrGroup = attributeGroups[column.id]}
				{@const evalGroup = wallet.overall?.[attrGroup.id] || {}}
				{@const groupScore = value}

				<WalletRating
					{wallet}
					{attrGroup}
					{evalGroup}
					{groupScore}
					bind:tableState
					rowId={wallet.metadata.id}
				/>
			{/if}
		{/snippet}
	</Table>
</div>

<style>
	.wallet-table-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.table-controls {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1rem;
	}

	.display-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		color: white;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: background 0.2s ease;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
		}

		.icon {
			display: flex;
			align-items: center;

			:global(svg) {
				fill: currentColor;
				width: 1.2rem;
				height: 1.2rem;
			}
		}
	}

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
