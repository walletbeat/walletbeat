<script lang="ts">
	// Types/constants
	import type { Column } from '@/lib/DataTable.svelte'
	import type { RatedWallet } from '@/schema/wallet'
	import { type AttributeGroup, Rating } from '@/schema/attributes'
	import { Variant } from '@/schema/variants'


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
	import Pie, { PieLayout } from '@/ui/atoms/Pie.svelte'
	import Table from '@/ui/atoms/Table.svelte'
	import Typography from '@/ui/atoms/Typography.svelte'

	import UnfoldLessIcon from '@material-icons/svg/svg/unfold_less/baseline.svg?raw'
	import UnfoldMoreIcon from '@material-icons/svg/svg/unfold_more/baseline.svg?raw'

	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
	import OpenInNewRoundedIcon from '@material-icons/svg/svg/open_in_new//baseline.svg?raw'
</script>


<Table
	rows={wallets}
	getId={wallet => wallet.metadata.id}
	isRowDisabled={(wallet, table) => (
		Boolean(
			(walletTableState.selectedVariant && !(walletTableState.selectedVariant in wallet.variants))
			|| (table.columnSort?.direction && table.columns.find(column => column.id === table.columnSort!.columnId)?.getValue?.(wallet) === undefined)
		)
	)}
	onRowClick={(wallet, walletId) => {
		walletTableState.toggleRowExpanded(walletId)
	}}
	displaceDisabledRows={true}

	columns={
		[
			{
				id: 'displayName',
				name: 'Wallet',
				getValue: wallet => (
					wallet.metadata.displayName
				),
				isSticky: true,
			} satisfies Column<RatedWallet>,
			{
				id: 'overall',
				name: 'Rating',
				getValue(wallet) {
					// Calculate aggregate score across all attribute groups
					const scores = (
						this.children!
							.map(column => column.getValue(wallet))
							.filter(score => score !== undefined)
					)

					if (!scores.length) return undefined

					return scores.reduce((sum, score) => sum + score, 0) / scores.length
				},
				defaultSortDirection: 'desc',
				defaultIsExpanded: true,
				children: (
					attributeGroups
						.map(attrGroup => ({
							id: attrGroup.id,
							// name: `${attrGroup.icon} ${attrGroup.displayName}`,
							name: attrGroup.displayName,
							getValue: wallet => (
								calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])?.score ?? undefined
							),
							defaultSortDirection: 'desc',
							defaultIsExpanded: false,
							children: (
								Object.entries(attrGroup.attributes)
									.map(([attrId, attribute]) => ({
										id: `${attrGroup.id}.${attrId}`,
										// name: `${attribute.icon} ${attribute.displayName}`,
										name: attribute.displayName,
										getValue: wallet => {
											const evalAttr = wallet.overall[attrGroup.id]?.[attrId]
											return evalAttr?.evaluation?.value?.rating || undefined
										},
										defaultSortDirection: 'desc',
									} satisfies Column<RatedWallet>))
							),
						} satisfies Column<RatedWallet>))
				),
			} satisfies Column<RatedWallet>,
		]
	}
	defaultSort={{
		columnId: 'displayName',
		direction: 'asc',
	}}
>
	{#snippet headerCellSnippet({ column })}
		<span class="header-title">{column.name}</span>
	{/snippet}

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

		<!-- Overall rating -->
		{:else if column.id === 'overall'}
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

		<!-- Attribute group rating -->
		{:else if !column.id.includes('.')}
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

		<!-- Attribute rating -->
		{:else}
			{@const [groupId, attrId] = column.id.split('.')}
			{@const attrGroup = attributeGroups.find(attrGroup => attrGroup.id === groupId)!}
			{@const attribute = attrGroup.attributes[attrId]}
			{@const evalAttr = wallet.overall[groupId][attrId]}

			<div class="wallet-attribute-rating">
				<Pie
					layout={PieLayout.HalfTop}
					radius={24}
					levels={
						[
							{
								outerRadiusFraction: 1,
								innerRadiusFraction: 0.3,
								gap: 20,
								angleGap: 0,
							}
						]
					}
					padding={4}
					slices={
						[
							{
								id: attrId,
								color: evalAttr.evaluation.value.rating === Rating.PASS ? '#22c55e' : 
									evalAttr.evaluation.value.rating === Rating.PARTIAL ? '#eab308' : 
									evalAttr.evaluation.value.rating === Rating.FAIL ? '#ef4444' : '#6b7280',
								weight: 1,
								arcLabel: attribute.icon,
								tooltip: `${attribute.icon} ${attribute.displayName}`,
								tooltipValue: evalAttr.evaluation.value.rating,
							}
						]
					}
					centerLabel={evalAttr.evaluation.value.rating}
				/>
			</div>
		{/if}
	{/snippet}
</Table>


<style>
	.header-title {
		white-space: wrap;
		flex: 0 0 0;
		min-width: fit-content;
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

	.wallet-attribute-rating {
		margin-inline: -1em;
	}
</style>
