<script module lang="ts">
	export enum SummaryVisualization {
		None = 'none',
		Dot = 'dot',
		Score = 'score',
	}
</script>


<script lang="ts">
	// Types/constants
	import type { Filter } from '@/components/Filters.svelte'
	import type { Column } from '@/components/TableState.svelte'
	import { variants } from '@/constants/variants'
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { allHardwareModels } from '@/data/hardware-wallets'
	import { type AttributeGroup, Rating, ratingIcons } from '@/schema/attributes'
	import { AccountType } from '@/schema/features/account-support'
	import { HardwareWalletManufactureType } from '@/schema/features/profile'
	import { Variant } from '@/schema/variants'
	import type { RatedWallet } from '@/schema/wallet'


	// Props
	let {
		tableId,
		title,
		wallets,
		attributeGroups,
		summaryVisualization = SummaryVisualization.Dot,
	}: {
		tableId?: string,
		title?: string
		wallets: RatedWallet[]
		attributeGroups: AttributeGroup<any>[]
		summaryVisualization?: SummaryVisualization
	} = $props()


	// (Derived)
	const displayedAttributeGroups = $derived(
		wallets.find(w => w.variants.browser || w.variants.desktop || w.variants.mobile) ?
			// Filter attribute groups to only include non-exempt attributes
			attributeGroups
				.map(attrGroup => ({
					...attrGroup,
					attributes: (
						Object.fromEntries(
							Object.entries(attrGroup.attributes)
								.filter(([attributeId, _]) => (
									wallets.find(w => w.variants.browser || w.variants.desktop || w.variants.mobile)
										?.overall[attrGroup.id]?.[attributeId]?.evaluation?.value?.rating !== Rating.EXEMPT
								))
						)
					),
				}))
				.filter(attrGroup => (
					Object.keys(attrGroup.attributes).length > 0
				))
		:
			attributeGroups
	)


	// State
	import { SvelteMap, SvelteSet } from 'svelte/reactivity'

	let activeFilters = $state(
		new SvelteSet<Filter<RatedWallet>>()
	)

	let filteredWallets = $state(
		wallets
	)

	let selectedAttribute: string | undefined = $state(
		undefined
	)

	let expandedRowIds = $state(
		new SvelteSet<string>()
	)

	let activeEntityId: {
		walletId: string
		attributeGroupId: string
		attributeId?: string
	} | undefined = $state(
		undefined
	)

	let sortedColumn: Column<RatedWallet> | undefined = $state(
		undefined
	)

	let selectedModels = $state(
		new SvelteMap<string, string>()
	)


	// (Derived)
	const allSupportedVariants = $derived(
		Object.values(Variant)
			.filter(variant => (
				wallets.some(wallet => variant in wallet.variants)
			))
	)

	const selectedVariant = $derived.by(() => {
		// Derive selected variant from active filters
		const activeVariantFilters = Array.from(activeFilters).filter(filter =>
			filter.id.startsWith('variant-') && filter.id !== 'variant-all'
		)

		// Only return a variant if exactly one variant filter is active
		return (
			activeVariantFilters.length === 1 ?
				activeVariantFilters[0].id.replace('variant-', '') as Variant
			:
				undefined
		)
	})


	// Functions
	import { variantToName } from '@/constants/variants'
	import { calculateAttributeGroupScore, calculateOverallScore } from '@/schema/attribute-groups'
	import { evaluatedAttributesEntries, ratingToColor } from '@/schema/attributes'
	import { isLabeledUrl } from '@/schema/url'
	import { hasVariant } from '@/schema/variants'
	import { attributeVariantSpecificity, VariantSpecificity,walletSupportedAccountTypes } from '@/schema/wallet'
	import { isNonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'


	// Actions
	import type { ComponentProps } from 'svelte'

	let toggleFilterById: ComponentProps<typeof Filters<RatedWallet>>['toggleFilterById'] = $state()
	let toggleFilter: ComponentProps<typeof Filters<RatedWallet>>['toggleFilter'] = $state()

	const toggleRowExpanded = (id: string) => {
		if (expandedRowIds.has(id))
			expandedRowIds.delete(id)
		else
			expandedRowIds.add(id)
	}

	const isRowExpanded = (walletId: string) => (
		expandedRowIds.has(walletId)
	)


	// Components
	import FactoryIcon from '@material-icons/svg/svg/factory/baseline.svg?raw'
	import HandymanIcon from '@material-icons/svg/svg/handyman/baseline.svg?raw'
	import HardwareIcon from '@material-icons/svg/svg/hardware/baseline.svg?raw'

	import AppWindowIcon from 'lucide-static/icons/app-window.svg?raw'
	import ChartPieIcon from 'lucide-static/icons/chart-pie.svg?raw'
	import GithubIcon from 'lucide-static/icons/github.svg?raw'
	import GlobeIcon from 'lucide-static/icons/globe.svg?raw'
	import KeyIcon from 'lucide-static/icons/key.svg?raw'
	import WalletIcon from 'lucide-static/icons/wallet.svg?raw'

	import Filters from '@/components/Filters.svelte'
	import Pie, { PieLayout } from '@/components/Pie.svelte'
	import Select from '@/components/Select.svelte'
	import Table from '@/components/Table.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import TooltipOrAccordion from '@/components/TooltipOrAccordion.svelte'
	import Typography from '@/components/Typography.svelte'

	import EipDetails from '@/views/EipDetails.svelte'
	import WalletAttributeGroupSummary from '@/views/WalletAttributeGroupSummary.svelte'
	import WalletAttributeSummary from '@/views/WalletAttributeSummary.svelte'
	import WalletOverallSummary from '@/views/WalletOverallSummary.svelte'


	// Styles
	import { scoreToColor } from '@/utils/colors'
</script>


<section
	data-sticky-container
	data-column="gap-6"
>
	<header
		data-sticky="inline"
		data-scroll-item="inline-detached padding-match-start"
		data-row="wrap"
	>
		{#if title}
			<h2>{title}</h2>
		{/if}

		<Filters
			items={wallets}
			filterGroups={
				[
					{
						id: 'walletType',
						label: 'Type',
						displayType: 'select',
						exclusive: true,
						defaultFilter: '',
						filters: [
							{
								id: '',
								label: 'All',
							},
							{
								id: 'walletType-software',
								label: 'Software',
								icon: AppWindowIcon,
								filterFunction: wallet => !hasVariant(wallet.variants, Variant.HARDWARE)
							},
							{
								id: 'walletType-hardware',
								label: 'Hardware',
								icon: HardwareIcon,
								filterFunction: wallet => hasVariant(wallet.variants, Variant.HARDWARE)
							},
							{
								id: 'walletType-embedded',
								label: 'Embedded',
								icon: WalletIcon,
								filterFunction: wallet => hasVariant(wallet.variants, Variant.EMBEDDED)
							},
						],
					},
					{
						id: 'manufactureType',
						label: 'Manufacture Type',
						displayType: 'group',
						exclusive: false,
						filters: [
							{
								id: `manufactureType-${HardwareWalletManufactureType.FACTORY_MADE}`,
								label: 'Factory-Made',
								icon: FactoryIcon,
								filterFunction: wallet => (
									hasVariant(wallet.variants, Variant.HARDWARE) &&
									wallet.metadata.hardwareWalletManufactureType === HardwareWalletManufactureType.FACTORY_MADE
								)
							},
							{
								id: `manufactureType-${HardwareWalletManufactureType.DIY}`,
								label: 'DIY',
								icon: HandymanIcon,
								filterFunction: wallet => (
									hasVariant(wallet.variants, Variant.HARDWARE) &&
									wallet.metadata.hardwareWalletManufactureType === HardwareWalletManufactureType.DIY
								)
							},
						],
					},
					{
						id: 'variant',
						label: 'Variant',
						// displayType: 'select',
						// exclusive: true,
						displayType: 'group',
						exclusive: false,
						filters: [
							// {
							// 	id: '',
							// 	label: 'All',
							// },
							...(
								(Object.entries(variants) as [Variant, { label: string, icon: string }][])
									.map(([variant, { label, icon }]) => ({
										id: `variant-${variant}`,
										label,
										icon,
										filterFunction: (wallet: RatedWallet) => Boolean(wallet.variants[variant])
									}))
							),
						],
					},
					{
						id: 'accountType',
						label: 'Account Type',
						displayType: 'group',
						exclusive: false,
						filters: [
							{
								id: 'accountType-eoa',
								label: 'EOA',
								icon: KeyIcon,
								filterFunction: wallet => {
									const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
									return accountTypes !== null && AccountType.eoa in accountTypes
								}
							},
							{
								id: 'accountType-eip7702',
								label: 'EIP-7702',
								icon: KeyIcon,
								filterFunction: wallet => {
									const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
									return accountTypes !== null && AccountType.eip7702 in accountTypes
								}
							},
							{
								id: 'accountType-erc4337',
								label: 'ERC-4337',
								icon: KeyIcon,
								filterFunction: wallet => {
									const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
									return accountTypes !== null && AccountType.rawErc4337 in accountTypes
								}
							},
							{
								id: 'accountType-mpc',
								label: 'MPC',
								icon: KeyIcon,
								filterFunction: wallet => {
									const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
									return accountTypes !== null && AccountType.mpc in accountTypes
								}
							},
						],
					},
				]
			}
			bind:activeFilters
			bind:filteredItems={filteredWallets}
			bind:toggleFilter
			bind:toggleFilterById
		/>
	</header>

	<div
		data-scroll-item="inline-attached underflow-center overflow-start snap-block-start"
	>
		<Table
			{tableId}
			class="wallet-table"

			rows={wallets}
			rowId={wallet => wallet.metadata.id}
			rowIsDisabled={wallet => (
				!(
					filteredWallets.includes(wallet)
					&& (!sortedColumn?.value || sortedColumn.value(wallet) !== undefined)
				)
			)}
			displaceDisabledRows={true}

			columns={
				(() => {
					const attrGroupColumns =
						displayedAttributeGroups
							.map(attrGroup => ({
								id: attrGroup.id,
								name: attrGroup.displayName,
								value: (wallet: RatedWallet) => {
									const attrGroupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])
									return attrGroupScore === null ? null : attrGroupScore.score
								},
								sort: {
									defaultDirection: 'desc',
								},

								subcolumns: (
									Object.entries(attrGroup.attributes)
										.map(([attributeId, attribute]) => ({
											id: `${attrGroup.id}.${attributeId}`,
											name: attribute.displayName,
											value: (wallet: RatedWallet) => {
												const attribute = wallet.overall[attrGroup.id]?.[attributeId]
												return attribute?.evaluation?.value?.rating || undefined
											},
											sort: { defaultDirection: 'desc' },
										} satisfies Column<RatedWallet>))
								),
								isDefaultExpanded: false,
							} satisfies Column<RatedWallet>))

					return [
						{
							id: 'displayName',
							name: 'Wallet',
							value: (wallet: RatedWallet) => wallet.metadata.displayName,

							sort: {
								defaultDirection: 'asc',
							},

							isSticky: true,
						} satisfies Column<RatedWallet>,

						(
							attrGroupColumns.length > 1 ?
								{
									id: 'overall',
									name: 'Rating',
									value: (wallet: RatedWallet) => {
										const overallScore = calculateOverallScore(
											wallet.overall,
											ag => displayedAttributeGroups.some(attrGroup => attrGroup.id === ag.id),
										)
										return overallScore === null ? null : overallScore.score
									},

									sort: {
										isDefault: true,
										defaultDirection: 'desc',
									},

									subcolumns: attrGroupColumns,
									isDefaultExpanded: true,
								} satisfies Column<RatedWallet>
							:
								attrGroupColumns[0]
						),
					]
				})()
			}
			bind:sortedColumn
		>
			{#snippet Cell({
				row: wallet,
				column,
				value,
			})}
				{@const isExpanded = isRowExpanded(wallet.metadata.id)}
				{@const setIsExpanded = (open: boolean) => {
					if (open)
						expandedRowIds.add(wallet.metadata.id)
					else
						expandedRowIds.delete(wallet.metadata.id)
				}}

				{#if column.id === 'displayName'}
					{@const displayName = value}
					{@const accountTypes = walletSupportedAccountTypes(wallet, selectedVariant ?? 'ALL_VARIANTS')}
					{@const supportedVariants = (
						[Variant.BROWSER, Variant.MOBILE, Variant.DESKTOP, Variant.EMBEDDED, Variant.HARDWARE]
							.filter(variant => variant in wallet.variants)
					)}

					{@const walletUrl = `/${wallet.metadata.id}/${selectedVariant ? `?variant=${selectedVariant}` : ''}`}

					<TooltipOrAccordion
						class="wallet-info-details"
						bind:isExpanded={
							() => isExpanded,
							setIsExpanded
						}
						tooltipButtonTriggerPlacement="behind"
						tooltipHoverTriggerPlacement="around"
						showAccordionMarker
						tooltipMaxWidth="20rem"
					>
						<div class="wallet-info" data-row="start">
							<span class="row-count" data-row="center"></span>

							<img
								alt={displayName}
								src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
								width="16"
								height="16"
							/>

							<div class="name-and-tags" data-column="gap-2">
								<div class="name" data-column="gap-1">
									<div data-row="gap-3 start wrap">
										<h3>
											<a data-link="camouflaged" href={walletUrl}>{displayName}</a>
										</h3>

										{#if 'hardware' in wallet.variants}
											{@const brandModels = allHardwareModels.filter(m => m.brandId === wallet.metadata.id)}

											{#if brandModels.length > 1}
												<Select
													bind:value={
														() => selectedModels.get(wallet.metadata.id),
														(value) => {
															if (value)
																selectedModels.set(wallet.metadata.id, value)
															else
																selectedModels.delete(wallet.metadata.id)
														}
													}
													options={[
														{ value: undefined, label: 'All models' },
														...brandModels.map(m => ({ value: m.id.split('.')[1], label: `${m.modelName}`, icon: m.iconUrl })),
													]}
												/>
											{/if}
										{/if}
									</div>

									{#if selectedVariant && selectedVariant in wallet.variants}
										<div class="variant">
											<a data-link="camouflaged" href={walletUrl}>{variants[selectedVariant].label}</a>
										</div>
									{/if}
								</div>

								<div class="tags" data-row="start gap-1 wrap">
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
															filterId: 'accountType-erc4337',
															type: 'eip',
															eipTooltipContent: erc4337,
														},
														AccountType.eip7702 in accountTypes && {
															label: `#${eip7702.number}`,
															filterId: 'accountType-eip7702',
															type: 'eip',
															eipTooltipContent: eip7702,
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
											.filter(Boolean)
									) as tag (tag.label)}
										{#if tag.eipTooltipContent}
											<Tooltip
												placement="inline-end"
											>
												<div
													data-tag={tag.type}
													role="button"
													tabindex="0"
													aria-label="Filter by {tag.label}"
													onclick={e => {
														e.stopPropagation()
														toggleFilterById!(tag.filterId)
													}}
													onkeydown={e => {
														if (e.key !== 'Enter' && e.key !== ' ') return

														e.stopPropagation()
														toggleFilterById!(tag.filterId)
													}}
												>
													{tag.label}
												</div>

												{#snippet TooltipContent()}
													<div class="eip-tooltip-content">
														<EipDetails
															eip={tag.eipTooltipContent}
														/>
													</div>
												{/snippet}
											</Tooltip>
										{:else}
											<button
												data-tag={tag.type}
												aria-label="Filter by {tag.label}"
												onclick={(e) => {
													e.stopPropagation()
													toggleFilterById!(tag.filterId)
												}}
											>
												{tag.label}
											</button>
										{/if}
									{/each}
								</div>
							</div>

							{#if allSupportedVariants.length > 1}
								<div class="variants" data-row="gap-1">
									{#each supportedVariants as variant}
										<button
											data-selected={variant === selectedVariant ? '' : undefined}
											aria-label={`Select ${variants[variant].label} variant`}
											aria-pressed={variant === selectedVariant}
											onclick={e => {
												e.stopPropagation()
												toggleFilterById!(`variant-${variant}`, true)
											}}
										>
											<span
												class="icon"
												title={variants[variant].label}
												aria-hidden="true"
											>
												{@html variants[variant].icon}
											</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#snippet ExpandedContent({ isInTooltip }: { isInTooltip?: boolean })}
							<div class="wallet-summary" data-card={isInTooltip ? 'radius p-sm' : undefined} data-column="gap-4">
								{#if selectedVariant && !wallet.variants[selectedVariant]}
									<p>
										{wallet.metadata.displayName} does not have a {selectedVariant} version.
									</p>

								{:else if wallet.metadata.blurb}
									<Typography
										content={wallet.metadata.blurb}
										strings={{
											WALLET_NAME: wallet.metadata.displayName,
											WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
										}}
									/>
								{/if}

								<div class="links" data-row="gap-3 start wrap">
									<a
										href={walletUrl}
										class="info-link"
									>
										<span aria-hidden="true">{@html ChartPieIcon}</span>
										View report
									</a>

									<hr>

									<a
										href={isLabeledUrl(wallet.metadata.url) ? wallet.metadata.url.url : wallet.metadata.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										<span aria-hidden="true">{@html GlobeIcon}</span>
										Website
									</a>

									{#if wallet.metadata.repoUrl}
										<hr>

										<a
											href={isLabeledUrl(wallet.metadata.repoUrl) ? wallet.metadata.repoUrl.url : wallet.metadata.repoUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											<span aria-hidden="true">{@html GithubIcon}</span>
											Source Code
										</a>
									{/if}
								</div>
							</div>
						{/snippet}
					</TooltipOrAccordion>

				{:else}
					{@const selectedSliceId =
						selectedAttribute ?
							attributeGroups.find(g => g.id in wallet.overall && selectedAttribute! in wallet.overall[g.id]) ?
								`attrGroup_${attributeGroups.find(g => g.id in wallet.overall && selectedAttribute! in wallet.overall[g.id])!.id}__attr_${selectedAttribute}`
							:
								undefined
						:
							undefined
					}

					{@const activeSliceId =
						activeEntityId && activeEntityId.walletId === wallet.metadata.id ?
							activeEntityId.attributeId ?
								`attrGroup_${activeEntityId.attributeGroupId}__attr_${activeEntityId.attributeId}`
							:
								`attrGroup_${activeEntityId.attributeGroupId}`
						:
							undefined
					}

					{@const highlightedSliceId = selectedSliceId ?? activeSliceId}

					<!-- Overall rating -->
					{#if column.id === 'overall'}
						{@const score =
							calculateOverallScore(
								wallet.overall,
								ag => displayedAttributeGroups.some(attrGroup => attrGroup.id === ag.id),
							)
						}

						<TooltipOrAccordion
							bind:isExpanded={
								() => isExpanded,
								setIsExpanded
							}
						>
							<Pie
								slices={
									displayedAttributeGroups.map(attrGroup => {
										const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])
										const evalGroup = wallet.overall[attrGroup.id]

										return {
											id: `attrGroup_${attrGroup.id}`,
											arcLabel: `${attrGroup.icon}${(groupScore !== null && groupScore.hasUnratedComponent) ? '*' : ''}`,
											color: (
												groupScore !== null ?
													scoreToColor(groupScore.score)
												:
													'var(--rating-unrated)'
											),
											tooltip: attrGroup.displayName,
											tooltipValue: (
												groupScore !== null && groupScore.score !== null ?
													`${
														(groupScore.score * 100).toFixed(0)
													}%${
														groupScore.hasUnratedComponent ? ' (has unrated components)' : ''
													}`
												:
													'N/A'
											),
											weight: 1,
											...evalGroup && {
												children: (
													evaluatedAttributesEntries(evalGroup)
														.filter(([_, attribute]) => (
															attribute?.evaluation?.value?.rating !== Rating.EXEMPT
														))
														.map(([attributeId, attribute]) => ({
															id: `attrGroup_${attrGroup.id}__attr_${attributeId}`,
															color: ratingToColor(attribute.evaluation.value.rating),
															weight: attrGroup.attributeWeights[attributeId],
															arcLabel: attribute.evaluation.value.icon ?? attribute.attribute.icon,
															tooltip: `${attribute.attribute.displayName}`,
															tooltipValue: ratingIcons[attribute.evaluation.value.rating],
														}))
												),
											},
										}
									})
								}
								layout={PieLayout.FullTop}
								padding={8}
								radius={80}
								levels={[
									{
										outerRadiusFraction: summaryVisualization === SummaryVisualization.Score ? 0.7 : 0.65,
										innerRadiusFraction: summaryVisualization === SummaryVisualization.Score ? 0.3 : 0.1,
										gap: 4,
										angleGap: 0
									},
									{
										outerRadiusFraction: 1,
										innerRadiusFraction: summaryVisualization === SummaryVisualization.Score ? 0.725 : 0.675,
										gap: 2,
										angleGap: 0,
									}
								]}
								{highlightedSliceId}
								onSliceClick={sliceId => {
									const [_attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									selectedAttribute = attributeId && selectedAttribute === attributeId ? undefined : attributeId

									if (!isExpanded)
										toggleRowExpanded(wallet.metadata.id)
								}}
								onSliceMouseEnter={sliceId => {
									const [attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									activeEntityId = {
										walletId: wallet.metadata.id,
										attributeGroupId: attributeGroupId,
										...(attributeId && { attributeId: attributeId }),
									}
								}}
								onSliceMouseLeave={sliceId => {
									activeEntityId = undefined
								}}
							>
								{#snippet centerContentSnippet()}
									{#if summaryVisualization === SummaryVisualization.Score}
										<text>
											{
												score !== null && score.score !== null ?
													`${
														score.score === 0 ?
															'\u{1f480}'
														: score.score === 1 ?
															'\u{1f4af}'
														:
															(score.score * 100).toFixed(0)
													}${
														score !== null && score.hasUnratedComponent ?
															'*'
														:
															''
													}`
												:
													'❓'
											}
										</text>
									{:else if summaryVisualization === SummaryVisualization.Dot}
										<circle
											r="4"
											fill={scoreToColor(score === null ? null : score.score)}
										>
											{#if score !== null && score.hasUnratedComponent}
												<title>
													*contains unrated components
												</title>
											{/if}
										</circle>
									{/if}
								{/snippet}
							</Pie>

							{#snippet ExpandedContent({ isInTooltip }: { isInTooltip?: boolean })}
								{@const displayedAttribute = (
									activeEntityId?.walletId === wallet.metadata.id ?
										activeEntityId?.attributeId ?
											wallet.overall[activeEntityId.attributeGroupId]?.[activeEntityId.attributeId]
										:
											undefined
									: selectedAttribute ?
										attributeGroups.find(g => g.id in wallet.overall && selectedAttribute! in wallet.overall[g.id]) ?
											wallet.overall[attributeGroups.find(g => g.id in wallet.overall && selectedAttribute! in wallet.overall[g.id])!.id]?.[selectedAttribute]
										:
											undefined
									:
										undefined
								)}

								{@const displayedGroup = (
									activeEntityId?.walletId === wallet.metadata.id ?
										attributeGroups.find(g => g.id === activeEntityId!.attributeGroupId)
									: selectedAttribute ?
										attributeGroups.find(g => g.id in wallet.overall && selectedAttribute! in wallet.overall[g.id])
									:
										undefined
								)}

								{#if displayedAttribute}
									<WalletAttributeSummary
										{wallet}
										attribute={displayedAttribute}
										variant={selectedVariant}
										showRating={true}
										{isInTooltip}
									/>
								{:else if displayedGroup}
									<WalletAttributeGroupSummary
										{wallet}
										attributeGroup={displayedGroup}
										{isInTooltip}
									/>
								{:else}
									<WalletOverallSummary
										{wallet}
										{score}
										{isInTooltip}
									/>
								{/if}
							{/snippet}
						</TooltipOrAccordion>

					<!-- Attribute group rating -->
					{:else if !column.id.includes('.')}
						{@const attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === column.id)!}
						{@const evalGroup = wallet.overall[attrGroup.id]}
						{@const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, evalGroup)}

						{@const evalEntries = evaluatedAttributesEntries(evalGroup)
							.filter(([_, attribute]) => (
								attribute?.evaluation?.value?.rating !== Rating.EXEMPT
							))}

						{@const hasActiveAttribute = activeEntityId?.walletId === wallet.metadata.id && activeEntityId?.attributeGroupId === attrGroup.id}

						{@const _currentAttribute = (
							hasActiveAttribute && activeEntityId ?
								evalGroup[activeEntityId.attributeId]
							: selectedAttribute ?
								evalGroup[selectedAttribute]
							:
								undefined
						)}

						<TooltipOrAccordion
							bind:isExpanded={
								() => isExpanded,
								setIsExpanded
							}
						>
							<Pie
								layout={PieLayout.FullTop}
								radius={44}
								levels={[
									{
										outerRadiusFraction: 1,
										innerRadiusFraction: summaryVisualization === SummaryVisualization.Score ? 0.3 : 0.166,
										gap: 3,
										angleGap: 0
									}
								]}
								padding={4}
								slices={
									!isNonEmptyArray(evalEntries) ?
										[]

									: nonEmptyMap(
										evalEntries,
										([attributeId, attribute]) => {
											const icon = attribute.evaluation.value.icon ?? attribute.attribute.icon

											const tooltipSuffix = (() => {
												const variant = selectedVariant

												if(!variant || !wallet.variants[variant])
													return

												const specificity = attributeVariantSpecificity(wallet, variant, attribute.attribute)

												return (
													specificity === VariantSpecificity.UNIQUE_TO_VARIANT ?
														` (${variantToName(variant, false)} only)`
													: specificity === VariantSpecificity.NOT_UNIVERSAL ?
														` (${variantToName(variant, false)} specific)`
													:
														undefined
												)
											})()

											return {
												id: `attrGroup_${attrGroup.id}__attr_${attributeId.toString()}`,
												color: ratingToColor(attribute.evaluation.value.rating),
												weight: attrGroup.attributeWeights[attributeId],
												arcLabel: icon,
												tooltip: `${icon} ${attribute.evaluation.value.displayName}${tooltipSuffix}`,
												tooltipValue: ratingIcons[attribute.evaluation.value.rating],
											}
										}
									)
								}
								{highlightedSliceId}
								onSliceClick={sliceId => {
									const [_attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									if (attributeId) {
										selectedAttribute = selectedAttribute === attributeId ? undefined : attributeId

										if (!isExpanded)
											toggleRowExpanded(wallet.metadata.id)
									}
								}}
								onSliceMouseEnter={sliceId => {
									const [attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									if (attributeId) {
										activeEntityId = {
											walletId: wallet.metadata.id,
											attributeGroupId: attributeGroupId,
											attributeId: attributeId,
										}
									}
								}}
								onSliceMouseLeave={_sliceId => {
									activeEntityId = undefined
								}}
								onSliceFocus={sliceId => {
									const [attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									if (attributeId) {
										activeEntityId = {
											walletId: wallet.metadata.id,
											attributeGroupId: attributeGroupId,
											attributeId: attributeId,
										}
									}
								}}
								onSliceBlur={sliceId => {
									activeEntityId = undefined
								}}
							>
								{#snippet centerContentSnippet()}
									{#if summaryVisualization === SummaryVisualization.Score}
										<text>
											{
												groupScore !== null && groupScore.score !== null ?
													`${
														groupScore.score === 0 ?
															'\u{1f480}'
														: groupScore.score === 1 ?
															'\u{1f4af}'
														:
															(groupScore.score * 100).toFixed(0)
													}${groupScore.hasUnratedComponent ? '*' : ''}`
												:
													'❓'
											}
										</text>
									{:else if summaryVisualization === SummaryVisualization.Dot}
										<circle
											r="4"
											fill={scoreToColor(groupScore === null ? null : groupScore.score)}
										>
											{#if groupScore !== null && groupScore.hasUnratedComponent}
												<title>
													*contains unrated components
												</title>
											{/if}
										</circle>
									{/if}
								{/snippet}
							</Pie>

							{#snippet ExpandedContent({ isInTooltip }: { isInTooltip?: boolean })}
								{@const displayedAttribute =
									activeEntityId?.walletId === wallet.metadata.id && activeEntityId?.attributeGroupId === attrGroup.id ?
										evalGroup[activeEntityId.attributeId]
									: selectedAttribute ?
										evalGroup[selectedAttribute]
									:
										undefined
								}

								{#if displayedAttribute}
									<WalletAttributeSummary
										{wallet}
										attribute={displayedAttribute}
										variant={selectedVariant}
										showRating={true}
										{isInTooltip}
									/>
								{:else}
									<WalletAttributeGroupSummary
										{wallet}
										attributeGroup={attrGroup}
										{isInTooltip}
									/>
								{/if}
							{/snippet}
						</TooltipOrAccordion>

					<!-- Attribute rating -->
					{:else}
						{@const [attributeGroupId, attributeId] = column.id.split('.')}
						{@const _attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === attributeGroupId)!}
						{@const attribute = wallet.overall[attributeGroupId][attributeId]}

						<TooltipOrAccordion
							bind:isExpanded={
								() => isExpanded,
								setIsExpanded
							}
						>
							<Pie
								layout={PieLayout.HalfTop}
								radius={24}
								levels={
									[
										{
											outerRadiusFraction: 1,
											innerRadiusFraction: 0.3,
											offset: (
												attribute.evaluation.value.rating !== Rating.EXEMPT ?
													20
												:
													0
											),
											gap: 0,
											angleGap: 0,
										}
									]
								}
								padding={
									attribute.evaluation.value.rating !== Rating.EXEMPT ?
										4
									:
										24
								}
								slices={
									attribute.evaluation.value.rating !== Rating.EXEMPT ?
										[
											{
												id: `attrGroup_${attributeGroupId}__attr_${attributeId}`,
												color: ratingToColor(attribute.evaluation.value.rating),
												weight: 1,
												arcLabel: attribute.icon,
												tooltip: `${attribute.icon} ${attribute.displayName}`,
												tooltipValue: attribute.evaluation.value.rating,
											}
										]
									:
										[]
								}
								{highlightedSliceId}
								centerLabel={attribute.evaluation.value.rating}
								class="wallet-attribute-rating-pie"
							/>

							{#snippet ExpandedContent({ isInTooltip }: { isInTooltip?: boolean })}
								<WalletAttributeSummary
									{wallet}
									attribute={attribute}
									variant={selectedVariant}
									showRating={false}
									{isInTooltip}
								/>
							{/snippet}
						</TooltipOrAccordion>
					{/if}
				{/if}
			{/snippet}
		</Table>
	</div>
</section>


<style>
	section {
		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSizeInline: 60.5rem;
		}
	}

	:global {
		.wallet-table {
			tr {
				&:has(svg[height="52"]) {
					--walletTable-rowClosed-blockSize: 52px;
				}

				&:has(svg[height="96"]) {
					--walletTable-rowClosed-blockSize: 96px;
				}

				&:has(svg[height="176"]) {
					--walletTable-rowClosed-blockSize: 176px;
				}

				td {
					&:not(:has(details:open)) {
						transition-property: vertical-align;
						transition-delay: 0.25s;
					}

					&:has(details:open) {
						--table-cell-verticalAlign: top;
					}
				}

				details.wallet-info-details {
					summary {
						box-sizing: content-box;
						margin: calc(-1 * var(--table-cell-padding));
						padding: var(--table-cell-padding);

						transition-property: opacity, scale, min-block-size, padding-block-end;
						min-block-size: var(--walletTable-rowClosed-blockSize);
					}

					&:open summary {
						min-block-size: 5rem;
						padding-block-end: 0.25rem;
					}
				}
			}
		}
	}

	.wallet-info {
		block-size: 5rem;

		text-align: start;

		.row-count {
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

		img {
			filter: drop-shadow(rgba(255, 255, 255, 0.1) 0px 0px 4.66667px);
			width: 2.25em;
			height: 2.25em;
			object-fit: contain;
			border-radius: 0.25em;
		}

		.name-and-tags {
			font-size: 0.85em;

			.name {

				h3 {
					font-weight: 600;
				}
			}

			.variant {
				font-size: smaller;
				opacity: 0.6;
			}
		}

		.variants {
			margin-inline-start: auto;

			font-size: 1.25em;

			button {
				aspect-ratio: 1;
				padding: 0.33em;

				background-color: light-dark(rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.18));
				border-radius: 50%;

				transition-property: background-color, opacity;

				&[data-selected] {
					background-color: var(--accent-backgroundColor);
					border-color: light-dark(rgba(0, 0, 0, 0.18), rgba(255, 255, 255, 0.33));
				}

				&:focus {
					border-color: var(--accent);
				}

				&:hover:not(:disabled) {
					filter: contrast(1.25) brightness(1.1);
				}

				&:disabled {
					opacity: 0.4;
				}

				.variants:has([data-selected]) &:not([data-selected]):not(:disabled) {
					opacity: 0.75;
				}
			}
		}
	}

	.wallet-summary {
		padding-inline: 1em;

		line-height: 1.6;
		text-align: start;

		&[data-card] {
			font-size: 0.75em;
		}

		.links {
			hr {
				margin: 0;
				width: 0;
				height: 1.25em;

				border: none;
				border-inline-start: var(--separator-width) solid currentColor;
				opacity: 0.5;
			}
		}
	}

	:global(.wallet-attribute-rating-pie) {
		margin-inline: -1em;
	}

	.eip-tooltip-content {
		width: 34rem;
	}
</style>
