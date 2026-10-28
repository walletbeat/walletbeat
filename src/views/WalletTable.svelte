<script module lang="ts">

	export enum SummaryVisualization {
		None = 'none',
		ScoreDot = 'dot',
		Score = 'score',
		Stage = 'stage',
		Icon = 'icon',
	}
</script>


<script lang="ts" generics="
	_AttributeGroupId extends string
">
	import { defaultStageQualification, stageQualificationChoices, type StageQualificationId } from './wallet-table-stage'
	// Types/constants
	import { applyFilterSets, changeFilterChoice, resetFilterSets, type FilterChoice, type FilterSet } from '@/components/filters'
	import { hasVisiblePopoverInvoker, interest, interestDelayMs } from '@/components/interest'
	import { tooltipUsesDrawer } from '@/components/tooltip-presentation'
	import type { Column } from '@/components/Table.svelte'
	import { livePopoverTransition, startScopedViewTransition, viewTransitionName } from '@/utils/view-transition'
	import type { Ladders } from '@/schema/ladders'
	import type { Eip } from '@/schema/eips'
	import { variants } from '@/constants/variants'
	import { eip7702 } from '@/data/eips/eip-7702'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { allHardwareModels } from '@/data/hardware-wallets'
	import type { AttributeTree } from '@/schema/attribute-groups'
	import { type Attribute, type OutcomeMetadata, Rating, ratingIcons, ratingToColor } from '@/schema/attributes'
	import { AccountType } from '@/schema/features/account-support'
	import { HardwareWalletManufactureType } from '@/schema/features/profile'
	import { Variant } from '@/schema/variants'
	import { isRatedEvaluationTreeGroup, type RatedWallet } from '@/schema/wallet'
	import { WalletType } from '@/schema/wallet-types'
	import type { SortState } from '@/components/table-sort'
	import { walletSummaryHref } from './wallet-table-navigation'


	// Props
	let {
		tableId,
		title,
		titleDisclaimer,
		ladders,
		wallets,
		attributeTree,
		summaryVisualization = SummaryVisualization.Stage,
		initialStageSelection = defaultStageQualification,
		initialSort,
		stageNavigationBase,
	}: {
		tableId?: string,
		title?: string
		titleDisclaimer?: string
		ladders?: Ladders<_AttributeGroupId>
		wallets: RatedWallet<_AttributeGroupId>[]
		attributeTree: AttributeTree<_AttributeGroupId>
		summaryVisualization?: SummaryVisualization
		initialStageSelection?: StageQualificationId
		initialSort?: SortState<string>
		stageNavigationBase?: string
	} = $props()

	const attributeGroupList = $derived(
		Object.values(attributeTree)
	)
	const hasMultipleAttributeGroups = $derived(attributeGroupList.length > 1)
	const attributeRootColumnId = $derived(
		hasMultipleAttributeGroups ? 'overall' : attributeGroupList[0]?.id
	)
	const attributeGroupFlowerGradient = {
		colors: [Rating.UNRATED, Rating.FAIL, Rating.PARTIAL, Rating.PASS].map(ratingToColor),
		transparentStopColor: ratingToColor(Rating.UNRATED),
	}


	// State
	import { SvelteMap, SvelteSet } from 'svelte/reactivity'

	let attributeActiveChoices = $state(
		new SvelteSet<FilterChoice<{ attributeGroupId: string, attributeId: string, attribute: Attribute<OutcomeMetadata> }>>()
	)

	// (Derived)
	const stageFilterDefinitions = $derived(
		Array.from(
			stagesById.entries(),
			([stageId, stage]) => ({
				id: `stage-${stageId}`,
				label: stage.label,
				compactLabel: stage.label.replace(/^Stage\s+/u, '').replace('No Stage', '–'),
				matches: ({ attribute }: { attribute: Attribute<OutcomeMetadata> }) => (
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

	const attributeFilterSets = $derived([{
		id: 'stage',
		label: 'Stage',
		cardinality: 'inclusive' as const,
		match: 'union' as const,
		choices: stageFilterDefinitions,
	}])
	const filteredAttributeIds = $derived(
		attributeActiveChoices.size > 0 ?
			new Set(applyFilterSets(allAttributes, attributeFilterSets, attributeActiveChoices)
				.map(attribute => `${attribute.attributeGroupId}.${attribute.attributeId}`))
		:
			null
	)

	const displayedAttributeGroups = $derived.by(() => {
		const softwareWallet = wallets.find(w => w.variants[Variant.BROWSER] || w.variants[Variant.DESKTOP] || w.variants[Variant.MOBILE])
		const filtered = (
			softwareWallet ?
				// Filter attribute groups to only include non-exempt attributes
				attributeGroupList
					.map(attrGroup => ({
						...attrGroup,
						attributes: (
							attrGroup.attributes.filter(({ attribute }) => (
								softwareWallet.overall[attrGroup.id]?.[attribute.id]?.evaluation?.outcome?.rating !== Rating.EXEMPT
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
		if (filteredAttributeIds !== null) {
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
	const canHoverDetails = (event: MouseEvent) => {
		const details = event.currentTarget instanceof Element ? event.currentTarget.closest('details') : null
		return details !== null && (details.open || hasVisiblePopoverInvoker(details))
	}

	let selectedAttribute: string | undefined = $state(
		undefined
	)

	let expandedDisclosureIds = $state(
		new SvelteSet<string>()
	)

	let activeEntityId: {
		walletId: string
		attributeGroupId: _AttributeGroupId
		attributeId?: string
	} | undefined = $state(
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
		const activeVariantFilters = Array.from(activeChoices).filter(filter =>
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

	const hasNonApplicableStages = $derived.by(() =>
		wallets.length > 0 &&
		wallets.every(wallet => {
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
	import { evaluatedAttributesEntries } from '@/schema/attributes'
	import { formatScore } from '@/schema/score'
	import { getUrl } from '@/schema/url'
	import { hasVariant } from '@/schema/variants'
	import { attributeVariantSpecificity, VariantSpecificity,walletSupportedAccountTypes } from '@/schema/wallet'
	import { getWalletUrl } from '@/utils/urls'
	import { getWalletStageAndLadder } from '@/utils/stage'
	import { isNonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
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


	/**
	 * The facets a wallet can be described by. Each facet owns one set of mutually
	 * comparable values and is the sole author of how that set is filtered, tagged,
	 * and — once its column is expanded — rendered as a column of its own.
	 *
	 * `matches` takes the variant it is asked about: filters compare across every
	 * variant a wallet ships, while a cell describes the variant being viewed.
	 */
	type WalletFacetValue = {
		id: string
		label: string
		/** Tag text, where a cell abbreviates the filter's label. */
		tagLabel?: string
		tag?: string
		eip?: Eip
		icon?: string
		matches: (wallet: RatedWallet<_AttributeGroupId>, variant: Variant | 'ALL_VARIANTS') => boolean
	}

	type WalletFacet = {
		id: string
		label: string
		cardinality: 'exclusive' | 'inclusive'
		match: 'union' | 'intersection'
		defaultChoice?: string
		appliesTo?: (wallet: RatedWallet<_AttributeGroupId>) => boolean
		values: WalletFacetValue[]
	}

	const accountTypeMatches = (accountType: AccountType) => (
		(wallet: RatedWallet<_AttributeGroupId>, variant: Variant | 'ALL_VARIANTS') => {
			const accountTypes = walletSupportedAccountTypes(wallet, variant)
			return accountTypes !== null && accountType in accountTypes
		}
	)

	const hardwareManufactureMatches = (manufactureType: HardwareWalletManufactureType) => (
		(wallet: RatedWallet<_AttributeGroupId>) => (
			hasVariant(wallet.variants, Variant.HARDWARE)
			&& wallet.metadata.hardwareWalletManufactureType === manufactureType
		)
	)

	const walletFacets: WalletFacet[] = [
		{
			id: 'walletType',
			label: 'Type',
			cardinality: 'exclusive',
			match: 'union',
			defaultChoice: '',
			values: [
				{
					id: '',
					label: 'All',
					matches: () => true,
				},
				{
					id: 'walletType-software',
					label: 'Software',
					tag: 'wallet-type',
					icon: AppWindowIcon,
					matches: wallet => WalletType.SOFTWARE in wallet.types,
				},
				{
					id: 'walletType-hardware',
					label: 'Hardware',
					tag: 'wallet-type',
					icon: HardwareIcon,
					matches: wallet => WalletType.HARDWARE in wallet.types,
				},
				{
					id: 'walletType-embedded',
					label: 'Embedded',
					icon: WalletIcon,
					matches: wallet => WalletType.EMBEDDED in wallet.types,
				},
			],
		},
		{
			id: 'manufactureType',
			label: 'Manufacture Type',
			appliesTo: wallet => hasVariant(wallet.variants, Variant.HARDWARE),
			cardinality: 'inclusive',
			match: 'union',
			values: [
				{
					id: `manufactureType-${HardwareWalletManufactureType.FACTORY_MADE}`,
					label: 'Factory-Made',
					tag: 'manufacture-type',
					icon: FactoryIcon,
					matches: hardwareManufactureMatches(HardwareWalletManufactureType.FACTORY_MADE),
				},
				{
					id: `manufactureType-${HardwareWalletManufactureType.DIY}`,
					label: 'DIY',
					tag: 'manufacture-type',
					icon: HandymanIcon,
					matches: hardwareManufactureMatches(HardwareWalletManufactureType.DIY),
				},
			],
		},
		{
			id: 'variant',
			label: 'Variant',
			cardinality: 'inclusive',
			match: 'intersection',
			values: (
				Object.entries(variants)
					.map(([variant, { label, icon }]) => ({
						id: `variant-${variant}`,
						label,
						icon,
						matches: (wallet: RatedWallet<_AttributeGroupId>) => Boolean(wallet.variants[variant]),
					}))
			),
		},
		{
			id: 'accountType',
			label: 'Account Type',
			cardinality: 'inclusive',
			match: 'intersection',
			values: [
				{
					id: 'accountType-eoa',
					label: 'EOA',
					tag: 'account-type',
					matches: accountTypeMatches(AccountType.eoa),
				},
				{
					id: 'accountType-eip7702',
					label: 'EIP-7702',
					tagLabel: `#${eip7702.number}`,
					tag: 'eip',
					eip: eip7702,
					matches: accountTypeMatches(AccountType.eip7702),
				},
				{
					id: 'accountType-erc4337',
					label: 'ERC-4337',
					tagLabel: `#${erc4337.number}`,
					tag: 'eip',
					eip: erc4337,
					matches: accountTypeMatches(AccountType.rawErc4337),
				},
				{
					id: 'accountType-safe',
					label: 'Safe',
					tag: 'safe',
					matches: accountTypeMatches(AccountType.safe),
				},
				{
					id: 'accountType-mpc',
					label: 'MPC',
					tag: 'account-type',
					matches: accountTypeMatches(AccountType.mpc),
				},
			],
		},
	]

	const applicableWalletFacets = walletFacets.filter(facet => (
		!facet.appliesTo || wallets.some(facet.appliesTo)
	))

	const walletFacetFilterSets: FilterSet<RatedWallet<_AttributeGroupId>>[] = (
		applicableWalletFacets
			.map(({ id, label, cardinality, match, defaultChoice, values }) => {
				const choices = (
					values
						.map(({ id, label, tagLabel, icon, matches }) => ({
							id,
							label,
							compactLabel: tagLabel ?? label,
							icon,
							matches: (wallet: RatedWallet<_AttributeGroupId>) => matches(wallet, 'ALL_VARIANTS'),
						}))
				)

				return (
					cardinality === 'exclusive' ?
						{ id, label, cardinality, match, defaultChoice, choices }
					:
						{ id, label, cardinality, match, choices }
				)
			})
	)

	const stageStatusFilterSets: FilterSet<RatedWallet<_AttributeGroupId>>[] = wallets.some(wallet => (
		getWalletStageAndLadder(wallet).ladderEvaluation !== null
	)) ? [{
		id: 'stageStatus',
		label: 'Stage qualification',
		cardinality: 'exclusive',
		match: 'union',
		defaultChoice: defaultStageQualification,
		alwaysShowChoices: true,
		choices: stageQualificationChoices.map(choice => ({
			...choice,
			href: stageNavigationBase === undefined ? undefined : walletSummaryHref(stageNavigationBase, choice.id, initialSort),
			matches: choice.id === '' ? undefined : (wallet: RatedWallet<_AttributeGroupId>) => {
				const { stage } = getWalletStageAndLadder(wallet)
				return choice.id === defaultStageQualification
					? stage !== null && typeof stage === 'object'
					: stage === 'QUALIFIED_FOR_NO_STAGES'
			},
		})),
	}] : []
	const walletFilterSets = [...walletFacetFilterSets, ...stageStatusFilterSets]
	let activeChoices = $state<Set<FilterChoice<RatedWallet<_AttributeGroupId>>>>(
		resetFilterSets(walletFacetFilterSets, new Set()).union(new Set(
			stageStatusFilterSets.flatMap(set => set.choices.filter(choice => choice.id === initialStageSelection))
		))
	)

	let filteredWallets = $derived(
		applyFilterSets(wallets, walletFilterSets, activeChoices)
	)

	const filteredWalletIds = $derived(
		new Set(filteredWallets.map(wallet => wallet.metadata.id))
	)

	const viewId = $props.id()
	let expandedColumnIds = $state(
		new SvelteSet<string>()
	)
	const isWalletExpanded = $derived(
		expandedColumnIds.has('wallet')
	)
	const isWalletFilterSetVisible = (set: FilterSet<RatedWallet<_AttributeGroupId>>) => (
		set.choices.filter(choice => (
			choice.id
			&& applyFilterSets(wallets, walletFacetFilterSets, new Set([choice])).length > 0
		)).length > 1
	)

	const visibleWalletFilterSets = $derived(
		walletFacetFilterSets.filter(isWalletFilterSetVisible)
	)

	const walletFilterSlots = $derived(
		isWalletExpanded ?
			visibleWalletFilterSets.map(set => ({
				kind: 'wallet' as const,
				columnId: `facet-${set.id}`,
				panelId: `${viewId}-wallet-filters`,
				anchorName: `--${viewId}-${set.id}-filters`,
				clusterAnchorName: `--${viewId}-wallet-filter-cluster`,
				filterSets: [set],
			}))
		:
			visibleWalletFilterSets.length ?
				[{
					kind: 'wallet' as const,
					columnId: 'wallet',
					panelId: `${viewId}-wallet-filters`,
					anchorName: `--${viewId}-wallet-filters`,
					clusterAnchorName: `--${viewId}-wallet-filter-cluster`,
					filterSets: visibleWalletFilterSets,
				}]
			:
				[]
	)
	const attributeFilterSlots = $derived.by(() => {
		if (hasNonApplicableStages || stageFilterDefinitions.length === 0 || !attributeRootColumnId) return []

		return [{
			kind: 'attribute' as const,
			columnId: attributeRootColumnId,
			panelId: `${viewId}-attribute-filters`,
			anchorName: `--${viewId}-attribute-filters`,
			clusterAnchorName: `--${viewId}-attribute-filter-cluster`,
			filterSets: attributeFilterSets,
		}]
	})
	const stageFilterSlots = stageStatusFilterSets.length ? [{
		kind: 'stage' as const,
		columnId: 'stage',
		panelId: `${viewId}-stage-filters`,
		anchorName: `--${viewId}-stage-filters`,
		clusterAnchorName: `--${viewId}-stage-filter-cluster`,
		filterSets: stageStatusFilterSets,
	}] : []
	let walletFilterOwner = $state('wallet')
	const walletPanelSlot = $derived(walletFilterSlots.find(slot => slot.columnId === walletFilterOwner) ?? walletFilterSlots[0])
	// The panel and its choices have one lifetime; column expansion only changes ownership.
	const allFilterSlots = $derived([
		...(walletPanelSlot ? [{ ...walletPanelSlot, filterSets: visibleWalletFilterSets }] : []),
		...stageFilterSlots,
		...attributeFilterSlots,
	])

	let openFilterPanelId = $state<string>()

	// Actions
	import { flushSync, onMount, type ComponentProps } from 'svelte'
	let interactive = $state(false)
	let transitionRoot: HTMLElement | undefined = $state()
	type TransitionKind = 'sort' | 'columns' | 'filters' | 'disclosure'
	onMount(() => { interactive = true })

	const transitionUpdate = (update: () => void, kind: TransitionKind = 'disclosure') => {
		if (!transitionRoot) {
			update()
			return
		}

		startScopedViewTransition(
			transitionRoot,
			() => flushSync(update),
			kind === 'disclosure' ? 'none' : 'live',
		)
	}

	let toggleAttributeFilterById: ComponentProps<typeof Filters<{ attributeGroupId: string, attributeId: string, attribute: Attribute<OutcomeMetadata> }>>['toggleFilterById'] = $state()

	const toggleFilterById = (filterId: string, exclusive = false) => {
		const choice = walletFilterSets.flatMap(set => set.choices).find(candidate => candidate.id === filterId)
		if (!choice) return

		transitionUpdate(() => {
			activeChoices = changeFilterChoice(walletFilterSets, activeChoices, choice, exclusive)
		}, 'filters')
	}

	const disclosureId = (walletId: string, columnId: unknown) => JSON.stringify([walletId, columnId])

	$effect(() => {
		if (
			openFilterPanelId
			&& !allFilterSlots.some(slot => slot.panelId === openFilterPanelId)
		)
			openFilterPanelId = undefined
	})


	// Components
	import FactoryIcon from '@material-icons/svg/svg/factory/baseline.svg?raw'
	import HandymanIcon from '@material-icons/svg/svg/handyman/baseline.svg?raw'
	import HardwareIcon from '@material-icons/svg/svg/hardware/baseline.svg?raw'

	import AppWindowIcon from 'lucide-static/icons/app-window.svg?raw'
	import ChartPieIcon from 'lucide-static/icons/chart-pie.svg?raw'
	import WalletIcon from 'lucide-static/icons/wallet.svg?raw'

	import Filters from '@/components/Filters.svelte'
	import Pie from '@/components/Pie.svelte'
	import {
		overallRatingPieLevels,
		overallRatingPiePadding,
		overallRatingPieRadius,
		PieLayout,
	} from '@/components/pie-geometry'
	import Select from '@/components/Select.svelte'
	import Table, { ColumnAlignment, SortDirection } from '@/components/Table.svelte'
	import TooltipOrAccordion from '@/components/TooltipOrAccordion.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import EipDetails from '@/views/EipDetails.svelte'
	import WalletStageSummary from './WalletStageSummary.svelte'
	import Typography from '@/components/Typography.svelte'

	import WalletAttributeGroupSummary, { WalletAttributeGroupSummaryType } from '@/views/WalletAttributeGroupSummary.svelte'
	import WalletAttributeSummary, { WalletAttributeSummaryType } from '@/views/WalletAttributeSummary.svelte'
	import WalletOverallSummary, { WalletSummaryType } from '@/views/WalletOverallSummary.svelte'
	import WalletStageBadge from './WalletStageBadge.svelte'


	// Styles
	import { scoreToColor } from '@/utils/colors'
</script>


<section
	id={viewId}
	bind:this={transitionRoot}
	data-sticky-container
	data-column="gap-6"
>
	<header
		data-scroll-item="inline-detached padding-match-start"
		data-row="wrap"
	>
		{#if title}
			<div class="title-group" data-column="gap-1">
				<h2>{title}</h2>

				{#if titleDisclaimer}
					<p class="title-disclaimer">{titleDisclaimer}</p>
				{/if}
			</div>
		{/if}
		<noscript>
			{#if stageNavigationBase !== undefined && tableId !== undefined}
				<p>Column expansion and additional filters require JavaScript. You can sort columns and open wallet details.</p>
			{:else}
				<p>Sorting and column expansion require JavaScript. You can still open wallet details.</p>
			{/if}
		</noscript>
	</header>

	{#snippet FilterHeaderTitle({ column }: { column: Column<RatedWallet<_AttributeGroupId>> })}
		{@const walletSlot = [...walletFilterSlots, ...stageFilterSlots].find(filterSlot => filterSlot.columnId === column.id)}
		{@const attributeSlot = attributeFilterSlots.find(filterSlot => filterSlot.columnId === column.id)}
		{@const slot = walletSlot ?? attributeSlot}

		{#if slot}
			{@const activeIds = slot.kind === 'attribute' ?
				new Set([...attributeActiveChoices].map(filter => filter.id))
			:
				new Set([...activeChoices].map(filter => filter.id))}
			{@const activeSets = slot.filterSets.filter(set => (
				set.choices.some(choice => activeIds.has(choice.id) && choice.id !== '')
			))}

			<button
				type="button"
				class="filter-trigger"
				interestfor={slot.panelId}
				style:interest-delay-start={`${interestDelayMs.start}ms`}
				style:interest-delay-end={`${interestDelayMs.end}ms`}
				popovertarget={slot.panelId}
				popovertargetaction="show"
				onpointerenter={() => { if (slot.kind === 'wallet') walletFilterOwner = String(column.id) }}
				onfocusin={() => { if (slot.kind === 'wallet') walletFilterOwner = String(column.id) }}
				use:interest={{ id: slot.panelId }}
				style:--filter-anchor={slot.anchorName}
				aria-haspopup="dialog"
				aria-controls={slot.panelId}
				aria-expanded={interactive ? openFilterPanelId === slot.panelId && (slot.kind !== 'wallet' || walletPanelSlot?.columnId === column.id) : undefined}
				onclick={event => {
					if (slot.kind === 'wallet') walletFilterOwner = String(column.id)
					event.stopPropagation()
				}}
			>
				<span class="filter-trigger-label">{column.name}</span>
				{#if activeSets.length > 0}
					<span class="filter-cluster-targets" aria-hidden="true">
						{#each activeSets as set (set.id)}
							<span
								class="filter-cluster-target"
								style:--filter-cluster-anchor={`${slot.clusterAnchorName}-${set.id}`}
							></span>
						{/each}
					</span>
				{/if}
			</button>
		{:else}
			{column.name}
		{/if}
	{/snippet}

	{#snippet FacetTags({ wallet, facetId }: { wallet: RatedWallet<_AttributeGroupId>, facetId: string })}
		{@const facet = walletFacets.find(facet => facet.id === facetId)!}
		<div class="tags" data-row="start gap-1 wrap">
			{#each facet.values.filter(({ matches }) => matches(wallet, selectedVariant ?? 'ALL_VARIANTS')) as { id, label, tagLabel, tag, eip } (id)}
				{#if tag !== undefined}
					{@const canFilter = visibleWalletFilterSets.some(set => set.id === facet.id)}
					{#snippet Tag()}
					{#if canFilter}
					<button
							data-tag={tag}
							disabled={!interactive}
						aria-label="Filter by {tagLabel ?? label}"
						onclick={event => {
							event.stopPropagation()
							toggleFilterById!(id)
						}}
					>
						{tagLabel ?? label}
					</button>
					{:else}
						<span data-tag={tag}>{tagLabel ?? label}</span>
					{/if}
					{/snippet}
					{#if eip}
						<Tooltip placement="inline-end" buttonTriggerPlacement={canFilter ? 'behind' : 'around'}>
							{@render Tag()}
							{#snippet TooltipContent()}
								<div class="eip-tooltip-content"><EipDetails {eip} /></div>
							{/snippet}
						</Tooltip>
					{:else}
						{@render Tag()}
					{/if}
				{/if}
			{/each}
		</div>
	{/snippet}

	{#snippet VariantButtons({ wallet }: { wallet: RatedWallet<_AttributeGroupId> })}
		{@const supportedVariants = (
			[Variant.BROWSER, Variant.MOBILE, Variant.DESKTOP, Variant.EMBEDDED, Variant.HARDWARE]
				.filter(variant => variant in wallet.variants)
		)}

		{#if allSupportedVariants.length > 1}
			<div class="variants" data-row="gap-1">
				{#each supportedVariants as variant}
					<button
						data-selected={variant === selectedVariant ? '' : undefined}
						disabled={!interactive}
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
	{/snippet}

	<div
		class="filters"
		data-sticky="block block-start backdrop-after backdrop-stuck"
		data-scroll-item="inline-detached padding-match-start"
	>
		{#each allFilterSlots as slot (slot.panelId)}
			<div
				class="filter-popover"
				use:livePopoverTransition
				popover="auto"
				id={slot.panelId}
				role="dialog"
				aria-label={`${slot.kind === 'wallet' ? 'Wallet' : slot.kind === 'stage' ? 'Stage' : 'Attributes'} filters`}
				style:--filter-anchor={slot.anchorName}
				data-filter-kind={slot.kind}
				data-card
				onanimationstart={event => {
					if (event.target === event.currentTarget && event.animationName === 'wallet-filters-inline')
						event.currentTarget.hidePopover()
				}}
				onbeforetoggle={event => {
					if (event.newState === 'open') openFilterPanelId = slot.panelId
					else if (openFilterPanelId === slot.panelId) openFilterPanelId = undefined
				}}
			>
				{#if slot.kind === 'attribute'}
					<Filters
						aria-label="Attribute filters"
						items={allAttributes}
						filterSets={slot.filterSets}
						bind:activeChoices={attributeActiveChoices}
						bind:toggleFilterById={toggleAttributeFilterById}
						transitionUpdate={update => transitionUpdate(update, 'columns')}
						closedAnchorPrefix={slot.clusterAnchorName}
					/>
				{:else}
					<Filters
						id={slot.kind === 'stage' && stageNavigationBase !== undefined ? `${viewId}-stage-sort` : undefined}
						aria-label={slot.kind === 'stage' ? 'Stage filters' : 'Wallet filters'}
						items={wallets}
						filterSets={slot.filterSets}
						contextFilterSets={walletFilterSets}
						visibleSetIds={slot.kind === 'wallet' ? walletPanelSlot?.filterSets.map(set => set.id) : undefined}
						bind:activeChoices
						{transitionUpdate}
						closedAnchorPrefix={slot.clusterAnchorName}
					/>
				{/if}
			</div>
		{/each}
	</div>

	<div
		class="desktop-table-container"
		data-sticky-container
		data-scroll-item="inline-attached underflow-center overflow-start snap-block-start"
	>
		<Table
			{tableId}
			{initialSort}
			sortNavigation={stageNavigationBase === undefined || tableId === undefined ? undefined : {
				form: `${viewId}-stage-sort`,
				action: (columnId, sort) => {
					const url = walletSummaryHref(stageNavigationBase, initialStageSelection, sort)
					const id = `${tableId}-sort-${columnId}`
					return url === undefined ? undefined : { id, url: `${url}#${encodeURIComponent(id)}` }
				},
			}}
			class="wallet-table"

			rows={wallets}
			rowId={wallet => wallet.metadata.id}
			rowIsDisabled={(wallet, table) => (
				!filteredWalletIds.has(wallet.metadata.id)
				|| (table.sortedColumn?.value !== undefined && table.sortedColumn.value(wallet) === undefined)
			)}
			displaceDisabledRows={true}

			columns={
				(() => {
					const attrGroupColumns: Column<RatedWallet<_AttributeGroupId>>[] = (
						displayedAttributeGroups
							.map(attrGroup => ({
								id: attrGroup.id,
								name: attrGroup.displayName,
								HeaderTitle: FilterHeaderTitle,
								value: wallet => {
									const evalGroup = wallet.overall[attrGroup.id]
									const attrGroupScore = evalGroup ? calculateAttributeGroupScore(attrGroup, evalGroup) : null
									return attrGroupScore === null ? null : attrGroupScore.score
								},

								sort: {
									defaultDirection: SortDirection.Descending,
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
								isDefaultExpanded: false,
							}))
					)

					const walletChildColumns: Column<RatedWallet<_AttributeGroupId>>[] = [
						{
							id: 'displayName',
							name: 'Name',
							value: wallet => wallet.metadata.displayName,

							sort: {
								defaultDirection: SortDirection.Ascending,
							},

							isSticky: true,
						} satisfies Column<RatedWallet<_AttributeGroupId>>,
						...(
							applicableWalletFacets
								.map(facet => ({
									id: `facet-${facet.id}`,
									name: facet.label,
									HeaderTitle: FilterHeaderTitle,
									value: wallet => (
										facet.values
											.filter(({ matches }) => matches(wallet, 'ALL_VARIANTS'))
											.map(({ label }) => label)
											.join(', ') || undefined
									),

									align: ColumnAlignment.Center,
								} satisfies Column<RatedWallet<_AttributeGroupId>>))
						),
					]

					return [
						{
							id: 'wallet',
							name: 'Wallet',
							value: wallet => wallet.metadata.displayName,
							HeaderTitle: FilterHeaderTitle,

							sort: {
								defaultDirection: SortDirection.Ascending,
							},

							isSticky: !isWalletExpanded,
							subcolumns: walletChildColumns,
							isDefaultExpanded: false,
						} satisfies Column<RatedWallet<_AttributeGroupId>>,

						...(hasNonApplicableStages ? [] : [{
							id: 'stage',
							name: 'Stage',
							HeaderTitle: FilterHeaderTitle,
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
						} satisfies Column<RatedWallet<_AttributeGroupId>>]),

						(
							hasMultipleAttributeGroups ?
								{
									id: 'overall',
									name: 'Attributes',
									value: wallet => getWalletScore(wallet),
									HeaderTitle: FilterHeaderTitle,

									sort: {
										isDefault: true,
										defaultDirection: SortDirection.Descending,
										// Stages always take precedence over attribute scores when sorting:
										// a stage 1 wallet should never appear below a stage 0 wallet
										// regardless of how good its attribute scores are. Within the
										// same stage, fall back to the attribute score as a tiebreaker.
										compare: (_scoreA, _scoreB, walletA, walletB) => (
											walletStageThenScoreCompare(walletA, walletB)
										),
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
					] as Column<RatedWallet<_AttributeGroupId>>[]
				})()
			}
			bind:expandedColumnIds
			{transitionUpdate}
		>
			{#snippet Cell({
				row: wallet,
				column,
				value,
			})}
				{@const cellDisclosureId = disclosureId(wallet.metadata.id, column.id)}
				{@const isExpanded = expandedDisclosureIds.has(cellDisclosureId)}
				{@const setIsExpanded = (open: boolean) => {
					transitionUpdate(() => {
						if (open)
							expandedDisclosureIds.add(cellDisclosureId)
						else
							expandedDisclosureIds.delete(cellDisclosureId)
					})
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
						{@const stageControlId = `${tableId ?? viewId}-stage-${wallet.metadata.id}`}
						{@const stageShortcut = stage === 'QUALIFIED_FOR_NO_STAGES' && stageNavigationBase !== undefined
							? walletSummaryHref(stageNavigationBase, initialStageSelection === 'stage-unqualified' ? '' : 'stage-unqualified', initialSort)
							: undefined}


						<button
							id={stageControlId}
							type={!interactive && stageShortcut !== undefined ? 'submit' : 'button'}
							form={stageShortcut === undefined ? undefined : `${viewId}-stage-sort`}
							formaction={stageShortcut === undefined ? undefined : `${stageShortcut}#${encodeURIComponent(stageControlId)}`}
							aria-label={stage === 'QUALIFIED_FOR_NO_STAGES' ? 'Filter by No Stage' : stage && typeof stage === 'object' ? `Filter by ${stage.label}` : 'Filter by stage'}
							disabled={!interactive && stageShortcut === undefined}
							onclick={event => {
								event.preventDefault()
								event.stopPropagation()
								if (stage === 'QUALIFIED_FOR_NO_STAGES')
									toggleFilterById('stage-unqualified', true)
								else
									toggleAttributeFilterById?.(stageFilterId)
							}}
						>
							<WalletStageBadge
								{stage}
								{ladderEvaluation}
								size="medium"
							/>
						</button>
					{/if}
				{:else if column.id === 'wallet'}
					{@const displayName = wallet.metadata.displayName}

					{@const walletUrl = getWalletUrl(wallet, { variant: selectedVariant })}

					<TooltipOrAccordion
						class="wallet-info-details"
						onclick={event => {
							const details = event.currentTarget
							const cell = details.parentElement

							if (
								!interactive || event.defaultPrevented || !cell
								|| !(event.target instanceof Element)
								|| event.target.closest('summary')?.parentElement !== details
								|| event.target.closest('a, button, input, select, textarea, [contenteditable]')
								|| tooltipUsesDrawer()
							) return

							const nextOpen = !details.open
							event.preventDefault()
							details.setAttribute('data-view-transition', 'item')
							try {
								startScopedViewTransition(cell, () => setIsExpanded(nextOpen), 'live')
							} finally {
								details.removeAttribute('data-view-transition')
							}
						}}
						bind:isExpanded={
							() => isExpanded,
							setIsExpanded
						}
						tooltipButtonTriggerPlacement="behind"
						tooltipHoverTriggerPlacement="around"
						showAccordionMarker
						tooltipMaxWidth="20rem"
					>
						<div
							class="wallet-info"
							data-row="start"
							data-view-transition="named"
							style:--view-transition-name={viewTransitionName(viewId, 'wallet', wallet.metadata.id)}
						>
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
													disabled={!interactive}
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

								{#each walletFacets.filter(facet => facet.id !== 'variant') as facet (facet.id)}
									{@render FacetTags({ wallet, facetId: facet.id })}
								{/each}
							</div>

							{@render VariantButtons({ wallet })}
						</div>

						{#snippet ExpandedContent()}
							<div class="wallet-summary" data-card="popover" data-column="gap-4">
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

				{:else if column.id === 'displayName'}
					{@const walletUrl = getWalletUrl(wallet, { variant: selectedVariant })}

					<div
						class="wallet-info"
						data-row="start"
						data-view-transition="named"
						style:--view-transition-name={viewTransitionName(viewId, 'wallet', wallet.metadata.id)}
					>
						<span class="row-count" data-row="center"></span>

						<span class="wallet-icon" data-icon="shadow">
							<img
								alt={wallet.metadata.displayName}
								src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
								width="16"
								height="16"
							/>
						</span>

						<div class="name-and-tags" data-column="gap-2">
							<div class="name" data-column="gap-1">
								<div data-row="gap-3 start wrap">
									<h3>
										<a data-link="camouflaged" href={walletUrl}>{value}</a>
									</h3>
								</div>

								{#if selectedVariant && selectedVariant in wallet.variants}
									<div class="variant">
										<a data-link="camouflaged" href={walletUrl}>{variants[selectedVariant].label}</a>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{:else if typeof column.id === 'string' && column.id.startsWith('facet-')}
					{@const facetId = column.id.slice('facet-'.length)}

					{#if facetId === 'variant'}
						{@render VariantButtons({ wallet })}
					{:else}
						{@render FacetTags({ wallet, facetId })}
					{/if}
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

					<!-- Overall rating -->
					{#if column.id === 'overall'}
						{@const score =
							calculateOverallScore(
								attributeTree,
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
							tooltipButtonTriggerPlacement="behind"
							tooltipHoverTriggerPlacement="around"
						>
							<Pie
								layout={PieLayout.FullTop}
								padding={overallRatingPiePadding}
								radius={overallRatingPieRadius}
								levels={overallRatingPieLevels(
											(summaryVisualization === SummaryVisualization.Score || summaryVisualization === SummaryVisualization.Icon) ?
												0.15
											: summaryVisualization === SummaryVisualization.Stage ?
												0.08
											:
												0.1
								)}

								slices={
									displayedAttributeGroups.map(attrGroup => {
										const evalGroup = wallet.overall[attrGroup.id]
										const groupScore = evalGroup ? calculateAttributeGroupScore(attrGroup, evalGroup) : null

										return {
											id: `attrGroup_${attrGroup.id}`,
											arcLabel: (groupScore !== null && groupScore.hasUnratedComponent) ? '*' : '',
											arcIconId: attrGroup.icon,
											ariaLabel: attrGroup.displayName,
											color: (
												groupScore !== null ?
													scoreToColor(groupScore.score)
												:
													'var(--rating-unrated)'
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
																filteredAttributeIds === null
																|| filteredAttributeIds.has(`${attrGroup.id}.${attributeId}`)
															)
														))
														.map(([attributeId, attribute]) => ({
															id: `attrGroup_${attrGroup.id}__attr_${attributeId}`,
															color: ratingToColor(attribute.evaluation.outcome.rating),
															weight: (
																attrGroup.attributes.find(w => w.attribute.id === attributeId)
																			?.weight
																		?? 1
																	),
																	arcLabel: '',
																	arcIconId: attribute.attribute.icon,
																	ariaLabel: `${attribute.attribute.displayName}: ${attribute.evaluation.outcome.rating}`,
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
								onSliceMouseEnter={(sliceId, event) => {
									if (!canHoverDetails(event)) return
									const [attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									if (
										attributeGroupId !== undefined
										&& isRatedEvaluationTreeGroup(attributeGroupId, wallet.overall)
									) {
										activeEntityId = {
											walletId: wallet.metadata.id,
											attributeGroupId,
											...(attributeId && { attributeId: attributeId }),
										}
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
											wallet.overall[activeEntityId.attributeGroupId][activeEntityId.attributeId]
										:
											undefined
									: selectedAttribute ?
										(() => {
											const g = attributeGroupList.find(
												gr => isRatedEvaluationTreeGroup(gr.id, wallet.overall)
													&& selectedAttribute! in wallet.overall[gr.id],
											)

											return (
												g !== undefined ?
													wallet.overall[g.id][selectedAttribute!]
												:
													undefined
											)
										})()
									:
										undefined
								)}

								{@const displayedGroup = (
									activeEntityId?.walletId === wallet.metadata.id ?
										attributeGroupList.find(g => g.id === activeEntityId!.attributeGroupId)
									: selectedAttribute ?
										attributeGroupList.find(
											g => isRatedEvaluationTreeGroup(g.id, wallet.overall)
												&& selectedAttribute! in wallet.overall[g.id],
										)
									:
										undefined
								)}

								{#if displayedAttribute}
									<WalletAttributeSummary
										{wallet}
										{ladders}
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
					{:else if typeof column.id === 'string' && !column.id.includes('.')}
						{@const attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === column.id)}
						{#if attrGroup && wallet.overall[attrGroup.id]}
							{@const evalGroup = wallet.overall[attrGroup.id]}
						{@const groupScore = calculateAttributeGroupScore(attrGroup, evalGroup)}

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
							tooltipButtonTriggerPlacement="behind"
							tooltipHoverTriggerPlacement="around"
						>
							<Pie
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
												weight: (
													attrGroup.attributes.find(w => w.attribute.id === attributeId)
														?.weight
													?? 1
												),
												arcLabel: '',
												arcIconId: attribute.attribute.icon,
												ariaLabel: `${attribute.attribute.displayName}${tooltipSuffix ?? ''}: ${attribute.evaluation.outcome.rating}`,
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
								onSliceMouseEnter={(sliceId, event) => {
									if (!canHoverDetails(event)) return
									const [attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									if (
										attributeId
										&& attributeGroupId !== undefined
										&& isRatedEvaluationTreeGroup(attributeGroupId, wallet.overall)
									) {
										activeEntityId = {
											walletId: wallet.metadata.id,
											attributeGroupId,
											attributeId: attributeId,
										}
									}
								}}
								onSliceMouseLeave={_sliceId => {
									activeEntityId = undefined
								}}
								onSliceFocus={sliceId => {
									const [attributeGroupId, attributeId] = sliceId.split('__').map(part => part.split('_')[1])

									if (
										attributeId
										&& attributeGroupId !== undefined
										&& isRatedEvaluationTreeGroup(attributeGroupId, wallet.overall)
									) {
										activeEntityId = {
											walletId: wallet.metadata.id,
											attributeGroupId,
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
										<span class="pie-center-icon" data-icon="wbicons-simple {attrGroup.icon}"></span>
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
							tooltipButtonTriggerPlacement="behind"
							tooltipHoverTriggerPlacement="around"
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

</section>


<style>
	.eip-tooltip-content {
		width: 34rem;
		max-inline-size: 100%;
	}

	section {
		---filters-blockSize: 4rem;
		--filter-cluster-size: 1.3rem;

		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 60.5rem;
			--scrollItem-inlineDetached-paddingStart: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
			--scrollItem-inlineDetached-paddingEnd: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
		}
	}

	/* Wide: filter groups are anchored to the header cell they filter.
	 * Narrow: the same groups occupy a sticky layer outside the table heading. */
	.filters {
		display: contents;
	}

	.filter-trigger {
		position: relative;
		z-index: 1;
		anchor-name: var(--filter-anchor);
		display: inline-grid;
		justify-items: center;
		gap: 0.35em;
		font: inherit;
		color: inherit;
		padding: 0;
		background-color: transparent;
		border: none;
	}

	.filter-cluster-target {
		anchor-name: var(--filter-cluster-anchor);
		display: block;
		inline-size: var(--filter-cluster-size);
		block-size: var(--filter-cluster-size);
	}

	.filter-cluster-targets {
		display: flex;
		justify-content: center;
		gap: 0.25em;
	}

	:global(#layout:has(.wallet-table)) {
		/* Native fixed anchors must share the viewport coordinate system. */
		--scrollContainer-perspective: none;
		container-name: wallet-table;
	}

	.filter-popover {
		&[data-card] {
			--card-backgroundColor: transparent;
		}
		display: flex;
		position: fixed;
		position-anchor: var(--filter-anchor);
		z-index: 3;
		top: calc(anchor(bottom) + 0.5rem);
		margin: 0;
		inline-size: fit-content;
		max-inline-size: calc(100dvi - 1rem);
		border: 1px solid transparent;
		backdrop-filter: none;
		pointer-events: none;

		@supports (position-area: block-end span-all) {
			/* The anchor area supplies the remaining viewport block size. */
			position-area: block-end span-all;
			top: 0.5rem;
			max-block-size: calc(100% - 1rem);
		}

		@container wallet-table (width >= 42rem) {
			&:not(:popover-open) {
				visibility: hidden;
				:global([data-active-choice] .choice-icon) { visibility: visible; }
			}
		}
	}

	.filter-popover:not([data-filter-kind="attribute"]) {
		left: max(0.5rem, anchor(left));
		right: 0.5rem;
	}

	.filter-popover[data-filter-kind="attribute"] {
		left: auto;
		right: 0.5rem;
	}

	.filter-popover:popover-open {
		&[data-card] {
			--card-backgroundColor: var(--background-primary);
		}
		border-color: var(--border-color);
		box-shadow: 0 4px 12px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.4));
		pointer-events: auto;
	}

	/* CSS owns the breakpoint; entering inline mode releases the native top layer. */
	@keyframes -global-wallet-filters-inline {
		from { opacity: 1; }
		to { opacity: 1; }
	}
	@container wallet-table (width < 42rem) {
		.filters[data-sticky] {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			container-type: scroll-state inline-size;
			inline-size: 100%;
			block-size: var(---filters-blockSize);
			overflow-x: auto;
			overflow-y: clip;
			padding-inline: 0.5rem;
			z-index: 2;
		}

		.filter-popover {
			animation: wallet-filters-inline 1ms;
			display: contents !important;
			visibility: visible;
			pointer-events: auto;
		}

		.filter-popover :global(form.menu) {
			display: contents;
		}

		.filter-trigger {
			pointer-events: none;
			visibility: hidden;
			.filter-trigger-label { visibility: visible; }
		}

		.filter-cluster-target {
			display: none;
		}
	}

	.desktop-table-container {
		z-index: 1;

		/* Block rows stop producing a max-content track to centre. */
		@container wallet-table (width < 42rem) {
			grid-template-columns: 100%;
			inline-size: 100%;
			max-inline-size: 100%;
			min-inline-size: 0;
			contain: inline-size;
		}
	}

	:global {
		/*
		 * Narrow table: the same rows re-flow as blocks, so wallet metadata leads the
		 * row, the remaining columns share the line below it, and the rating pie wraps
		 * underneath at full width.
		 */
		@container wallet-table (width < 42rem) {
			.wallet-table {
				--table-inlineSize: 100%;

				table,
				thead,
				tbody {
					display: block;
					inline-size: 100%;
					max-inline-size: 100%;
					min-inline-size: 0;
				}

				colgroup {
					display: none;
				}

				thead tr {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(min(7rem, 100%), 1fr));
					gap: 0.25rem;
				}

				.desktop-table-container[data-sticky-container] & thead[data-sticky] {
					inset-block-start: calc(var(--sticky-insetBlockStart) + var(---filters-blockSize));
				}

				thead th {
					min-inline-size: 0;
					font-size: max(0.75rem, 12px);
					overflow-wrap: anywhere;

					.header-title {
						inline-size: auto !important;
						min-inline-size: 0 !important;
					}
				}

				tbody tr {
					display: grid;
					grid-template-columns: repeat(2, minmax(0, 1fr));
					align-items: center;
					padding-block: 1rem;
				}

				tbody td {
					padding: 0;

					&:not([data-table-column="wallet"], [data-table-column="stage"], [data-table-column="overall"], [data-table-column="displayName"]) {
						display: grid;
						justify-items: center;
						align-self: stretch;
						align-content: start;
						gap: 0.35rem;
						padding-block-start: 0.5rem;

						&::before {
							content: attr(data-table-column-name);
							max-inline-size: 10rem;
							font-size: 0.75rem;
							font-weight: 600;
							line-height: 1.15;
							text-align: center;
							text-wrap: balance;
						}
					}

					&[data-table-column="wallet"] {
						grid-column: 1 / -1;
					}

					&[data-table-column="displayName"] {
						grid-column: 1 / -1;
					}

					&[data-table-column="stage"] {
						grid-column: 1 / -1;
						display: flex;
						align-items: center;
						justify-self: center;
						gap: 0.5rem;

						&::before {
							content: attr(data-table-column-name);
							font-size: 0.75rem;
							font-weight: 600;
						}
					}

					&[data-table-column="overall"] {
						grid-column: 1 / -1;
						justify-self: center;
					}

					&:not([data-table-column="wallet"], [data-table-column="overall"], [data-table-column="displayName"]) {
						justify-self: center;
					}
				}

				.wallet-info {
					block-size: auto;
				}
			}
		}

		.wallet-table {
			tr {
				td {
					&:not(:has(> details[open] > [popover]:not(:popover-open))) {
						transition-property: vertical-align;
						transition-delay: 0.25s;

						&:has(> details.wallet-info-details[data-view-transition~="item"]) {
							transition-property: none;
						}
					}

					&:has(> details[open] > [popover]:not(:popover-open)) {
						--table-cell-verticalAlign: top;
					}
				}

				details.wallet-info-details {
					&[data-layout-transition="after"] {
						transition-property: gap, translate;
					}

					summary {
						box-sizing: content-box;
						margin: calc(-1 * var(--table-cell-padding));

						@container wallet-table (width < 42rem) {
							margin: 0;
						}

						transition-property: opacity, scale, min-block-size;

						> * {
							padding: var(--table-cell-padding);
						}
					}

					&[open]:has(> [popover]:not(:popover-open)) summary {
						min-block-size: 5rem;

						> * {
							padding-block-end: 0.25rem;
						}
					}
				}
			}
		}
	}

	.title-disclaimer {
		font-size: 0.9rem;
		color: var(--text-secondary);
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

		:global(:popover-open) & {
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

	:global(::view-transition-group(*.pie)) {
		animation-duration: 300ms;
		animation-timing-function: var(--transition-easeOutExpo);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(::view-transition-group(*.pie)) {
			animation-duration: 0s;
		}
	}

</style>
