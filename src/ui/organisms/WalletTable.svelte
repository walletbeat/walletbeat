<script lang="ts">
	// Types/constants
	import { Variant } from '@/schema/variants'
	import type { RatedWallet } from '@/schema/wallet'
	import type { AttributeGroup } from '@/schema/attribute-groups'


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
	import { variantUrlQuery } from '@/components/variants'
	import { isLabeledUrl } from '@/schema/url'


	// Components
	import WalletAttributeGroupRating from '@/ui/molecules/WalletAttributeGroupRating.svelte'
	import Table from '@/ui/atoms/Table.svelte'
	import Typography from '@/ui/atoms/Typography.svelte'

	import UnfoldLessIcon from '@material-icons/svg/svg/unfold_less/baseline.svg?raw'
	import UnfoldMoreIcon from '@material-icons/svg/svg/unfold_more/baseline.svg?raw'

	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
	import OpenInNewRoundedIcon from '@material-icons/svg/svg/open_in_new//baseline.svg?raw'

	import PhoneAndroidIcon from '@material-icons/svg/svg/phone_android/baseline.svg?raw'
	import LanguageIcon from '@material-icons/svg/svg/language/baseline.svg?raw'
	import MonitorIcon from '@material-icons/svg/svg/monitor/baseline.svg?raw'
	import SettingsEthernetIcon from '@material-icons/svg/svg/settings_ethernet/baseline.svg?raw'
	import HardwareIcon from '@material-icons/svg/svg/hardware/baseline.svg?raw'

	const variants = {
		[Variant.BROWSER]: {
			label: 'Browser extension',
			icon: LanguageIcon,
		},
		[Variant.DESKTOP]: {
			label: 'Desktop app',
			icon: MonitorIcon,
		},
		[Variant.MOBILE]: {
			label: 'Mobile app',
			icon: PhoneAndroidIcon,
		},
		[Variant.EMBEDDED]: {
			label: 'Embedded wallet',
			icon: SettingsEthernetIcon,
		},
		[Variant.HARDWARE]: {
			label: 'Hardware wallet',
			icon: HardwareIcon,
		},
	} as const satisfies Record<Variant, { label: string, icon: string }>
</script>


<Table
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
			attributeGroups
				.map(attrGroup => ({
					id: attrGroup.id,
					key: attrGroup.id,
					name: `${attrGroup.icon} ${attrGroup.displayName}`,
					getValue: ({ wallet }) => (
						wallet.overall[attrGroup.id] && attrGroup.score(wallet.overall[attrGroup.id])?.score || undefined
					),
					defaultSortDirection: 'desc',
				}))
		),
	]}
	defaultSort={{
		columnId: 'displayName',
		direction: 'asc',
	}}
	rows={wallets}
	getId={({ id }) => id}
	getDisabled={(row, table) => (
		(walletTableState.selectedVariant && !(walletTableState.selectedVariant in row.wallet.variants))
		|| (table.sortState?.direction && table.columns.find(column => column.id === table.sortState.columnId)?.getValue?.(row) === undefined)
	)}
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
							Object.entries(wallet.variants)
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
								renderable={wallet.metadata.blurb}
							/>
						</p>
					{:else}
						<p class="blurb">
							{wallet.metadata.displayName} does not have a {walletTableState.selectedVariant} version.
						</p>
					{/if}
					
					<div class="links">
						<a
							href={`/${wallet.metadata.id}/${variantUrlQuery(wallet.variants, walletTableState.selectedVariant)}`}
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
		{:else}
			{@const attrGroup = attributeGroups.find(attributeGroup => attributeGroup.id === column.id)}
			{@const evalGroup = wallet.overall[attrGroup.id]}
			{@const groupScore = attrGroup.score(wallet.overall[attrGroup.id])}

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
	}
</style>
