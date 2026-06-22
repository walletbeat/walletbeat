<script module lang="ts">
	export enum SummaryVisualization {
		None = 'none',
		ScoreDot = 'dot',
		Score = 'score',
		Stage = 'stage',
		Icon = 'icon',
	}
</script>


<script lang="ts">
	// Types/constants
	import type { Filter } from '@/components/Filters.svelte'
	import type { Column } from '@/components/Table.svelte'
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
		summaryVisualization = SummaryVisualization.Stage,
	}: {
		tableId?: string,
		title?: string
		wallets: RatedWallet[]
		attributeGroups: AttributeGroup<any>[]
		summaryVisualization?: SummaryVisualization
	} = $props()


	// State
	import { SvelteMap, SvelteSet } from 'svelte/reactivity'

	let attributeActiveFilters = $state(
		new SvelteSet<{ id: string, label: string, filterFunction: (attr: any) => boolean }>()
	)

	// (Derived)
	const stageFilterDefinitions = $derived(
		Array.from(
			stagesById.entries(),
			([stageId, stage]) => ({
				id: `stage-${stageId}`,
				label: stage.label,
				filterFunction: ({ attribute }) => (
					isAttributeUsedInStage(attribute, stageId)
				),
			})
		)
	)

	const allAttributes = $derived(
		attributeGroups
			.flatMap(attrGroup => (
				Object.entries(attrGroup.attributes)
					.map(([attributeId, attribute]) => ({
						attributeGroupId: attrGroup.id,
						attributeId,
						attribute,
					}))
			))
	)

	let filteredAttributes = $state<Array<{ attributeGroupId: string, attributeId: string, attribute: any }>>(
		[]
	)

	const displayedAttributeGroups = $derived.by(() => {
		let filtered = (
			wallets.find(w => w.variants[Variant.BROWSER] || w.variants[Variant.DESKTOP] || w.variants[Variant.MOBILE]) ?
				// Filter attribute groups to only include non-exempt attributes
				attributeGroups
					.map(attrGroup => ({
						...attrGroup,
						attributes: (
							Object.fromEntries(
								Object.entries(attrGroup.attributes)
									.filter(([attributeId, _]) => (
										wallets.find(w => w.variants[Variant.BROWSER] || w.variants[Variant.DESKTOP] || w.variants[Variant.MOBILE])
											?.overall[attrGroup.id]?.[attributeId]?.evaluation?.outcome?.rating !== Rating.EXEMPT
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

		// Filter by stage if any stage filters are active
		if (attributeActiveFilters.size > 0) {
			const filteredAttributeIds = new Set(
				filteredAttributes.map(a => `${a.attributeGroupId}.${a.attributeId}`)
			)

			return (
				filtered
					.map(attrGroup => ({
						...attrGroup,
						attributes: (
							Object.fromEntries(
								Object.entries(attrGroup.attributes)
									.filter(([attributeId, _]) =>
										filteredAttributeIds.has(`${attrGroup.id}.${attributeId}`)
									)
							)
						),
					}))
					.filter(attrGroup => (
						Object.keys(attrGroup.attributes).length > 0
					))
			)
		}

		return filtered
	})


	// State
	let activeFilters = $state(
		new SvelteSet<Filter<RatedWallet>>()
	)

	let filteredWallets = $derived(
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

	let showStage = $state(
		true
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

	const hasNonApplicableStages = $derived(
		filteredWallets.length > 0 &&
		filteredWallets.every(wallet => {
			const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)
			return stage === 'NOT_APPLICABLE' || stage === null || ladderEvaluation === null
		})
	)

	const attributesExemptForAllWallets = $derived(
		new Set(
			attributeGroups.flatMap(attrGroup =>
				Object.keys(attrGroup.attributes)
					.filter(attributeId => {
						const walletsWithAttribute = filteredWallets.filter(wallet =>
							wallet.overall[attrGroup.id]?.[attributeId] !== undefined
						)
						return (
							walletsWithAttribute.length > 0 &&
							walletsWithAttribute.every(wallet =>
								wallet.overall[attrGroup.id]?.[attributeId]?.evaluation?.outcome?.rating === Rating.EXEMPT
							)
						)
					})
					.map(attributeId => `${attrGroup.id}.${attributeId}`)
			)
		)
	)


	// Functions
	import { variantToName } from '@/constants/variants'
	import { getWalletUrl } from '@/utils/wallet-url'
	import { calculateAttributeGroupScore, calculateOverallScore, formatAttributeGroupTitleText } from '@/schema/attribute-groups'
	import { evaluatedAttributesEntries, ratingToColor, formatAttributeTitleText } from '@/schema/attributes'
	import { formatScore } from '@/schema/score'
	import { isLabeledUrl } from '@/schema/url'
	import { hasVariant } from '@/schema/variants'
	import { attributeVariantSpecificity, VariantSpecificity,walletSupportedAccountTypes } from '@/schema/wallet'
	import { getWalletStageAndLadder } from '@/utils/stage'
	import { isNonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
	import { isAttributeUsedInStage, stagesById } from '@/utils/stage-attributes'

	const getWalletScore = (wallet: RatedWallet): number | null => {
		const overallScore = calculateOverallScore(
			wallet.overall,
			ag => displayedAttributeGroups.some(attrGroup => attrGroup.id === ag.id),
		)
		return overallScore === null ? null : overallScore.score
	}
	const walletStageThenScoreCompare = (walletA: RatedWallet, walletB: RatedWallet): number => {
		// Returns -1 for wallets that cleared no stage (or N/A);
		// 0, 1, 2... for wallets that cleared stage 0, 1, 2...
		const stageIndex = (wallet: RatedWallet): number => {
			const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)
			if (stage === 'NOT_APPLICABLE' || stage === null || ladderEvaluation === null) return -1
			if (typeof stage === 'string') return -1 // QUALIFIED_FOR_NO_STAGES
			const idx = ladderEvaluation.ladder.stages.findIndex(s => s.id === stage.id)
			return idx >= 0 ? idx : -1
		}
		const stageDiff = stageIndex(walletA) - stageIndex(walletB)
		if (stageDiff !== 0) return stageDiff
		const scoreA = getWalletScore(walletA)
		const scoreB = getWalletScore(walletB)
		return ((scoreA as number | null) ?? 0) - ((scoreB as number | null) ?? 0)
	}


	// Mobile filter helpers
	const variantWbIconIds: Record<Variant, WBIconFontID> = {
		[Variant.BROWSER]: 'wallet_browser',
		[Variant.DESKTOP]: 'wallet_desktop',
		[Variant.MOBILE]: 'wallet_mobile',
		[Variant.EMBEDDED]: 'wallet_embedded',
		[Variant.HARDWARE]: 'wallet_hardware',
	}

	const mobileAccountTypeFilters = [
		{ id: 'accountType-eoa', label: 'EOA' },
		{ id: 'accountType-eip7702', label: 'EIP-7702' },
		{ id: 'accountType-erc4337', label: 'ERC-4337' },
		{ id: 'accountType-safe', label: 'safe' },
		{ id: 'accountType-mpc', label: 'MPC' },
	] as const

	const activeFilterIds = $derived(
		new Set(Array.from(activeFilters).map(f => f.id))
	)

	const activeStageFilterIds = $derived(
		new Set(Array.from(attributeActiveFilters).map(f => f.id))
	)

	const visibleMobileAccountTypeFilterIds = $derived(
		new Set(
			wallets.flatMap(wallet => {
				const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
				if (!accountTypes) return []
				return [
					AccountType.eoa in accountTypes ? 'accountType-eoa' : null,
					AccountType.eip7702 in accountTypes ? 'accountType-eip7702' : null,
					AccountType.rawErc4337 in accountTypes ? 'accountType-erc4337' : null,
					AccountType.safe in accountTypes ? 'accountType-safe' : null,
					AccountType.mpc in accountTypes ? 'accountType-mpc' : null,
				].filter((id): id is string => id !== null)
			})
		)
	)


	// Actions
	import type { ComponentProps } from 'svelte'

	let toggleFilterById: ComponentProps<typeof Filters<RatedWallet>>['toggleFilterById'] = $state()
	let toggleFilter: ComponentProps<typeof Filters<RatedWallet>>['toggleFilter'] = $state()

	let toggleAttributeFilterById: ComponentProps<typeof Filters<{ attributeGroupId: string, attributeId: string, attribute: any }>>['toggleFilterById'] = $state()

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
	import Pie, { PieLayout, type Slice } from '@/components/Pie.svelte'
	import Select from '@/components/Select.svelte'
	import Table, { ColumnAlignment, SortDirection } from '@/components/Table.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import TooltipOrAccordion from '@/components/TooltipOrAccordion.svelte'
	import WalletStageSummary from './WalletStageSummary.svelte'
	import Typography from '@/components/Typography.svelte'

	import EipDetails from '@/views/EipDetails.svelte'
	import WalletAttributeGroupSummary, { WalletAttributeGroupSummaryType } from '@/views/WalletAttributeGroupSummary.svelte'
	import WalletAttributeSummary, { WalletAttributeSummaryType } from '@/views/WalletAttributeSummary.svelte'
	import WalletOverallSummary, { WalletSummaryType } from '@/views/WalletOverallSummary.svelte'
	import WalletStageBadge from './WalletStageBadge.svelte'


	// Styles
	import { scoreToColor, stageToColor } from '@/utils/colors'
	import type { WBIconFontID } from '@/styles/wbicons'


	// Flower visualization helpers
	const attributeGroupFlowerGradient: NonNullable<Slice['gradient']> = {
		areaRadiusStops: [
			0.000000, 0.038097, 0.075252, 0.111402, 0.146585, 0.180353, 0.213312, 0.245668, 0.277513,
			0.308937, 0.339923, 0.370813, 0.401695, 0.432635, 0.463538, 0.494531, 0.525379, 0.555836,
			0.586127, 0.616255, 0.646222, 0.676031, 0.705683, 0.735183, 0.764631, 0.793975, 0.823297,
			0.852492, 0.881757, 0.911014, 0.940339, 0.969777, 1.000000,
		],
		colors: [
			ratingToColor(Rating.UNRATED),
			ratingToColor(Rating.FAIL),
			ratingToColor(Rating.PARTIAL),
			ratingToColor(Rating.PASS),
		],
		transparentStopColor: ratingToColor(Rating.UNRATED),
	}
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

		<!-- Mobile-only filter UI -->
		<div class="mobile-filters">
			<div class="mobile-filter-row">
				{#if !hasNonApplicableStages && stageFilterDefinitions.length > 0}
					<div class="mobile-filter-group">
						<legend>stages</legend>
						<div class="mobile-filter-items">
							{#each stageFilterDefinitions as stageFilter}
								{@const isActive = activeStageFilterIds.has(stageFilter.id)}
								<button
									class="filter-circle"
									class:active={isActive}
									aria-pressed={isActive}
									aria-label={stageFilter.label}
									onclick={() => toggleAttributeFilterById?.(stageFilter.id)}
								>
									<span class="filter-circle-number">{stageFilter.label.split(' ').at(-1)}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div class="mobile-filter-group">
					<legend>variant</legend>
					<div class="mobile-filter-items">
						{#each allSupportedVariants as variant}
							{@const filterId = `variant-${variant}`}
							{@const isActive = activeFilterIds.has(filterId)}
							<div class="mobile-filter-item">
								<button
									class="filter-circle"
									class:active={isActive}
									aria-pressed={isActive}
									aria-label={variantToName(variant, true)}
									onclick={() => toggleFilterById?.(filterId)}
								>
									<span data-wbicon data-icon={variantWbIconIds[variant]}></span>
								</button>
								<span class="filter-circle-label">{variantToName(variant, false)}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="mobile-filter-group mobile-filter-group-centered">
				<legend>account type</legend>
				<div class="mobile-filter-items">
					{#each mobileAccountTypeFilters.filter(f => visibleMobileAccountTypeFilterIds.has(f.id)) as { id, label }}
						{@const isActive = activeFilterIds.has(id)}
						<div class="mobile-filter-item">
							<button
								class="filter-circle"
								class:active={isActive}
								aria-pressed={isActive}
								aria-label={label}
								onclick={() => toggleFilterById?.(id)}
							>
								<span data-wbicon data-icon="account_type"></span>
							</button>
							<span class="filter-circle-label">{label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div
			class="filters"
			data-scroll-item="inline-detached"
			data-scroll-container="inline"
		>
			<div
				data-scroll-item="inline-size-max"
				data-row
			>
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
										Object.entries(variants)
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
										id: 'accountType-safe',
										label: 'Safe',
										icon: KeyIcon,
										filterFunction: wallet => {
											const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
											return accountTypes !== null && AccountType.safe in accountTypes
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

				{#if !hasNonApplicableStages && stageFilterDefinitions.length > 0}
					<Filters
						items={allAttributes}
						filterGroups={[
							{
								id: 'stage',
								label: 'Attributes',
								displayType: 'group',
								exclusive: false,
								operation: 'union',
								filters: stageFilterDefinitions,
							},
						]}
						bind:activeFilters={attributeActiveFilters}
						bind:filteredItems={filteredAttributes}
						bind:toggleFilterById={toggleAttributeFilterById}
					/>
				{/if}
			</div>
		</div>
	</header>

	<div
		class="desktop-table-container"
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
					const attrGroupColumns: Column<RatedWallet>[] = (
						displayedAttributeGroups
							.map(attrGroup => ({
								id: attrGroup.id,
								name: attrGroup.displayName,
								value: wallet => {
									const attrGroupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])
									return attrGroupScore === null ? null : attrGroupScore.score
								},

								sort: {
									defaultDirection: SortDirection.Descending,
								},

								align: ColumnAlignment.Center,

								subcolumns: (
									Object.entries(attrGroup.attributes)
										.map(([attributeId, attribute]) => ({
											id: `${attrGroup.id}.${attributeId}`,
											name: attribute.displayName,
											value: wallet => {
												const attribute = wallet.overall[attrGroup.id]?.[attributeId]
												return attribute?.evaluation?.outcome?.rating || undefined
											},
											sort: {
												defaultDirection: SortDirection.Descending,
											},
										}))
								),
								isDefaultExpanded: false,
							}))
					)

					return [
						{
							id: 'displayName',
							name: 'Wallet',
							value: wallet => wallet.metadata.displayName,

							sort: {
								defaultDirection: SortDirection.Ascending,
							},

							isSticky: true,
						} satisfies Column<RatedWallet>,

						...(hasNonApplicableStages ? [] : [{
							id: 'stage',
							name: 'Stage',
							value: wallet => {
								const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)
								if (stage === 'NOT_APPLICABLE' || stage === null || ladderEvaluation === null) return undefined
								if (typeof stage === 'string') return null
								const stageIndex = ladderEvaluation.ladder.stages.findIndex(s => s.id === stage.id)
								return stageIndex >= 0 ? stageIndex : null
							},

							sort: {
								defaultDirection: SortDirection.Descending,
							},

							align: ColumnAlignment.Center,
						} satisfies Column<RatedWallet>]),

						(
							attrGroupColumns.length > 1 ?
								{
									id: 'overall',
									name: 'Rating',
									value: wallet => getWalletScore(wallet),

									sort: {
										isDefault: true,
										defaultDirection: SortDirection.Descending,
										// Stages always take precedence over attribute scores when sorting:
										// a stage 1 wallet should never appear below a stage 0 wallet
										// regardless of how good its attribute scores are. Within the
										// same stage, fall back to the attribute score as a tiebreaker.
										compare: (_scoreA, _scoreB, walletA, walletB) => walletStageThenScoreCompare(walletA, walletB),
									},

									align: ColumnAlignment.Center,

									subcolumns: attrGroupColumns,
									isDefaultExpanded: false,
								}
							:
								{
									...attrGroupColumns[0],
									isDefaultExpanded: false,
								}
						),
					] as Column<RatedWallet>[]
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

				{#if column.id === 'stage'}
					{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}
					
					{#if stage === 'NOT_APPLICABLE' || stage === null || ladderEvaluation === null}
						<small>N/A</small>
					{:else}
						{@const stageValue = typeof stage === 'string' ? stage : stage.id}
						{@const stageFilterId = `stage-${stageValue}`}

						<Tooltip>
							<div
								role="button"
								tabindex="0"
								aria-label={stage === 'QUALIFIED_FOR_NO_STAGES' ? 'Filter by No Stage' : stage && typeof stage === 'object' ? `Filter by ${stage.label}` : 'Filter by stage'}
								onclick={(e) => {
									e.preventDefault()
									e.stopPropagation()
									toggleAttributeFilterById?.(stageFilterId)
								}}
								onkeydown={(e) => {
									if (e.key !== 'Enter' && e.key !== ' ') return

									e.preventDefault()
									e.stopPropagation()
									toggleAttributeFilterById?.(stageFilterId)
								}}
							>
								<WalletStageBadge
									{stage}
									{ladderEvaluation}
									size="medium"
								/>
							</div>

							{#snippet TooltipContent()}
								<WalletStageSummary
									{wallet}
									{stage}
									{ladderEvaluation}
								/>
							{/snippet}
						</Tooltip>
					{/if}
				{:else if column.id === 'displayName'}
					{@const displayName = value}
					{@const accountTypes = walletSupportedAccountTypes(wallet, selectedVariant ?? 'ALL_VARIANTS')}
					{@const supportedVariants = (
						[Variant.BROWSER, Variant.MOBILE, Variant.DESKTOP, Variant.EMBEDDED, Variant.HARDWARE]
							.filter(variant => variant in wallet.variants)
					)}

					{@const walletUrl = getWalletUrl(wallet, { variant: selectedVariant })}

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
										href={isLabeledUrl(wallet.metadata.urls?.websites[0]) ? wallet.metadata.urls.websites[0].url : wallet.metadata.urls.websites[0]}
										target="_blank"
										rel="noopener noreferrer"
									>
										<span aria-hidden="true">{@html GlobeIcon}</span>
										Website
									</a>

									{#if wallet.metadata.urls?.repository}
										<hr>

										<a
											href={isLabeledUrl(wallet.metadata.urls.repository[0]) ? wallet.metadata.urls.repository[0].url : wallet.metadata.urls.repository[0]}
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
						{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}

						<TooltipOrAccordion
							bind:isExpanded={
								() => isExpanded,
								setIsExpanded
							}
						>
							{@const overallFilteredAttributeIds = attributeActiveFilters.size > 0 ? new Set(
								filteredAttributes.map(a => `${a.attributeGroupId}.${a.attributeId}`)
							) : null}
							<Pie
								layout={PieLayout.FullTop}
								padding={8}
								radius={80}
								levels={[
									{
										outerRadiusFraction: 1,
										innerRadiusFraction: (
											(summaryVisualization === SummaryVisualization.Score || summaryVisualization === SummaryVisualization.Stage || summaryVisualization === SummaryVisualization.Icon) ?
												0.15
											:
												0.1
										),
										gap: 4,
										angleGap: 5,
										offset: 3,
										outerCornerRadius: 28,
										innerCornerRadius: 16,
									},
									{
										outerRadiusFraction: 0.45,
										innerRadiusFraction: 0.1,
										gap: 0,
										anglePadding: -20,
										angleGap: -30,
										offset: 80,
										outerCornerRadius: 8,
										innerCornerRadius: 8,
										labelSize: 9,
									}
								]}

								slices={
									displayedAttributeGroups.map(attrGroup => {
										const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])
										const evalGroup = wallet.overall[attrGroup.id]

										return {
											id: `attrGroup_${attrGroup.id}`,
											arcLabel: (groupScore !== null && groupScore.hasUnratedComponent) ? '*' : '',
										arcIconId: attrGroup.icon,
											color: (
												groupScore !== null ?
													scoreToColor(groupScore.score)
												:
													'var(--rating-unrated)'
											),
											titleText: formatAttributeGroupTitleText(
												attrGroup,
												groupScore,
												summaryVisualization === SummaryVisualization.Score || summaryVisualization === SummaryVisualization.ScoreDot,
											),
											gradient: attributeGroupFlowerGradient,
											weight: 1,
											...evalGroup && {
												children: (
													evaluatedAttributesEntries(evalGroup)
														.filter(([attributeId, attribute]) => (
															(
																attribute?.evaluation?.outcome?.rating !== Rating.EXEMPT
																|| !attributesExemptForAllWallets.has(`${attrGroup.id}.${attributeId}`)
															)
															&& (
																overallFilteredAttributeIds === null
																|| overallFilteredAttributeIds.has(`${attrGroup.id}.${attributeId}`)
															)
														))
														.map(([attributeId, attribute]) => ({
															id: `attrGroup_${attrGroup.id}__attr_${attributeId}`,
															color: ratingToColor(attribute.evaluation.outcome.rating),
															weight: attrGroup.attributeWeights[attributeId],
															arcLabel: '',
																arcIconId: attribute.attribute.icon,
															titleText: formatAttributeTitleText(attribute),
															...attribute.evaluation.outcome.rating === Rating.EXEMPT && {
																opacity: 0.33,
															},
														}))
												),
											},
										}
									})
								}

								{highlightedSliceId}
								onSliceClick={sliceId => {
									const [_attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									selectedAttribute = attributeId && selectedAttribute === attributeId ? undefined : attributeId
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
									{#if summaryVisualization === SummaryVisualization.Icon}
										<img
											src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
											width="40"
											height="40"
											alt=""
										/>
									{:else if summaryVisualization === SummaryVisualization.Stage}
										{#if stage && stage !== 'NOT_APPLICABLE' && stage !== 'QUALIFIED_FOR_NO_STAGES' && ladderEvaluation}
											{@const stageIndex = ladderEvaluation.ladder.stages.findIndex(s => s.id === stage.id)}
											{@const maxStages = ladderEvaluation.ladder.stages.length}
											{#if stageIndex >= 0}
												<span
													class="pie-center-stage-label"
												>
													{stageIndex}
												</span>
											{:else}
												<span>❔</span>
											{/if}
										{:else}
											<span>❔</span>
										{/if}
									{:else if summaryVisualization === SummaryVisualization.Score}
										<span>
											{formatScore(score)}
										</span>
									{:else if summaryVisualization === SummaryVisualization.ScoreDot}
										<span
											class="pie-center-dot"
											style:--pie-center-color={scoreToColor(score === null ? null : score.score)}
											title={score !== null && score.hasUnratedComponent ? '*contains unrated components' : undefined}
										></span>
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
										summaryType={WalletAttributeSummaryType.Rating}
										{isInTooltip}
									/>
								{:else if displayedGroup}
									<WalletAttributeGroupSummary
										{wallet}
										attributeGroup={displayedGroup}
										summaryType={WalletAttributeGroupSummaryType.None}
										{isInTooltip}
									/>
								{:else}
									<WalletOverallSummary
										{wallet}
										{score}
										summaryType={showStage ? WalletSummaryType.Stage : WalletSummaryType.Score}
										{isInTooltip}	
									/>
								{/if}
							{/snippet}
						</TooltipOrAccordion>

					<!-- Attribute group rating -->
					{:else if column.id && !column.id.includes('.')}
						{@const attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === column.id)}
						{#if attrGroup}
							{@const evalGroup = wallet.overall[attrGroup.id]}
						{@const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, evalGroup)}

						{@const filteredAttributeIds = attributeActiveFilters.size > 0 ? new Set(
							filteredAttributes.map(a => `${a.attributeGroupId}.${a.attributeId}`)
						) : null}
						{@const evalEntries = (
							evaluatedAttributesEntries(evalGroup)
								.filter(([attributeId, attribute]) => (
									(
										attribute?.evaluation?.outcome?.rating !== Rating.EXEMPT
										|| !attributesExemptForAllWallets.has(`${attrGroup.id}.${attributeId}`)
									)
									&& (
										filteredAttributeIds === null
										|| filteredAttributeIds.has(`${attrGroup.id}.${attributeId}`)
									)
								))
						)}

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
								title={
									formatAttributeGroupTitleText(
										attrGroup,
										groupScore,
										summaryVisualization === SummaryVisualization.Score || summaryVisualization === SummaryVisualization.ScoreDot,
									)
								}

								layout={PieLayout.FullTop}
								radius={44}
								levels={[
									{
										outerRadiusFraction: 1,
										innerRadiusFraction: (
											summaryVisualization === SummaryVisualization.ScoreDot ?
												0.33
											: (summaryVisualization === SummaryVisualization.Score || summaryVisualization === SummaryVisualization.Icon) ?
												0.3
											:
												0.166
										),
										gap: 3,
										angleGap: 0,
										outerCornerRadius: 12,
										innerCornerRadius: 12,
									}
								]}
								padding={4}

								slices={
									!isNonEmptyArray(evalEntries) ?
										[]

									: nonEmptyMap(
										evalEntries,
										([attributeId, attribute]) => {
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
												color: ratingToColor(attribute.evaluation.outcome.rating),
												weight: attrGroup.attributeWeights[attributeId],
												arcLabel: '',
											arcIconId: attribute.attribute.icon,
												titleText: formatAttributeTitleText(attribute, tooltipSuffix),
												...attribute.evaluation.outcome.rating === Rating.EXEMPT && {
													opacity: 0.33,
												},
											}
										}
									)
								}
								{highlightedSliceId}
								onSliceClick={sliceId => {
									const [_attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									if (attributeId) {
										selectedAttribute = selectedAttribute === attributeId ? undefined : attributeId
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
									{#if summaryVisualization === SummaryVisualization.Icon}
										<span class="pie-center-icon" data-wbicon data-icon={attrGroup.icon}></span>
									{:else if summaryVisualization === SummaryVisualization.Score}
										<span>
											{formatScore(groupScore)}
										</span>
									{:else if summaryVisualization === SummaryVisualization.ScoreDot}
										<span
											class="pie-center-dot"
											style:--pie-center-color={scoreToColor(groupScore === null ? null : groupScore.score)}
											title={groupScore !== null && groupScore.hasUnratedComponent ? '*contains unrated components' : undefined}
										></span>
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
										summaryType={WalletAttributeSummaryType.Rating}
										{isInTooltip}
									/>
								{:else}
									<WalletAttributeGroupSummary
										{wallet}
										attributeGroup={attrGroup}
										summaryType={WalletAttributeGroupSummaryType.None}
										{isInTooltip}
									/>
								{/if}
							{/snippet}
						</TooltipOrAccordion>
						{/if}

					<!-- Attribute rating -->
					{:else if column.id && column.id.includes('.')}
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
								title={formatAttributeTitleText(attribute)}

								layout={PieLayout.HalfTop}
								radius={24}
								levels={
									[
										{
											outerRadiusFraction: 1,
											innerRadiusFraction: 0.3,
											offset: (
												attribute.evaluation.outcome.rating !== Rating.EXEMPT ?
													20
												:
													0
											),
											gap: 0,
											angleGap: 0,
											outerCornerRadius: 2,
											innerCornerRadius: 2,
										}
									]
								}
								padding={
									attribute.evaluation.outcome.rating !== Rating.EXEMPT ?
										4
									:
										24
								}

								centerLabel={attribute.evaluation.outcome.rating}

								slices={
									attribute.evaluation.outcome.rating !== Rating.EXEMPT ?
										[
											{
												id: `attrGroup_${attributeGroupId}__attr_${attributeId}`,
												color: ratingToColor(attribute.evaluation.outcome.rating),
												weight: 1,
												arcLabel: '',
												arcIconId: attribute.icon,
												titleText: formatAttributeTitleText(attribute),
											}
										]
									:
										[]
								}
								{highlightedSliceId}

								class="wallet-attribute-rating-pie"
							/>

							{#snippet ExpandedContent({ isInTooltip }: { isInTooltip?: boolean })}
								<WalletAttributeSummary
									{wallet}
									attribute={attribute}
									variant={selectedVariant}
									{isInTooltip}
								/>
							{/snippet}
						</TooltipOrAccordion>
					{/if}
				{/if}
			{/snippet}
		</Table>
	</div>

	<!-- Mobile wallet cards (shown only on mobile, replaces table) -->
	<div class="mobile-wallet-list">
		{#each filteredWallets.toSorted((walletA, walletB) => -walletStageThenScoreCompare(walletA, walletB)) as wallet, i}
			{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}
			{@const score = calculateOverallScore(wallet.overall, ag => displayedAttributeGroups.some(attrGroup => attrGroup.id === ag.id))}
			{@const overallFilteredAttributeIds = attributeActiveFilters.size > 0 ? new Set(filteredAttributes.map(a => `${a.attributeGroupId}.${a.attributeId}`)) : null}
			{@const cardSupportedVariants = [Variant.BROWSER, Variant.MOBILE, Variant.DESKTOP, Variant.EMBEDDED, Variant.HARDWARE].filter(v => v in wallet.variants)}
			{@const walletUrl = getWalletUrl(wallet, { variant: selectedVariant })}

			<div class="mobile-wallet-card">
				<!-- Header: rank · logo · name + variant icons -->
				<div class="mobile-card-header">
					<span class="mobile-card-rank">{i + 1}.</span>

					<div class="mobile-card-logo-wrap">
						<img
							src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
							alt={wallet.metadata.displayName}
							width="40" height="40"
						/>
					</div>

					<div class="mobile-name-and-variants">
						<h3 class="mobile-card-name">
							<a data-link="camouflaged" href={walletUrl}>{wallet.metadata.displayName}</a>
						</h3>

						<div class="mobile-card-variants">
							{#each cardSupportedVariants as variant}
								<button
									class="mobile-variant-btn"
									class:active={variant === selectedVariant}
									aria-label={variantToName(variant, true)}
									aria-pressed={variant === selectedVariant}
									onclick={() => toggleFilterById?.(`variant-${variant}`, true)}
								>
									<span data-wbicon data-icon={variantWbIconIds[variant]}></span>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Attribute group circles -->
				<div class="mobile-attr-grid">
					{#each displayedAttributeGroups as attrGroup}
						{@const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])}
						<a
							class="mobile-attr-item"
							href={getWalletUrl(wallet, { variant: selectedVariant, attributeAnchor: attrGroup.id })}
						>
							<div
								class="mobile-attr-circle"
								style:--attr-color={groupScore !== null ? scoreToColor(groupScore.score) : 'var(--rating-unrated)'}
							>
								<span data-wbicon data-icon={attrGroup.icon}></span>
							</div>
							<span class="mobile-attr-label">{attrGroup.displayName}</span>
						</a>
					{/each}
				</div>

				<!-- Full-size overall Pie -->
				<div class="mobile-card-pie">
					<Pie
						layout={PieLayout.FullTop}
						padding={8}
						radius={100}
						levels={[
							{
								outerRadiusFraction: 1,
								innerRadiusFraction: 0.15,
								gap: 5,
								angleGap: 5,
								offset: 4,
								outerCornerRadius: 35,
								innerCornerRadius: 20,
							},
							{
								outerRadiusFraction: 0.45,
								innerRadiusFraction: 0.1,
								gap: 0,
								anglePadding: -20,
								angleGap: -30,
								offset: 100,
								outerCornerRadius: 10,
								innerCornerRadius: 10,
								labelSize: 9,
							}
						]}
						slices={
							displayedAttributeGroups.map(attrGroup => {
								const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])
								const evalGroup = wallet.overall[attrGroup.id]
								return {
									id: `m_${wallet.metadata.id}_ag_${attrGroup.id}`,
									arcLabel: (groupScore !== null && groupScore.hasUnratedComponent) ? '*' : '',
									arcIconId: attrGroup.icon,
									color: groupScore !== null ? scoreToColor(groupScore.score) : 'var(--rating-unrated)',
									titleText: formatAttributeGroupTitleText(attrGroup, groupScore, false),
									gradient: attributeGroupFlowerGradient,
									weight: 1,
									...evalGroup && {
										children: (
											evaluatedAttributesEntries(evalGroup)
												.filter(([attributeId, attribute]) => (
													(attribute?.evaluation?.outcome?.rating !== Rating.EXEMPT || !attributesExemptForAllWallets.has(`${attrGroup.id}.${attributeId}`))
													&& (overallFilteredAttributeIds === null || overallFilteredAttributeIds.has(`${attrGroup.id}.${attributeId}`))
												))
												.map(([attributeId, attribute]) => ({
													id: `m_${wallet.metadata.id}_ag_${attrGroup.id}_a_${attributeId}`,
													color: ratingToColor(attribute.evaluation.outcome.rating),
													weight: attrGroup.attributeWeights[attributeId],
													arcLabel: '',
													arcIconId: attribute.attribute.icon,
													titleText: formatAttributeTitleText(attribute),
													...attribute.evaluation.outcome.rating === Rating.EXEMPT && { opacity: 0.33 },
												}))
										),
									},
								}
							})
						}
					>
						{#snippet centerContentSnippet()}
							{#if stage && stage !== 'NOT_APPLICABLE' && stage !== 'QUALIFIED_FOR_NO_STAGES' && ladderEvaluation}
								{@const stageIndex = ladderEvaluation.ladder.stages.findIndex(s => s.id === stage.id)}
								{#if stageIndex >= 0}
									<span class="pie-center-stage-label">{stageIndex}</span>
								{/if}
							{/if}
						{/snippet}
					</Pie>
				</div>
			</div>
		{/each}
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

	.pie-center-stage-label {
		color: var(--pie-center-color);
	}

	.pie-center-dot {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background-color: var(--pie-center-color);
	}

	.pie-center-icon {
		font-size: 24px;
		line-height: 1;
	}

	button:has([data-badge]) {
		background: none;
		border: none;
		padding: 0;
	}

	/* ── Mobile filter UI ───────────────────────── */

	.mobile-filters {
		display: none;
		width: 100%;
	}

	/* Default: mobile-only elements hidden on desktop */
	.mobile-wallet-list {
		display: none;
	}

	@media (max-width: 768px) {
		/* Show mobile filters, hide desktop filter strip */
		.mobile-filters {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
		}

		.filters {
			display: none;
		}

		/* Make header stack vertically on mobile */
		:global(section[data-sticky-container]) header[data-sticky="inline"] {
			flex-direction: column;
			align-items: flex-start;
		}

		/* Hide desktop table — !important beats [data-scroll-item] global display:grid */
		:global(.desktop-table-container) {
			display: none !important;
		}

		.mobile-wallet-list {
			display: flex;
			flex-direction: column;
			padding-inline: 1.25rem;
		}
	}

	.mobile-filter-row {
		display: flex;
		gap: 2.5rem;
		align-items: flex-start;
	}

	.mobile-filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		legend {
			font-size: 0.75em;
			font-family: var(--font-mono, monospace);
			letter-spacing: 0.05em;
			color: var(--text-secondary);
			padding: 0;
		}

		&.mobile-filter-group-centered {
			align-items: center;
			width: 100%;
		}
	}

	.mobile-filter-items {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.mobile-filter-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
	}

	.filter-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 1px solid var(--icon-navigation-borderColor);
		background: none;
		color: inherit;
		padding: 0;
		cursor: pointer;
		transition-property: background-color, border-color, color;

		[data-wbicon] {
			font-size: 1.5rem;
			line-height: 1;
		}

		&.active {
			background-color: var(--accent-backgroundColor);
			border-color: var(--accent);
			color: var(--accent);
		}

		&:hover:not(.active) {
			background-color: rgba(255, 255, 255, 0.06);
		}
	}

	.filter-circle-number {
		font-size: 1rem;
		font-weight: 600;
		font-family: var(--font-mono, monospace);
		line-height: 1;
	}

	.filter-circle-label {
		font-size: 0.625rem;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		text-align: center;
	}

	/* ── Mobile wallet cards ────────────────────── */

	.mobile-wallet-card {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-block: 1.75rem;
		border-block-end: 1px solid rgba(255, 255, 255, 0.08);

		&:last-child {
			border-block-end: none;
		}
	}

	.mobile-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.mobile-card-rank {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 2rem;
		flex-shrink: 0;
	}

	.mobile-card-logo-wrap {
		width: 2.75rem;
		height: 2.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		img {
			width: 100%;
			height: 100%;
			object-fit: contain;
		}
	}

	.mobile-name-and-variants {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.mobile-card-name {
		font-size: 1.25rem;
		font-weight: 700;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;

		a {
			color: inherit;
			text-decoration: none;
		}
	}

	.mobile-card-variants {
		display: flex;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.mobile-variant-btn {
		width: 2rem;
		height: 2rem;
		border: none;
		background: none;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition-property: color;

		[data-wbicon] {
			font-size: 1.25rem;
			line-height: 1;
		}

		&.active {
			color: var(--accent);
		}
	}

	.mobile-attr-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1.25rem 0.5rem;

		/* First two items sit in row 1, centered across 6 columns */
		.mobile-attr-item:nth-child(1) {
			grid-column: 2 / span 2;
		}
		.mobile-attr-item:nth-child(2) {
			grid-column: 4 / span 2;
		}
		/* Items 3-5 auto-fill row 2 spanning 2 columns each */
		.mobile-attr-item:nth-child(n + 3) {
			grid-column: span 2;
		}
	}

	.mobile-attr-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		text-decoration: none;
	}

	.mobile-attr-circle {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--attr-color) 20%, transparent);
		color: var(--attr-color);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		[data-wbicon] {
			font-size: 1.4rem;
			line-height: 1;
		}
	}

	.mobile-attr-label {
		font-size: 0.6rem;
		line-height: 1.3;
		text-align: center;
		color: var(--text-secondary);
		max-width: 4.5rem;
		overflow-wrap: break-word;
	}

	.mobile-card-pie {
		display: flex;
		justify-content: center;
	}
</style>
