<script lang="ts">
	// Types/constants
	import type { ColumnDef } from '@/lib/DataTable.svelte'
	import { Variant } from '@/schema/variants'
	import type { RatedWallet } from '@/schema/wallet'
	import type { AttributeGroup } from '@/schema/attributes'


	// Props
	let {
		wallets,
		attributeGroups,
	}: {
		wallets: RatedWallet[]
		attributeGroups: AttributeGroup<any>[]
	} = $props()


	// State
	import { WalletTableState } from '../WalletTableState.svelte'

	let walletTableState = new WalletTableState()


	// Functions
	import { variants, variantUrlQuery } from '@/components/variants'
	import { isLabeledUrl } from '@/schema/url'
	import { calculateAttributeGroupScore } from '@/schema/attribute-groups'


	// Components
	import WalletAttributeGroupRating from '@/ui/molecules/WalletAttributeGroupRating.svelte'
	import CombinedWalletRating from '@/ui/molecules/CombinedWalletRating.svelte'
	import Table from '@/ui/atoms/Table.svelte'
	import Typography from '@/ui/atoms/Typography.svelte'

	import UnfoldLessIcon from '@material-icons/svg/svg/unfold_less/baseline.svg?raw'
	import UnfoldMoreIcon from '@material-icons/svg/svg/unfold_more/baseline.svg?raw'
	import DefaultViewIcon from '@material-icons/svg/svg/looks/baseline.svg?raw'
	import CombinedViewIcon from '@material-icons/svg/svg/filter_vintage/baseline.svg?raw'

	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
	import OpenInNewRoundedIcon from '@material-icons/svg/svg/open_in_new//baseline.svg?raw'
</script>


<div class="wallet-table-container">
	<div class="table-controls">
		<button
			class="display-toggle"
			onclick={() => {
				walletTableState.toggleDisplayMode()
			}}
			title={
				walletTableState.displayMode === 'separated' ?
					'Switch to combined view'
				:
					'Switch to separated view'
			}
		>
			{#if walletTableState.displayMode === 'separated'}
				<span class="icon">{@html CombinedViewIcon}</span>
				<span class="label">Combined View</span>
			{:else}
				<span class="icon">{@html DefaultViewIcon}</span>
				<span class="label">Detailed View</span>
			{/if}
		</button>
	</div>

<Table
	rows={wallets}
	getId={wallet => wallet.metadata.id}
	getDisabled={(wallet, table) => (
		Boolean(
			(walletTableState.selectedVariant && !(walletTableState.selectedVariant in wallet.variants))
			|| (table.sortState?.direction && table.columns.find(column => column.id === table.sortState!.columnId)?.getValue?.(wallet) === undefined)
		)
	)}
	onRowClick={wallet => {
		walletTableState.toggleRowExpanded(wallet.metadata.id)
	}}

	columns={
		[
			{
				id: 'displayName',
				name: 'Wallet',
				getValue: wallet => (
					wallet.metadata.displayName
				),
			} satisfies ColumnDef<RatedWallet>,
			...(
				walletTableState.displayMode === 'combined' ?
					[
						{
							id: 'combined',
							name: 'Overall Rating',
							getValue: wallet => wallet,
						} satisfies ColumnDef<RatedWallet>,
					]
				:
					attributeGroups.map(attrGroup => ({
						id: attrGroup.id,
						name: `${attrGroup.icon} ${attrGroup.displayName}`,
						getValue: wallet => (
							calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])?.score ?? undefined
						),
						defaultSortDirection: 'desc' as const,
					} satisfies ColumnDef<RatedWallet>))
			),
		]
	}
	defaultSort={{
		columnId: 'displayName',
		direction: 'asc',
	}}
