<script lang="ts" generics="
	_AttributeGroupId extends string
">
	// Types/constants
	import type { Filter } from '@/components/Filters.svelte'
	import type { Column } from '@/components/Table.svelte'
	import type { Ladders } from '@/schema/ladders'
	import { variants } from '@/constants/variants'
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { allHardwareModels } from '@/data/hardware-wallets'
	import type { AttributeGroup, AttributeTree } from '@/schema/attribute-groups'
	import { type Attribute, type OutcomeMetadata, Rating, ratingIcons } from '@/schema/attributes'
	import { AccountType } from '@/schema/features/account-support'
	import { HardwareWalletManufactureType } from '@/schema/features/profile'
	import { Variant } from '@/schema/variants'
	import type { WalletTableFocus } from '@/types/wallet-table'
	import { isRatedEvaluationTreeGroup, type RatedWallet } from '@/schema/wallet'


	// Props
	let {
		tableId,
		title,
		titleDisclaimer,
		ladders,
		wallets,
		attributeTree,
		focus,
	}: {
		tableId?: string,
		title?: string
		titleDisclaimer?: string
		ladders?: Ladders<_AttributeGroupId>
		wallets: RatedWallet<_AttributeGroupId>[]
		attributeTree: AttributeTree<_AttributeGroupId>
		/**
		 * Rank by one attribute group instead of the overall rating, with that
		 * group's attributes expanded. `summaryHref` links back to the overview.
		 */
		focus?: WalletTableFocus
	} = $props()

	const focusedAttributeGroup = $derived(
		focus ? Object.values(attributeTree).find(group => group.id === focus.attributeGroupId) ?? null : null
	)

	const attributeGroupScore = (attrGroup: AttributeGroup<_AttributeGroupId>, wallet: RatedWallet<_AttributeGroupId>) => {
		const evalGroup = wallet.overall[attrGroup.id]

		return evalGroup ? calculateAttributeGroupScore(attrGroup, evalGroup) : null
	}

	// Ascending; unrated groups sort lowest, ties fall back to the overall ranking.
	const compareAttributeGroup = (
		attrGroup: AttributeGroup<_AttributeGroupId>,
		walletA: RatedWallet<_AttributeGroupId>,
		walletB: RatedWallet<_AttributeGroupId>,
	) => (
		(attributeGroupScore(attrGroup, walletA)?.score ?? -1) - (attributeGroupScore(attrGroup, walletB)?.score ?? -1)
		|| walletStageThenScoreCompare(walletA, walletB)
	)

	const walletListUiId = $props.id()
	const walletListSelectId = `wallet-list-select-${walletListUiId}`

	const attributeGroupList = $derived(
		Object.values(attributeTree)
	)


	// State
	import { SvelteMap, SvelteSet } from 'svelte/reactivity'

	let attributeActiveFilters = $state(
		new SvelteSet<{ id: string, label: string, filterFunction: (item: { attributeGroupId: string, attributeId: string, attribute: Attribute<OutcomeMetadata> }) => boolean }>()
	)

	// (Derived)
	const stageFilterDefinitions = $derived(
		Array.from(
			stagesById.entries(),
			([stageId, stage]) => ({
				id: `stage-${stageId}`,
				label: stage.label,
				filterFunction: ({ attribute }: { attribute: Attribute<OutcomeMetadata> }) => (
					isAttributeUsedInStage(attribute, stageId)
				),
			})
		)
	)

	const allAttributes = $derived(
		attributeGroupList
			.flatMap(attrGroup => (
				attrGroup.attributes
					.map(({ attribute }) => ({
						attributeGroupId: attrGroup.id,
						attributeId: attribute.id,
						attribute,
					}))
			))
	)

	let filteredAttributes = $state<Array<{ attributeGroupId: string, attributeId: string, attribute: Attribute<OutcomeMetadata> }>>(
		[]
	)

	const displayedAttributeGroups = $derived.by(() => {
		let filtered = (
			wallets.find(w => w.variants[Variant.BROWSER] || w.variants[Variant.DESKTOP] || w.variants[Variant.MOBILE]) ?
				// Filter attribute groups to only include non-exempt attributes
				attributeGroupList
					.map(attrGroup => ({
						...attrGroup,
						attributes: (
							attrGroup.attributes.filter(({ attribute }) => (
								wallets.find(w => w.variants[Variant.BROWSER] || w.variants[Variant.DESKTOP] || w.variants[Variant.MOBILE])
									?.overall[attrGroup.id]?.[attribute.id]?.evaluation?.outcome?.rating !== Rating.EXEMPT
							))
						),
					}))
					.filter(attrGroup => (
						attrGroup.attributes.length > 0
					))
			:
				attributeGroupList
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
							attrGroup.attributes
								.filter(({ attribute }) => (
									filteredAttributeIds.has(`${attrGroup.id}.${attribute.id}`)
								))
						),
					}))
					.filter(attrGroup => (
						attrGroup.attributes.length > 0
					))
			)
		}

		return filtered
	})


	// State
	let activeFilters = $state(
		new SvelteSet<Filter<RatedWallet<_AttributeGroupId>>>()
	)

	const stageZeroWallets = $derived(wallets.filter(wallet => walletQualifiesForStageZero(wallet)))

	const otherWallets = $derived(wallets.filter(wallet => !walletQualifiesForStageZero(wallet)))

	const tableHasStageLadder = $derived(
		wallets.some(wallet => {
			const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)

			return stage !== 'NOT_APPLICABLE' && stage !== null && ladderEvaluation !== null
		}),
	)

	const showStageListSelect = $derived(
		tableHasStageLadder && stageZeroWallets.length > 0 && otherWallets.length > 0,
	)

	let walletListTab = $state<'stage-0' | 'others'>('stage-0')

	const listedWallets = $derived(
		!showStageListSelect ? wallets : walletListTab === 'others' ? otherWallets : stageZeroWallets,
	)

	// Overall ranking (stage, then score): the table's order while no column is sorted.
	const rankedWallets = $derived(
		listedWallets.toSorted((walletA, walletB) => walletStageThenScoreCompare(walletB, walletA))
	)

	const stageListSelectOptions = $derived([
		{ value: 'stage-0' as const, label: `Stage 0+ (${stageZeroWallets.length})` },
		{ value: 'others' as const, label: `Others (${otherWallets.length})` },
	])

	let filteredWallets = $derived(
		listedWallets
	)

	const filteredWalletIds = $derived(
		new Set(filteredWallets.map(wallet => wallet.metadata.id))
	)

	let selectedAttribute: string | undefined = $state(
		undefined
	)

	let expandedRowIds = $state(
		new SvelteSet<string>()
	)

	let activeEntityId: {
		walletId: string
		attributeGroupId: _AttributeGroupId
		attributeId?: string
	} | undefined = $state(
		undefined
	)

	let sortedColumn: Column<RatedWallet<_AttributeGroupId>> | undefined = $state(
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

	const hasNonApplicableStages = $derived(
		filteredWallets.length > 0 &&
		filteredWallets.every(wallet => {
			const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)
			return stage === 'NOT_APPLICABLE' || stage === null || ladderEvaluation === null
		})
	)

	const attributesExemptForAllWallets = $derived(
		new Set(
			attributeGroupList.flatMap(attrGroup =>
				attrGroup.attributes
					.map(({ attribute }) => attribute.id)
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
	import { calculateAttributeGroupScore, calculateOverallScore } from '@/schema/attribute-groups'
	import { evaluatedAttributesEntries, ratingToColor } from '@/schema/attributes'
	import { getUrl } from '@/schema/url'
	import { hasVariant } from '@/schema/variants'
	import { walletSupportedAccountTypes } from '@/schema/wallet'
	import { getWalletUrl } from '@/utils/urls'
	import { getWalletStageAndLadder, walletQualifiesForStageZero } from '@/utils/stage'
	import { isAttributeUsedInStage, stagesById } from '@/utils/stage-attributes'

		// Score helpers
		const getWalletScore = (wallet: RatedWallet<_AttributeGroupId>): number | null => {
			const overallScore = calculateOverallScore(
			attributeTree,
			wallet.overall,
			ag => displayedAttributeGroups.some(attrGroup => attrGroup.id === ag.id),
		)
		return overallScore === null ? null : overallScore.score
	}
	const walletStageThenScoreCompare = (
		walletA: RatedWallet<_AttributeGroupId>,
		walletB: RatedWallet<_AttributeGroupId>,
	): number => {
		// Returns -1 for wallets that cleared no stage (or N/A);
		// 0, 1, 2... for wallets that cleared stage 0, 1, 2...
		const stageIndex = (wallet: RatedWallet<_AttributeGroupId>): number => {
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

	const attributeStageFilterIds = $derived(
		attributeActiveFilters.size > 0 ?
			new Set(filteredAttributes.map(a => `${a.attributeGroupId}.${a.attributeId}`))
		:
			null
	)

	// A group's attribute ratings for one wallet, without attributes exempt for every
	// listed wallet or outside the active stage filters.
	const displayedAttributeRatings = (attrGroup: AttributeGroup<_AttributeGroupId>, wallet: RatedWallet<_AttributeGroupId>) => {
		const evalGroup = wallet.overall[attrGroup.id]

		return (
			evaluatedAttributesEntries(evalGroup)
				.filter(([attributeId, attribute]) => (
					(
						attribute.evaluation.outcome.rating !== Rating.EXEMPT
						|| !attributesExemptForAllWallets.has(`${attrGroup.id}.${attributeId}`)
					)
					&& (
						attributeStageFilterIds === null
						|| attributeStageFilterIds.has(`${attrGroup.id}.${attributeId}`)
					)
				))
				.map(([attributeId, attribute]) => ({
					id: attributeId.toString(),
					rating: attribute.evaluation.outcome.rating,
				}))
		)
	}


	// Mobile filter helpers
	const variantWbIconIds: Record<Variant, WBIconID> = {
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

	let toggleFilterById: ComponentProps<typeof Filters<RatedWallet<_AttributeGroupId>>>['toggleFilterById'] = $state()
	let toggleFilter: ComponentProps<typeof Filters<RatedWallet<_AttributeGroupId>>>['toggleFilter'] = $state()

	let toggleAttributeFilterById: ComponentProps<typeof Filters<{ attributeGroupId: string, attributeId: string, attribute: Attribute<OutcomeMetadata> }>>['toggleFilterById'] = $state()

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
	import Pie from '@/components/Pie.svelte'
	import { PieLayout } from '@/components/pie-geometry'
	import Select from '@/components/Select.svelte'
	import Table, { ColumnAlignment, SortDirection } from '@/components/Table.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import TooltipOrAccordion from '@/components/TooltipOrAccordion.svelte'
	import WalletStageSummary from './WalletStageSummary.svelte'
	import Typography from '@/components/Typography.svelte'

	import EipDetails from '@/views/EipDetails.svelte'
	import WalletAttributeGroupSummary, { WalletAttributeGroupSummaryType } from '@/views/WalletAttributeGroupSummary.svelte'
	import WalletAttributeSummary, { WalletAttributeSummaryType } from '@/views/WalletAttributeSummary.svelte'
	import RatingTally from '@/views/RatingTally.svelte'
	import ScoreBadge from '@/views/ScoreBadge.svelte'
	import WalletStageBadge from './WalletStageBadge.svelte'


	// Styles
	import { stageToColor } from '@/utils/colors'
	import type { WBIconID } from '@/styles/wbicons'

</script>


<section
	data-sticky-container
	data-column="gap-6"
>
	<header
		data-scroll-item="inline-detached padding-match-start"
		data-column="gap-4"
	>
		{#if title}
			<div class="title-group" data-column="gap-1">
				<h2>{title}</h2>

				{#if focusedAttributeGroup && focus}
					<p class="title-focus">
						Ranked by <strong>{focusedAttributeGroup.displayName}</strong>, with its attributes
						shown. <a href={focus.summaryHref}>See all ratings</a>
					</p>
				{/if}

				{#if titleDisclaimer}
					<p class="title-disclaimer">{titleDisclaimer}</p>
				{/if}
			</div>
		{/if}

		<!-- Mobile-only filter UI -->
		<div class="mobile-filters">
			<div class="mobile-filter-row">
				{#if !hasNonApplicableStages && stageFilterDefinitions.length > 0}
					<div class="mobile-filter-group">
						<legend>stages</legend>
						{#if showStageListSelect}
							<Select
								id="{walletListSelectId}-mobile"
								class="stage-list-select"
								bind:value={walletListTab}
								options={stageListSelectOptions}
								aria-label="Show Stage 0+ wallets or Others"
							/>
						{/if}
						{#if walletListTab !== 'others'}
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
						{/if}
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
									<span data-icon="wbicons-simple {variantWbIconIds[variant]}"></span>
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
								<span data-icon="wbicons-simple account_type"></span>
							</button>
							<span class="filter-circle-label">{label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div
			class="filters"
			data-scroll-container="inline"
		>
			<div
				data-scroll-item="inline-size-max"
				data-row
			>
				<Filters
					items={listedWallets}
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
												filterFunction: (wallet: RatedWallet<_AttributeGroupId>) => Boolean(wallet.variants[variant])
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

				{#if !hasNonApplicableStages && stageFilterDefinitions.length > 0 && walletListTab !== 'others'}
					<Filters
						items={allAttributes}
						filterGroups={[
							{
								id: 'stage',
								label: 'Attributes for',
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

	{#snippet AttributeGroupHeaderTitle({ column }: { column: Column<RatedWallet<_AttributeGroupId>> })}
		{@const attrGroup = attributeGroupList.find(attrGroup => attrGroup.id === column.id)}

		<span class="attribute-group-header-title">
			{#if attrGroup}
				<span data-icon="wbicons-simple {attrGroup.icon}" aria-hidden="true"></span>
			{/if}
			{column.name}
		</span>
	{/snippet}

	{#snippet StageListSelect(_ctx: { column: Column<RatedWallet<_AttributeGroupId>> })}
		{@const stageListAnchorName = `--${walletListSelectId}`}
		<button
			type="button"
			class="expansion-button"
			popovertarget={walletListSelectId}
			title="Show Stage 0+ wallets or Others"
			aria-label="Show Stage 0+ wallets or Others"
			style:anchor-name={stageListAnchorName}
			onclick={event => event.stopPropagation()}
		></button>
		<div
			id={walletListSelectId}
			class="stage-list-menu"
			popover="auto"
			role="listbox"
			aria-label="Show Stage 0+ wallets or Others"
			style:position-anchor={stageListAnchorName}
			style:position-area="block-end span-inline-end"
		>
			{#each stageListSelectOptions as option (option.value)}
				<button
					type="button"
					role="option"
					aria-selected={walletListTab === option.value}
					onclick={event => {
						walletListTab = option.value
						const menu = event.currentTarget.closest('[popover]')
						if (menu instanceof HTMLElement && 'hidePopover' in menu)
							menu.hidePopover()
					}}
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/snippet}

	<div
		class="desktop-table-container"
		data-scroll-item="inline-attached underflow-center overflow-start snap-block-start"
	>
		<Table
			{tableId}
			class="wallet-table"

			rows={rankedWallets}
			rowId={wallet => wallet.metadata.id}
			rowIsDisabled={wallet => (
				!(
					filteredWalletIds.has(wallet.metadata.id)
					&& (!sortedColumn?.value || sortedColumn.value(wallet) !== undefined)
				)
			)}
			displaceDisabledRows={true}

			columns={
				(() => {
					const attrGroupColumns: Column<RatedWallet<_AttributeGroupId>>[] = (
						displayedAttributeGroups
							.map(attrGroup => ({
								id: attrGroup.id,
								name: attrGroup.displayName,
								HeaderTitle: AttributeGroupHeaderTitle,
								value: wallet => attributeGroupScore(attrGroup, wallet)?.score ?? null,

								sort: {
									isDefault: focusedAttributeGroup?.id === attrGroup.id,
									defaultDirection: SortDirection.Descending,
									compare: (_scoreA, _scoreB, walletA, walletB) => compareAttributeGroup(attrGroup, walletA, walletB),
								},

								align: ColumnAlignment.Center,

								subcolumns: (
									attrGroup.attributes
										.map(({ attribute }) => ({
											id: `${attrGroup.id}.${attribute.id}`,
											name: attribute.displayName,
											value: wallet => {
												const evalAttr = wallet.overall[attrGroup.id]?.[attribute.id]
												return evalAttr?.evaluation?.outcome?.rating || undefined
											},
											sort: {
												defaultDirection: SortDirection.Descending,
											},
										}))
								),
								isDefaultExpanded: focusedAttributeGroup?.id === attrGroup.id,
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
						} satisfies Column<RatedWallet<_AttributeGroupId>>,

						...(hasNonApplicableStages ? [] : [{
							id: 'stage',
							name: showStageListSelect
								? (walletListTab === 'others' ? 'Others' : 'Stage 0+')
								: 'Stage',
							HeaderExtra: showStageListSelect ? StageListSelect : undefined,
							value: wallet => {
								const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)
								if (stage === 'NOT_APPLICABLE' || stage === null || ladderEvaluation === null) return undefined
								if (typeof stage === 'string') return null
								const stageIndex = ladderEvaluation.ladder.stages.findIndex(s => s.id === stage.id)
								return stageIndex >= 0 ? stageIndex : null
							},

							sort: {
								defaultDirection: SortDirection.Descending,
								// Within a stage, wallets rank by overall score.
								compare: (_stageA, _stageB, walletA, walletB) => (
									walletStageThenScoreCompare(walletA, walletB)
								),
							},

							align: ColumnAlignment.Center,
						} satisfies Column<RatedWallet<_AttributeGroupId>>]),

						...attrGroupColumns,
					] as Column<RatedWallet<_AttributeGroupId>>[]
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
					{:else if stage === 'UNRATED'}
						<WalletStageBadge {stage} {ladderEvaluation} size="medium" />
					{:else}
						{@const stageValue = typeof stage === 'string' ? stage : stage.id}
						{@const stageFilterId = `stage-${stageValue}`}

						<div
							role="button"
							tabindex="0"
							aria-label={stage === 'QUALIFIED_FOR_NO_STAGES' ? 'Filter by No Stage' : stage && typeof stage === 'object' ? `Filter by ${stage.label}` : 'Filter by stage'}
							onclick={event => {
								event.preventDefault()
								event.stopPropagation()
								toggleAttributeFilterById?.(stageFilterId)
							}}
							onkeydown={event => {
								if (event.key !== 'Enter' && event.key !== ' ') return

								event.preventDefault()
								event.stopPropagation()
								toggleAttributeFilterById?.(stageFilterId)
							}}
						>
							<WalletStageBadge
								{stage}
								{ladderEvaluation}
								size="medium"
							/>
						</div>
					{/if}
				{:else if column.id === 'displayName'}
					{@const displayName = wallet.metadata.displayName}
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

							<span class="wallet-icon" data-icon="shadow">
								<img
									alt={displayName}
									src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
									width="16"
									height="16"
								/>
							</span>

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
														value => {
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
														},
														AccountType.eip7702 in accountTypes && {
															label: `#${eip7702.number}`,
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
										<button
											data-tag={tag.type}
											aria-label="Filter by {tag.label}"
											onclick={event => {
												event.stopPropagation()
												toggleFilterById!(tag.filterId)
											}}
										>
											{tag.label}
										</button>
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
											onclick={event => {
												event.stopPropagation()
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

						{#snippet ExpandedContent({ isInTooltip })}
							<div class="wallet-summary" data-card={isInTooltip ? 'radius p-sm' : undefined} data-column="gap-4">
								{#if selectedVariant && !wallet.variants[selectedVariant]}
									<p>
										{wallet.metadata.displayName} does not have a {selectedVariant} version.
									</p>
								{/if}

								<div class="links" data-row="gap-3 start wrap">
									<a
										href={walletUrl}
										class="info-link"
									>
										<span aria-hidden="true">{@html ChartPieIcon}</span>
										View report
									</a>

									{#if wallet.metadata.urls?.websites?.[0] !== undefined}
										<hr>

										<a
											href={getUrl(wallet.metadata.urls.websites[0])}
											target="_blank"
											rel="noopener noreferrer"
										>
											<span data-icon="wbicons-simple browser_integration"></span>
											Website
										</a>
									{/if}

									{#if wallet.metadata.urls?.repositories?.[0] !== undefined}
										<hr>

										<a
											href={getUrl(wallet.metadata.urls.repositories[0])}
											target="_blank"
											rel="noopener noreferrer"
										>
											<span data-icon="wbicons-simple code_repository"></span>
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
							attributeGroupList.find(g => g.id in wallet.overall && selectedAttribute! in wallet.overall[g.id]) ?
								`attrGroup_${attributeGroupList.find(g => g.id in wallet.overall && selectedAttribute! in wallet.overall[g.id])!.id}__attr_${selectedAttribute}`
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

					<!-- Attribute group rating -->
					{#if typeof column.id === 'string' && !column.id.includes('.')}
						{@const attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === column.id)}
						{#if attrGroup && wallet.overall[attrGroup.id]}
							{@const evalGroup = wallet.overall[attrGroup.id]}
						{@const groupScore = calculateAttributeGroupScore(attrGroup, evalGroup)}

						{@const hasActiveAttribute = activeEntityId?.walletId === wallet.metadata.id && activeEntityId?.attributeGroupId === attrGroup.id}

						{@const _currentAttribute = (
							hasActiveAttribute && activeEntityId?.attributeId !== undefined ?
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
							<div class="attribute-group-rating" data-column="gap-1">
								<ScoreBadge score={groupScore} size="small" />

								<RatingTally
									attributes={displayedAttributeRatings(attrGroup, wallet)}
									onAttributeHover={attributeId => {
										activeEntityId = attributeId === undefined ? undefined : {
											walletId: wallet.metadata.id,
											attributeGroupId: attrGroup.id,
											attributeId,
										}
									}}
								/>
							</div>

							{#snippet ExpandedContent({ isInTooltip }: { isInTooltip?: boolean })}
								{@const displayedAttribute =
									activeEntityId?.walletId === wallet.metadata.id && activeEntityId?.attributeGroupId === attrGroup.id ?
										activeEntityId.attributeId !== undefined ?
											evalGroup[activeEntityId.attributeId]
										:
											undefined
									: selectedAttribute ?
										evalGroup[selectedAttribute]
									:
										undefined
								}

								{#if displayedAttribute}
									<WalletAttributeSummary
										{wallet}
										{ladders}
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
					{:else if typeof column.id === 'string' && column.id.includes('.')}
						{@const [attributeGroupId, attributeId] = column.id.split('.')}
						{@const _attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === attributeGroupId)!}
						{@const attribute = (
							isRatedEvaluationTreeGroup(attributeGroupId, wallet.overall) ?
								wallet.overall[attributeGroupId][attributeId]
							:
								undefined
						)}

						{#if attribute}
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
												arcIconId: attribute.attribute.icon,
												ariaLabel: `${attribute.attribute.displayName}: ${attribute.evaluation.outcome.rating}`,
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
									{ladders}
									attribute={attribute}
									variant={selectedVariant}
									{isInTooltip}
								/>
							{/snippet}
						</TooltipOrAccordion>
					{/if}
				{/if}
				{/if}
			{/snippet}
		</Table>
	</div>

	<!-- Mobile wallet cards (shown only on mobile, replaces table) -->
	<div class="mobile-wallet-list">
		{#each filteredWallets.toSorted((walletA, walletB) => -(focusedAttributeGroup ? compareAttributeGroup(focusedAttributeGroup, walletA, walletB) : walletStageThenScoreCompare(walletA, walletB))) as wallet, i}
			{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}
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

						{#if stage !== 'NOT_APPLICABLE' && stage !== null && ladderEvaluation !== null}
							<span class="mobile-card-stage">
								<WalletStageBadge
									{stage}
									{ladderEvaluation}
									size="medium"
								/>
							</span>
						{/if}

						<div class="mobile-card-variants">
							{#each cardSupportedVariants as variant}
								<button
									class="mobile-variant-btn"
									class:active={variant === selectedVariant}
									aria-label={variantToName(variant, true)}
									aria-pressed={variant === selectedVariant}
									onclick={() => toggleFilterById?.(`variant-${variant}`, true)}
								>
									<span data-icon="wbicons-simple {variantWbIconIds[variant]}"></span>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<dl class="mobile-card-groups">
					{#each displayedAttributeGroups as attrGroup (attrGroup.id)}
						{#if wallet.overall[attrGroup.id]}
							<div class="mobile-card-group">
								<dt>
									<span data-icon="wbicons-simple {attrGroup.icon}" aria-hidden="true"></span>
									{attrGroup.displayName}
								</dt>

								<dd>
									<RatingTally attributes={displayedAttributeRatings(attrGroup, wallet)} />

									<ScoreBadge score={attributeGroupScore(attrGroup, wallet)} size="small" />
								</dd>
							</div>
						{/if}
					{/each}
				</dl>
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

	/*
	 * At rest the table spans the same column as the title and filters above it
	 * (both gutters are equal here), and still grows and scrolls when rating
	 * columns are expanded.
	 */
	.desktop-table-container {
		grid-template-columns: minmax(
			calc(
				var(--sticky-sizeInline)
				- 2 * max(
					var(--scrollItem-inlineDetached-paddingStart),
					(var(--sticky-sizeInline) - var(--scrollItem-inlineDetached-maxSize)) / 2
				)
			),
			max-content
		);
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

						transition-property: opacity, scale, min-block-size;
						min-block-size: var(--walletTable-rowClosed-blockSize);

						> * {
							padding: var(--table-cell-padding);
						}
					}

					&:open summary {
						min-block-size: 5rem;

						> * {
							padding-block-end: 0.25rem;
						}
					}
				}
			}
		}
	}

	.title-focus {
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	.title-disclaimer {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	:global(select.stage-list-select) {
		font-weight: 600;
	}

	.stage-list-menu {
		margin: 0;
		padding: 0.25rem;
		min-inline-size: 12rem;
		inset: unset;

		background: var(--background-primary);
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);

		button {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			font-weight: 600;

			&[aria-selected='true'] {
				background-color: var(--accent-backgroundColor);
				border-color: var(--accent);
				color: var(--accent);
			}
		}
	}

	:global(.wallet-table .header-extra:has(.stage-list-menu:popover-open)) {
		--isExpanded: 1;
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

		.wallet-icon {
			--icon-size: 2.25em;
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

			/* Tags render at 0.66em; this keeps them legible at about 10px. */
			.tags {
				font-size: 1.15em;
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

	/* Icon above the name, which may break at a hyphen, keeps the group columns narrow. */
	.attribute-group-header-title {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3em;
		text-wrap: wrap;
		text-align: center;
		hyphens: manual;
	}

	.attribute-group-rating {
		--ratingTally-inlineSize: auto;
		--ratingTally-segmentInlineSize: 0.5625rem;

		align-items: center;
	}

	/* One toolbar: groups flow from the start edge, each a wrapping row of chips. */
	.filters {
		> [data-scroll-item][data-row] {
			inline-size: auto;
			flex-wrap: wrap;
			justify-content: start;
			align-items: start;
			column-gap: 2rem;
		}

		:global(form.menu) {
			--card-backgroundColor: transparent;
			--card-padding: 0;

			column-gap: 2rem;
			row-gap: 1rem;
		}

		:global(form.menu:not(:has(> [data-filter-group]))) {
			display: none;
		}

		:global([data-filter-group] > .group) {
			flex-flow: row wrap;
			gap: 0.375rem;
		}
	}

	.eip-tooltip-content {
		width: 34rem;
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

	@media (max-width: 1024px) {
		/* Show mobile filters, hide desktop filter strip */
		.mobile-filters {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
		}

		.filters {
			display: none;
		}

		:global(
			[data-scroll-container]
				[data-sticky-container]
				.desktop-table-container[data-scroll-item][data-scroll-item~="inline-attached"]
		) {
			display: none;
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

		/* Matches the desktop filter legends. */
		legend {
			font-size: 0.75em;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: var(--text-secondary);
			padding: 0;
		}

		&.mobile-filter-group-centered {
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

		[data-icon~="wbicons-complex"], [data-icon~="wbicons-simple"] {
			font-size: 1.5rem;
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
		display: grid;
		gap: 0.75rem;
		padding-block: 1rem;
		border-block-end: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);

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
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 1.5rem;
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
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
		flex: 1;
		min-width: 0;
	}

	/* Name on its own line, so stage and platforms always line up underneath. */
	.mobile-card-name {
		flex-basis: 100%;
		font-size: 1.125rem;
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

	.mobile-card-stage {
		flex-shrink: 0;
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

		[data-icon~="wbicons-complex"], [data-icon~="wbicons-simple"] {
			font-size: 1.25rem;
		}

		&.active {
			color: var(--accent);
		}
	}

	.mobile-card-groups {
		display: grid;
		gap: 0.375rem;
		margin: 0;
	}

	.mobile-card-group {
		display: grid;
		grid-template-columns: 8.5rem minmax(0, 1fr);
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;

		dt {
			display: flex;
			align-items: center;
			gap: 0.375rem;
		}

		dd {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 3.25rem;
			align-items: center;
			gap: 0.5rem;
			margin: 0;

			> :global([data-badge]) {
				justify-self: end;
			}
		}
	}
</style>