>
	{#snippet cellSnippet({
		row: wallet,
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
						<span class="icon">
							{#if isExpanded}
								{@html UnfoldLessIcon}
							{:else}
								{@html UnfoldMoreIcon}
							{/if}
						</span>

						<img
							alt={displayName}
							src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
							width="16"
							height="16"
						/>

						<div class="column inline">
							<span>{displayName}</span>

							{#if walletTableState.selectedVariant && walletTableState.selectedVariant in wallet.variants}
								<small class="variant">
									{variants[walletTableState.selectedVariant].label}
								</small>
							{/if}
						</div>
					</div>

					<div class="variants row inline">
						{#each (
							(Object.entries(wallet.variants) as unknown as [Variant, boolean][])
								.filter(([, hasVariant]) => hasVariant)
								.map(([variant]) => variant)
						) as variant}
							<button
								data-selected={variant === walletTableState.selectedVariant ? '' : undefined}
								onclick={e => {
									e.stopPropagation()
									walletTableState.selectVariant(variant as Variant)
								}}
							>
								<span
									class="icon"
									title={variant}
								>
									{@html variants[variant].icon}
								</span>
							</button>
						{/each}
					</div>
				</div>

				<div
					class="expanded-content column"
					hidden={!isExpanded}
				>
					{#if !walletTableState.selectedVariant || wallet.variants[walletTableState.selectedVariant]}
						<p class="blurb">
							<Typography
								content={wallet.metadata.blurb}
								strings={{
									WALLET_NAME: wallet.metadata.displayName,
									WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
								}}
							/>
						</p>
					{:else}
						<p class="blurb">
							{wallet.metadata.displayName} does not have a {walletTableState.selectedVariant} version.
						</p>
					{/if}
					
					<div class="links">
						<a
							href={`/${wallet.metadata.id}/${variantUrlQuery(wallet.variants, walletTableState.selectedVariant ?? null)}`}
							class="info-link"
						>
							<span class="icon">{@html InfoIcon}</span>
							Learn more
						</a>
						|
						<a
							href={isLabeledUrl(wallet.metadata.url) ? wallet.metadata.url.url : wallet.metadata.url}
							target="_blank"
							class="external-link"
						>
							{wallet.metadata.displayName} website
						</a>
						{#if wallet.metadata.repoUrl}
							|
							<a
								href={isLabeledUrl(wallet.metadata.repoUrl) ? wallet.metadata.repoUrl.url : wallet.metadata.repoUrl}
								target="_blank"
								class="external-link"
							>
								Code
								<span class="icon">{@html OpenInNewRoundedIcon}</span>
							</a>
						{/if}
					</div>
				</div>
			</div>

		{:else if column.id === 'combined'}
			<CombinedWalletRating
				{wallet}
				{attributeGroups}
				bind:selectedEvaluationAttribute={walletTableState.selectedEvaluationAttribute}
				bind:selectedVariant={walletTableState.selectedVariant}
				{isExpanded}
				toggleExpanded={id => {
					walletTableState.toggleRowExpanded(id)
				}}
			/>

		{:else}
			{@const attrGroup = attributeGroups.find(attributeGroup => attributeGroup.id === column.id)!}
			{@const evalGroup = wallet.overall[attrGroup.id]}
			{@const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, evalGroup)}

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

	.wallet-name-cell {
		transition-property: gap;

		&:not([data-is-expanded]) {
			gap: 0;
		}

		.wallet-name-title {
			min-height: 4rem;

			img {
				filter: drop-shadow(rgba(255, 255, 255, 0.1) 0px 0px 4.66667px);
				width: auto;
				height: 1.66rem;
				vertical-align: middle;
			}

			.variant {
				font-size: 0.6em;
				opacity: 0.6;
			}

			.variants {
				gap: 0.1em;

				button {
					all: unset;
					cursor: pointer;

					display: inline-flex;
					place-items: center;
					aspect-ratio: 1;
					padding: 0.33em;
					border-radius: 50%;

					transition-property: background-color, opacity;
					transition-duration: inherit;
					transition-timing-function: inherit;

					&[data-selected] {
						background-color: rgba(255, 255, 255, 0.1);
						box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.33);
					}

					&:focus {
						background-color: rgba(255, 255, 255, 0.15);
					}

					&:hover {
						background-color: rgba(255, 255, 255, 0.2);
					}

					.variants:has([data-selected]) &:not([data-selected]) {
						opacity: 0.5;
					}
				}

				:global(svg) {
					fill: currentColor;
				}
			}
		}

		.expanded-content {
			font-size: 0.64em;
			max-width: 40ch;

			overflow: hidden;
			transition-property: height, display;

			&[hidden] {
				height: 0;
			}

			p {
				width: 0;
				min-width: 100%;
			}
		}
	}

	.icon {
		display: inline-flex;
		vertical-align: middle;
		fill: currentColor;
	}
</style>
