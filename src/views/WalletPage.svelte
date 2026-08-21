<script lang="ts" generics="
	_AttributeGroupId extends string
">
	// Types/constants
	import type { NonEmptyArray } from '@/types/utils/non-empty'
	import {
		type Attribute,
		type EvaluatedAttribute,
		type ExampleRating,
		type OutcomeMetadata,
		Rating,
		normalizeExampleRatings,
		ratingIcons,
		ratingToColor,
		Verifiability,
	} from '@/schema/attributes'
	import { hasSingleVariant, type Variant } from '@/schema/variants'
	import { type RatedWallet, VariantSpecificity } from '@/schema/wallet'
	import type { Ladders } from '@/schema/ladders'
	import type { AttributeTree, EvaluationTree } from '@/schema/attribute-groups'
	import { ContentType, isTypographicContent } from '@/types/content'
	import type { AddressCorrelationDetailsProps } from '@/types/content/address-correlation-details'
	import type { ChainVerificationDetailsProps } from '@/types/content/chain-verification-details'
	import type { FundingDetailsProps } from '@/types/content/funding-details'
	import type { PrivateTransfersDetailsProps } from '@/types/content/private-transfers-details'
	import type { ScamAlertDetailsProps } from '@/types/content/scam-alert-details'
	import type { SecurityAuditsDetailsProps } from '@/types/content/security-audits-details'
	import type { TransactionInclusionDetailsProps } from '@/types/content/transaction-inclusion-details'
	import type { AccountRecoveryDetailsProps } from '@/types/content/account-recovery-details'
	import type { AccountUnruggabilityDetailsProps } from '@/types/content/account-unruggability-details'
	import type { UnratedAttributeProps } from '@/types/content/unrated-attribute'
	import {
		computePieSlices,
		overallRatingPieLevels,
		overallRatingPieMaxRadius,
		overallRatingPiePadding,
		overallRatingPieRadius,
		PieLayout,
		type Slice,
	} from '@/components/pie-geometry'


	// Functions
	import {
		variants,
		variantToName,
		variantToRunsOn,
	} from '@/constants/variants'
	import type { NavigationItem } from '@/constants/navigation'
	import { allHardwareModels } from '@/data/hardware-wallets'
	import {
		type AttributeGroup,
		calculateAttributeGroupScore,
		calculateOverallScore,
		formatAttributeGroupTitleText,
	} from '@/schema/attribute-groups'
	import { toFullyQualified } from '@/schema/reference'
	import { getAttributeOverride } from '@/schema/wallet'
	import { renderStrings, slugifyCamelCase } from '@/types/utils/text'
	import { getWalletStageAndLadder } from '@/utils/stage'
	import { getHowIsEvaluatedHeading, getHowToImproveHeading } from '@/utils/attribute-display'
	import { scoreToColor } from '@/utils/colors'
	import { getWalletEvalStrings } from '@/utils/evaluation-content'
	import { getAttributeStagesForWallet } from '@/utils/stage-attributes'


	type WalletPageWallet<_AttributeGroupId extends string> =
		Omit<RatedWallet<_AttributeGroupId>, 'ladders'> &
		Partial<Pick<RatedWallet<_AttributeGroupId>, 'ladders'>>


	// Props
	const {
		ladders,
		attributeTree,
		wallet,
		showStage = true,
		showScores = false,
	}: {
		ladders: Ladders<_AttributeGroupId>
		attributeTree: AttributeTree<_AttributeGroupId>
		wallet: WalletPageWallet<_AttributeGroupId>
		showStage?: boolean,
		showScores?: boolean,
	} = $props()


	// State
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import { isLabeledUrl } from '@/schema/url'
	import { IncidentStatus } from '@/types/content/news'
	import { daysSince } from '@/types/date'
	import { getNewsForWallet } from '@/data/news'

	let queryParams = $state<URLSearchParams | undefined>(
		globalThis.location && new SvelteURLSearchParams(globalThis.location.search)
	)

	$effect(() => {
		const queryString = queryParams?.toString()

		if(queryString !== undefined && queryString !== globalThis.location.search.slice(1))
			globalThis.history.replaceState(
				null,
				'',
				`${globalThis.location.pathname}${queryString ? `?${queryString}` : ''}${globalThis.location.hash}`,
			)
	})

	function openHashDetails() {
		const id = decodeURIComponent(globalThis.location.hash.slice(1))
		const target = id ? globalThis.document.getElementById(id) : null

		if(target instanceof HTMLDetailsElement)
			target.open = true

		const containingDetails = target?.closest('details')

		if(containingDetails)
			containingDetails.open = true
	}

	function attachDetailsControls(root: HTMLElement) {
		const detailsForScope = (scope: string) => {
			if (scope === 'page')
				return root.querySelectorAll<HTMLDetailsElement>(':scope > article details')

			if (scope !== 'group') return []

			const currentLink = globalThis.CSS.supports('selector(:target-current)')
				? root.querySelector<HTMLAnchorElement>(
					'.page-navigation a:target-current[href^="#"]'
				)
				: null
			const currentId = currentLink?.hash
				? decodeURIComponent(currentLink.hash.slice(1))
				: decodeURIComponent(globalThis.location.hash.slice(1))
			const currentGroup = (
				currentId
					? globalThis.document.getElementById(currentId)?.closest('.attribute-group')
					: null
			) ?? root.querySelector('.attribute-group')

			return currentGroup?.querySelectorAll<HTMLDetailsElement>('details') ?? []
		}

		const toggleDetails = (scope?: string) => {
			if (!scope) return

			const details = Array.from(detailsForScope(scope))
			const open = details.some(detail => !detail.open)

			for (const detail of details)
				detail.open = open
		}

		const handleClick = (event: MouseEvent) => {
			const button = event.target instanceof Element
				? event.target.closest<HTMLButtonElement>('button[data-details-scope]')
				: null

			if (!button) return

			toggleDetails(button.dataset.detailsScope)
		}

		root.addEventListener('click', handleClick)

		return () => {
			root.removeEventListener('click', handleClick)
		}
	}

	function attachHashNavigation() {
		let correction = 0
		let inlineSize = globalThis.document.documentElement.clientWidth

		const correctHashPosition = async (currentCorrection: number) => {
			await globalThis.document.fonts.ready

			const hash = globalThis.location.hash
			const target = hash
				? globalThis.document.getElementById(decodeURIComponent(hash.slice(1)))
				: null
			const layout = globalThis.document.getElementById('layout')

			if(!(target instanceof HTMLElement) || !(layout instanceof HTMLElement))
				return

			let previousGeometry = ''
			let stableFrames = 0

			while(currentCorrection === correction && stableFrames < 3) {
				await new Promise(globalThis.requestAnimationFrame)

				if(hash !== globalThis.location.hash)
					return

				const targetRect = target.getBoundingClientRect()
				const geometry = `${targetRect.top}:${targetRect.height}:${layout.scrollHeight}`

				stableFrames = geometry === previousGeometry ? stableFrames + 1 : 0
				previousGeometry = geometry
			}

			if(currentCorrection === correction)
				target.scrollIntoView({ block: 'start', behavior: 'auto' })
		}

		const handleResize = () => {
			const nextInlineSize = globalThis.document.documentElement.clientWidth

			if(nextInlineSize === inlineSize)
				return

			inlineSize = nextInlineSize
			void correctHashPosition(++correction)
		}
		const handleHashChange = () => {
			openHashDetails()
			void correctHashPosition(++correction)
		}

		globalThis.addEventListener('resize', handleResize)
		globalThis.addEventListener('hashchange', handleHashChange)
		handleHashChange()

		return () => {
			correction++
			globalThis.removeEventListener('resize', handleResize)
			globalThis.removeEventListener('hashchange', handleHashChange)
		}
	}

	$effect(() => {
		return attachHashNavigation()
	})

	// (Derived)
	const walletNews = $derived.by(() =>
		getNewsForWallet(wallet.metadata.id)
	)

	// News section behavior: determine prominence based on recency and resolution status
	const allNewsResolved = $derived(
		walletNews.length > 0 &&
		walletNews.every(news => news.status === IncidentStatus.RESOLVED)
	)

	const latestNewsDate = $derived(
		walletNews.length > 0
			? walletNews.reduce((latest, news) =>
				news.updatedAt > latest ? news.updatedAt : latest,
				walletNews[0].updatedAt
			)
			: null
	)

	const daysSinceLatestNews = $derived(
		latestNewsDate ? daysSince(latestNewsDate) : null
	)

	// Collapse by default if all resolved and >30 days old
	const newsIsStale = $derived(
		allNewsResolved && daysSinceLatestNews !== null && daysSinceLatestNews > 30
	)

	// Move to bottom if all resolved and >1 year old
	const newsIsVeryStale = $derived(
		allNewsResolved && daysSinceLatestNews !== null && daysSinceLatestNews > 365
	)

	// Expand by default unless news is stale
	const shouldExpandNews = $derived(
		!newsIsStale
	)

	let selectedVariant = $state<Variant | undefined>(
		hasSingleVariant(wallet.variants) ?
			undefined
		:
			queryParams?.get('variant') as Variant ?? undefined
	)
	const variantOptions = $derived([
		{
			value: undefined,
			label: 'All versions',
			icon: Layers3Icon,
		},
		...Object.keys(wallet.variants).map(variant => ({
			value: variant as Variant,
			label: variants[variant as Variant].label,
			icon: variants[variant as Variant].icon,
		})),
	])
	const selectedVariantOption = $derived(
		variantOptions.find(option => option.value === selectedVariant) ?? variantOptions[0]
	)

	$effect(() => {
		if(!hasSingleVariant(wallet.variants) && selectedVariant)
			queryParams?.set('variant', selectedVariant)
		else
			queryParams?.delete('variant')
	})

	let selectedModel = $state(
		queryParams?.get('model') ?? undefined
	)

	$effect(() => {
		if(!selectedModel)
			queryParams?.delete('model')
		else
			queryParams?.set('model', selectedModel)
	})

	const evalTree = $derived(
		(
			selectedVariant &&
				wallet.variants[selectedVariant]?.attributes
			||
				wallet.overall
		) satisfies EvaluationTree<_AttributeGroupId>
	)

	const tocNavigationItems = $derived.by<NavigationItem[]>(() => (
		evalTree ?
			Object.values(attributeTree)
				.flatMap(attrGroup => {
					const evalGroup = evalTree[attrGroup.id]

					if (!evalGroup) return []

					return [{
						id: `toc-${attrGroup.id}`,
						title: attrGroup.displayName,
						icon: attrGroup.icon,
						accentColor: scoreToColor(
							calculateAttributeGroupScore(attrGroup, evalGroup)?.score ?? null,
						),
						href: `#${slugifyCamelCase(attrGroup.id)}`,
						children: attrGroup.attributes.flatMap(({ attribute }) => {
							const evalAttr = evalGroup[attribute.id]

							if (!evalAttr || evalAttr.evaluation.outcome.rating === Rating.EXEMPT) return []

							return [{
								id: `toc-${attrGroup.id}-${attribute.id}`,
								title: attribute.displayName,
								icon: attribute.icon,
								accentColor: ratingToColor(evalAttr.evaluation.outcome.rating),
								href: `#${slugifyCamelCase(attribute.id)}`,
							}]
						}),
					}]
				})
		:
			[]
	))

	const pieNavigationItems = $derived.by(() => {
		const referenceSlices = tocNavigationItems.map<Slice>(group => {
			const sourceGroup = Object.values(attributeTree).find(
				candidate => `toc-${candidate.id}` === group.id
			)

			return {
				id: group.id,
				color: group.accentColor ?? 'transparent',
				weight: 1,
				arcLabel: '',
				titleText: group.title,
				children: (group.children ?? []).map(attribute => ({
					id: attribute.id,
					color: attribute.accentColor ?? 'transparent',
					weight: sourceGroup?.attributes.find(
						({ attribute: sourceAttribute }) => `#${slugifyCamelCase(sourceAttribute.id)}` === attribute.href
					)?.weight ?? 1,
					arcLabel: '',
					titleText: attribute.title,
				})),
			}
		})
		const computedReferenceSlices = computePieSlices({
			slices: referenceSlices,
			radius: overallRatingPieRadius,
			levels: overallRatingPieLevels(),
			layout: PieLayout.FullTop,
			centerFirstSlice: true,
		})

		return tocNavigationItems.map((group, groupIndex) => {
			const computedGroup = computedReferenceSlices[groupIndex]

			return {
				...group,
				sliceStyle: computedGroup?.computed,
				children: group.children?.map((attribute, attributeIndex) => ({
					...attribute,
					sliceStyle: computedGroup?.children?.[attributeIndex]?.computed,
				})),
			}
		})
	})

	const pieRotationItems = $derived(
		pieNavigationItems.flatMap(group => [group, ...(group.children ?? [])])
	)
	const pieInitialSliceMidAngle = $derived(
		pieRotationItems[0]?.sliceStyle?.midAngle ?? 0
	)
	const pieRotationSteps = $derived(
		pieRotationItems.slice(1).map((item, index) => ({
			href: item.href,
			timeline: `--pie-section-${index + 1}`,
			delta: (
				(pieRotationItems[index]?.sliceStyle?.midAngle ?? 0)
				- (item.sliceStyle?.midAngle ?? 0)
			),
		}))
	)
	/*
	 * A single element must accumulate every data-dependent view timeline so
	 * both slice levels share one exact start angle. CSS cannot read the
	 * current descendant's inline geometry back into an ancestor, making these
	 * three parallel lists the irreducible bridge from Pie's computed angles.
	 */
	const pieRotationAnimationNames = $derived(
		pieRotationSteps.map(() => 'WalletPieRotationStep').join(', ')
	)
	const pieRotationAnimationTimelines = $derived(
		pieRotationSteps.map(step => step.timeline).join(', ')
	)
	const pieRotationAnimationTimingFunctions = $derived(
		pieRotationSteps.map(step => `linear(0, ${step.delta})`).join(', ')
	)
	const pieRotationAnimationRanges = $derived(
		pieRotationSteps.map(step => (
			pieNavigationItems.some(group => group.href === step.href)
				? 'var(---wallet-breadcrumb-animation-range)'
				: 'var(---wallet-pie-attribute-animation-range)'
		)).join(', ')
	)
	const pieTimelineByHref = $derived(
		new Map(pieRotationSteps.map(step => [step.href, step.timeline]))
	)

	const attrToRelevantVariants = $derived.by(() => {
		const map = new Map<string, Variant[]>()

		for (const [variant, variantSpecificityMap] of Object.entries(wallet.variantSpecificity)) {
			for (const [evalAttrId, variantSpecificity] of variantSpecificityMap) {
				switch (variantSpecificity) {
					case VariantSpecificity.ALL_SAME:
					case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
						break
					case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
						map.set(evalAttrId, [variant])
						break
					default:
						if(map.has(evalAttrId))
							map.get(evalAttrId)!.push(variant)
						else
							map.set(evalAttrId, [variant])
				}
			}
		}

		return map
	})

	const overallScore = $derived(
		calculateOverallScore(attributeTree, wallet.overall, () => true),
	)


	// Functions
	import { formatAttributeTitleText } from '@/schema/attributes'


	// Components
	import { Github, Globe } from 'lucide-static'
	import Layers3Icon from 'lucide-static/icons/layers-3.svg?raw'
	import ListCollapseIcon from 'lucide-static/icons/list-collapse.svg?raw'
	import Select from '@/components/Select.svelte'
	import AddressCorrelationDetails from '@/views/attributes/privacy/AddressCorrelationDetails.svelte'
	import PrivateTransfersDetails from '@/views/attributes/privacy/PrivateTransfersDetails.svelte'
	import ChainVerificationDetails from '@/views/attributes/security/ChainVerificationDetails.svelte'
	import ScamAlertDetails from '@/views/attributes/security/ScamAlertDetails.svelte'
	import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'
	import TransactionInclusionDetails from '@/views/attributes/self-sovereignty/TransactionInclusionDetails.svelte'
	import FundingDetails from '@/views/attributes/transparency/FundingDetails.svelte'
	import UnratedAttribute from '@/views/attributes/UnratedAttribute.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
	import ScoreBadge from '@/views/ScoreBadge.svelte'
	import WalletStageBadge from '@/views/WalletStageBadge.svelte'
	import WalletPageNavigationBadge from '@/views/WalletPageNavigationBadge.svelte'
	import WalletStageOverview from '@/views/WalletStageOverview.svelte'
	import WalletStageSummary from '@/views/WalletStageSummary.svelte'
	import Tooltip from '@/components/Tooltip.svelte'
	import Typography from '@/components/Typography.svelte'
	import AccountRecoveryDetails from './attributes/security/AccountRecoveryDetails.svelte'
	import AccountUnruggabilityDetails from './attributes/self-sovereignty/AccountUnruggabilityDetails.svelte'
	import SecurityNews from '@/views/SecurityNews.svelte'
	import NavigationItems from '@/views/NavigationItems.svelte'
</script>


<svelte:head>
	{@html (
		'<script type="application/ld+json">'
		+ JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: (
				evalTree ?
					Object.values(attributeTree)
						.flatMap(attrGroup => (
							attrGroup.attributes
								.map(({ attribute }) => ({
									evalAttr: (
										evalTree[attrGroup.id][attribute.id]
									),
									attribute,
								}))
								.filter(({ evalAttr }) => (
									evalAttr && evalAttr.evaluation.outcome.rating !== Rating.EXEMPT
								))
								.map(({ attribute }) => ({
									'@type': 'Question',
									name: renderStrings(
										(
											attribute.question.contentType === ContentType.MARKDOWN ?
												attribute.question.markdown
											: attribute.question.contentType === ContentType.TEXT ?
												attribute.question.text
											:
												attribute.displayName
										),
										{
											WALLET_NAME: wallet.metadata.displayName,
										},
									),
									acceptedAnswer: {
										'@type': 'Answer',
										text: renderStrings(
											(
												attribute.why.contentType === ContentType.MARKDOWN ?
													attribute.why.markdown
												: attribute.why.contentType === ContentType.TEXT ?
													attribute.why.text
												:
													'No explanation available'
											),
											{
												WALLET_NAME: wallet.metadata.displayName,
											},
										),
									},
								}))
						))
					:
						[]
			),
			about: {
				'@type': 'SoftwareApplication',
				name: wallet.metadata.displayName,
				description: renderStrings(
					(
						wallet.metadata.blurb.contentType === ContentType.TEXT ?
							wallet.metadata.blurb.text
						:
							wallet.metadata.displayName + ' wallet'
					),
					{
						WALLET_NAME: wallet.metadata.displayName
					},
				),
				url: (
					typeof wallet.metadata.url === 'string' ?
						wallet.metadata.url
					:
						wallet.metadata.url?.url
				),
				applicationCategory: 'Cryptocurrency Wallet',
				operatingSystem: (
					Object.keys(wallet.variants)
						.map(variant => variantToRunsOn(variant))
						.join(', ')
				),
			},
		})
		+ '<\/script>'
	)}
</svelte:head>


<div
	id="wallet-page"
	class="container"
	data-sticky-container
	style:timeline-scope={[
		'--header-timeline',
		...pieRotationSteps.map(step => step.timeline),
	].join(', ')}
	{@attach attachDetailsControls}
>
	<article
		data-column="gap-8"
	>
		<header
			id="top"
			data-column="gap-6"
			data-scroll-item="inline-detached padding-match-start"
		>
			<div data-row="wrap">
				<div
					class="wallet-title-row"
					data-row="wrap"
					data-wallet-name={wallet.metadata.displayName}
				>
					<a
						data-link="camouflaged"
						data-sticky-breadcrumb="root item"
						class="wallet-name"
						href="#top"
					>
						<h1 data-row="gap-2">
							<img
								class="wallet-icon"
								alt={wallet.metadata.displayName}
								src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
							/>
							<span>{wallet.metadata.displayName}</span>
						</h1>
					</a>

					{#if Object.keys(wallet.variants).length > 1}
						<span class="wallet-variant-picker-position" data-scripting="required">
							<span class="wallet-variant-picker-anchor" aria-hidden="true">
								<span>{@html selectedVariantOption.icon ?? Layers3Icon}</span>
								<span>{selectedVariantOption.label}</span>
							</span>
							<span class="wallet-variant-picker-control">
								<Select
									class="wallet-variant-picker"
									aria-label="Wallet version"
									bind:value={selectedVariant}
									options={variantOptions}
								/>
							</span>
						</span>
					{/if}

					{#if 'hardware' in wallet.variants}
						{@const brandModels = allHardwareModels.filter(m => m.brandId === wallet.metadata.id)}
						{#if brandModels.length > 1}
							<Select
								data-scripting="required"
								bind:value={selectedModel}
								options={[
									{ value: undefined, label: 'All models' },
									...brandModels.map(m => ({ value: m.id.split('.')[1], label: `${m.modelName}`, icon: m.iconUrl }))
								]}
							/>
						{/if}
					{/if}

				</div>

				<div
					class="wallet-summary-badges"
					data-row-item="wrap-end"
					data-row="gap-2"
				>
					{#if showStage}
						{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}

						{#if stage !== null && ladderEvaluation !== null}
							<Tooltip buttonTriggerPlacement="behind">
								<WalletStageBadge
									{stage}
									{ladderEvaluation}
									size="large"
								/>

								{#snippet TooltipContent()}
									<WalletStageSummary {wallet} {ladders} {stage} {ladderEvaluation} semanticHeadings={false} />
								{/snippet}
							</Tooltip>
						{/if}
					{/if}

					{#if showScores}
						<ScoreBadge score={overallScore} size="large" />
					{/if}
				</div>
			</div>

			<section
				class="wallet-overview"
				data-column="gap-6"
			>
				<div data-row="wrap">
					<p data-row-item="flexible basis-3">
						<Typography
							content={wallet.metadata.blurb}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					</p>

					<nav data-row="gap-2 start wrap">
						<a
							href={isLabeledUrl(wallet.metadata.urls?.websites[0]) ? wallet.metadata.urls.websites[0].url : wallet.metadata.urls.websites[0]}
							data-badge="medium"
							target="_blank"
							rel="noopener noreferrer"
						>
							{@html Globe}
							Website
						</a>

						{#if wallet.metadata.urls?.repository}
							<a
								href={isLabeledUrl(wallet.metadata.urls.repository[0]) ? wallet.metadata.urls.repository[0].url : wallet.metadata.urls.repository[0]}
								data-badge="medium"
								target="_blank"
								rel="noopener noreferrer"
							>
								{@html Github}
								Source Code
							</a>
						{/if}
					</nav>
				</div>

			</section>
		</header>

		{#if walletNews.length > 0 && !newsIsVeryStale}
			<hr />
			<div data-scroll-item="inline-detached padding-match-end" data-column>
				<SecurityNews news={walletNews} {shouldExpandNews} {allNewsResolved} semanticHeadings={false} />
			</div>
		{/if}

		<aside
			id="wallet-page-navigation"
			class="page-navigation"
			data-scroll-container="block"
			data-sticky-container
			data-column="gap-0"
		>
			<nav
				class="pie-navigation"
				data-sticky="block-start backdrop-before backdrop-always"
				data-row="start gap-2"
				aria-label="Attribute pie navigation"
				style:---initial-slice-mid-angle={`${pieInitialSliceMidAngle}deg`}
				style:--pie-padding={overallRatingPiePadding}
				style:--pie-maxR={overallRatingPieMaxRadius}
			>
				<div class="pie-navigation-placement" data-row-item="wrap-end">
					<div
						class="pie-navigation-geometry"
						style:---pie-rotation-animation-names={pieRotationAnimationNames}
						style:---pie-rotation-animation-timelines={pieRotationAnimationTimelines}
						style:---pie-rotation-animation-timing-functions={pieRotationAnimationTimingFunctions}
						style:---pie-rotation-animation-ranges={pieRotationAnimationRanges}
					>
						<NavigationItems
							items={pieNavigationItems}
							showSearch={false}
							enableSticky={false}
							defaultOpen
							ariaLabel="Attribute pie navigation"
						>
							{#snippet iconSnippet(item: NavigationItem)}
								{#if item.icon}
									<span
										class="pie-navigation-icon"
										data-icon="wbicons {item.icon}"
										aria-hidden="true"
									></span>
								{/if}
							{/snippet}
						</NavigationItems>
					</div>
				</div>
			</nav>

			<div id="wallet-page-navigation-panel" class="page-navigation-panel" popover="auto" data-column="gap-0">
				<nav
					data-column
					data-column-item="flexible"
					data-sticky-container
				>
					<NavigationItems
						items={pieNavigationItems}
						showSearch={false}
						defaultOpen
						ariaLabel="Table of contents"
						afterLabelSnippet={navigationBadgeSnippet}
					>
						{#snippet iconSnippet(item: NavigationItem, depth: number)}
							{#if item.icon}
								<span
									class="toc-icon"
									data-icon="wbicons {item.icon}"
								></span>
							{/if}
						{/snippet}
					</NavigationItems>
				</nav>
			</div>
		</aside>

		{#if showStage}
			{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}

			<section id="stages" data-sticky-breadcrumb="scope">
				<header
					data-sticky="block block-start backdrop-before backdrop-stuck"
					data-row
					data-scroll-item="inline-detached"
				>
					<div
						class="stage-heading-position"
						data-sticky-breadcrumb="position"
					>
						<a
							data-link="camouflaged"
							data-sticky-breadcrumb="item"
							href="#stages"
							interestfor="stages"
						>
							<h2>Stage Progress</h2>
						</a>
					</div>
				</header>

				<div data-scroll-item="inline-detached padding-match-end" data-column>
					<WalletStageOverview {wallet} {stage} {ladderEvaluation} />
				</div>
			</section>
		{/if}

		{#each evalTree ? Object.values(attributeTree) : [] as attrGroup}
			{@const evalGroup = evalTree[attrGroup.id]}

			{#if evalGroup}
				{@render attributeGroupSnippet({
					attrGroup,
					evalGroup,
				})}
			{/if}
		{/each}

		{#if walletNews.length > 0 && newsIsVeryStale}
			<hr />
			<div data-scroll-item="inline-detached padding-match-end" data-column>
				<SecurityNews news={walletNews} {shouldExpandNews} {allNewsResolved} />
			</div>
		{/if}

		<div class="details-controls-layer" data-sticky-container>
			<menu
				class="details-controls"
				data-scripting="required"
				data-sticky="block-start backdrop-before backdrop-stuck"
				data-row="gap-2"
				aria-label="Expand or collapse rating details"
			>
				<li>
					<Tooltip
						placement="block-start"
						buttonProps={{
							'data-icon': 'circle',
							'data-details-scope': 'group',
							'aria-label': 'Expand or collapse all details in the current section',
						}}
					>
						<span>{@html ListCollapseIcon}</span>


						{#snippet TooltipContent()}
							Toggle all details in the current section
						{/snippet}
					</Tooltip>
				</li>
			</menu>
		</div>
	</article>

</div>


{#snippet navigationBadgeSnippet(item: NavigationItem, depth: number)}
	<WalletPageNavigationBadge
		{item}
		{depth}
		{attributeTree}
		{evalTree}
		{showScores}
	/>
{/snippet}


{#snippet attributeGroupSnippet({
	attrGroup,
	evalGroup,
}: {
	attrGroup: AttributeGroup<_AttributeGroupId>
	evalGroup: EvaluationTree<_AttributeGroupId>[_AttributeGroupId]
})}
	{@const attributes = attrGroup.attributes
		.map(({ attribute, weight }) => ({
			attribute,
			weight,
			evalAttr: evalGroup[attribute.id],
		}))
		.filter(({ evalAttr }) => evalAttr && evalAttr.evaluation.outcome.rating !== Rating.EXEMPT)
		.map(({ attribute, evalAttr, weight }) => ({
			attribute,
			evalAttr: evalAttr!,
			weight,
		}))}

	{#if attributes.length > 0}
		{@const id = slugifyCamelCase(attrGroup.id)}
		{@const href = `#${id}`}
		{@const score = calculateAttributeGroupScore(attrGroup, evalGroup)}
		{@const scoreLevel = score === null || score.score === null ? null : (score.score >= 0.7 ? 'high' : score.score >= 0.4 ? 'medium' : 'low')}
		{@const scoreColor = scoreToColor(score === null ? null : score.score)}

		<hr />

		<section
			class="attribute-group"
			{id}
			aria-label={attrGroup.displayName}
			data-sticky-breadcrumb="scope"
			data-score={scoreLevel}
			style:--accent={scoreColor}
		>
			<div
				class="attribute-group-stack"
				data-scroll-item="inline-detached padding-match-end"
				style:---pie-timeline={pieTimelineByHref.get(href)}
			>
				<header
					data-sticky="block block-start backdrop-before backdrop-stuck"
					data-row="start gap-4"
					data-scroll-item="inline-detached"
					style:---wallet-icon-anchor={`--wallet-group-icon-${id}`}
				>
					<div
						class="attribute-group-summary-layout"
						data-row-item="flexible basis-2"
						data-row="start gap-2 wrap"
					>
						<div
							class="attribute-group-heading"
							data-column="gap-1"
						>
							<div
								class="attribute-group-heading-position"
								data-sticky-breadcrumb="position"
							>
								<a
									data-link="camouflaged"
									data-sticky-breadcrumb="item"
									{href}
									interestfor={id}
								>
									<h2 title={formatAttributeGroupTitleText(attrGroup, score, showScores)}>
										{attrGroup.displayName}
									</h2>
								</a>
							</div>

							{#if attrGroup.perWalletQuestion}
								<div class="section-caption">
									<Typography
										content={attrGroup.perWalletQuestion}
										strings={{ WALLET_NAME: wallet.metadata.displayName }}
									/>
								</div>
							{/if}
						</div>

						{#if showScores}
							<ScoreBadge {score} size="medium" />
						{/if}
					</div>

					<span
						class="attribute-group-icon"
					>
						<span
							class="breadcrumb-icon"
							data-icon="wbicons {attrGroup.icon}"
							aria-hidden="true"
						></span>
					</span>
				</header>

				<div data-column>
					<div class="attributes" data-column="gap-5">
						{#each attributes as { attribute, evalAttr }}
							{@render attributeSnippet({
								attrGroupId: attrGroup.id,
								attribute,
								evalAttr,
							})}
						{/each}
					</div>
				</div>
			</div>
		</section>
	{/if}
{/snippet}


{#snippet attributeSnippet({
	attrGroupId,
	attribute,
	evalAttr,
}: {
	attrGroupId: string
	attribute: Attribute<OutcomeMetadata>
	evalAttr: EvaluatedAttribute<OutcomeMetadata>
})}
	{@const relevantVariants = attrToRelevantVariants.get(attribute.id) ?? []}
	{@const id = slugifyCamelCase(attribute.id)}
	{@const href = `#${id}`}
	{@const verifiability = evalAttr.evaluation.outcome.verifiability}
	{@const stageContext = showStage ? getWalletStageAndLadder(wallet) : null}
	{@const relevantStage = (
		stageContext?.ladderType
			? getAttributeStagesForWallet(ladders, attribute, wallet)
				.find(({ ladderType }) => ladderType === stageContext.ladderType)
				?.stage
			: undefined
	)}

	{@const override = getAttributeOverride(wallet, attrGroupId, attribute.id)}

	{@const howToImprove = override?.howToImprove !== undefined ? override.howToImprove : evalAttr.evaluation.howToImprove}

	{@const variantSpecificCaption = (() => {
		const thisVariantSpecificity = relevantVariants.length === 0 ? VariantSpecificity.ALL_SAME : relevantVariants.length === 1 ? VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT : VariantSpecificity.NOT_UNIVERSAL

		switch (thisVariantSpecificity) {
			case VariantSpecificity.ALL_SAME:
				return null
			case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
				return selectedVariant ? `This rating is only relevant for the ${variantToName(selectedVariant, false)} version.` : null
			default:
				return selectedVariant ? `This rating is specific to the ${variantToName(selectedVariant, false)} version.` : 'This rating differs across versions. Select a specific version for details.'
		}
	})()}

	<section
		class="attribute"
		{id}
		aria-label={attribute.displayName}
		style:--accent={ratingToColor(evalAttr.evaluation.outcome.rating)}
		data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
	>
		<details
			open
			data-card="radius-8 padding-6 border-accent"
			data-column="gap-0"
			data-sticky-breadcrumb="scope"
		>
			<summary data-row>
				<header
					data-row-item="flexible"
					data-row="start gap-3"
					style:---wallet-icon-anchor={`--wallet-attribute-icon-${id}`}
					style:---wallet-companion-anchor={`--wallet-attribute-companion-${id}`}
				>
					<div
						class="attribute-heading"
						data-row-item="flexible basis-2"
						data-column="gap-2"
					>
						<div class="attribute-heading-row" data-row="start gap-2 wrap">
							<div
								class="attribute-heading-position"
								data-row-item="flexible"
								data-sticky-breadcrumb="position"
								style:---pie-timeline={pieTimelineByHref.get(href)}
							>
								<a
									data-link="camouflaged"
									data-sticky-breadcrumb="item"
									{href}
									interestfor={id}
									data-row="start gap-2"
								>
									<h3 title={formatAttributeTitleText(evalAttr)}>
										{attribute.displayName}
									</h3>

									{#if relevantStage}
										<span
											class="attribute-stage-badge"
											data-badge="small"
											style:--accent="var(--accent-color)"
											title={`This attribute is required for ${relevantStage.label}`}
										>
											<small>{relevantStage.label}</small>
										</span>
									{/if}
								</a>
							</div>

							<div
								class="attribute-summary-companions-position"
								data-row-item="wrap-end"
							>
								<div
									class="attribute-summary-companions"
									data-row="end gap-2 wrap"
								>
									{#if 0 < relevantVariants.length && relevantVariants.length < Object.keys(wallet.variants).length}
									<div
										class="variant-indicator"
										data-badge="small"
										data-row="gap-2"
										style:--accent="var(--color-accent-pink-light)"
										title={`Only rated on the ${variantToName(relevantVariants[0], false)} version`}
									>
										{#if relevantVariants.length === 1}
											<small>Only</small>
										{/if}

										{#each relevantVariants as variant}
											<span class="variant-badge" data-row="gap-1">
												{@html variants[variant].icon}
											</span>
										{/each}
									</div>
									{/if}

									{#if verifiability === Verifiability.UNVERIFIABLE}
										<data
											data-row-item="wrap-end"
											data-badge="medium"
											value={verifiability}
											style:--accent="var(--accent-color)"
										>Unverifiable</data>
									{:else if verifiability === Verifiability.INDEPENDENTLY_AUDITED}
										<data
											data-row-item="wrap-end"
											data-badge="medium"
											value={verifiability}
											style:--accent="var(--accent-color)"
										>Unverifiable but audited</data>
									{/if}

									<data
										data-badge="medium"
										value={evalAttr.evaluation.outcome.rating}
									>{evalAttr.evaluation.outcome.rating}</data>
								</div>
							</div>
						</div>

						{#if attribute.question}
							<div class="subsection-caption">
								<Typography
									content={attribute.question}
									strings={{ WALLET_NAME: wallet.metadata.displayName }}
								/>
							</div>
						{/if}
					</div>

					<span
						class="attribute-icon"
					>
						<span
							class="breadcrumb-icon"
							data-icon="wbicons {attribute.icon}"
							aria-hidden="true"
						></span>
					</span>
				</header>
			</summary>
			<div class="attribute-content" data-column="gap-6">

			<ul
				class="attribute-rating-details"
				data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
				data-card="padding-5"
			>
				<li
					data-list-item="gap-3"
					data-list-item-marker={ratingIcons[evalAttr.evaluation.outcome.rating as Rating]}
				>
					{#if isTypographicContent(evalAttr.evaluation.details)}
						<Typography
							content={evalAttr.evaluation.details}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>

					{:else if evalAttr.evaluation.details}
						{@const componentName = evalAttr.evaluation.details.component.component}
						{@const componentProps = evalAttr.evaluation.details.component.componentProps}
						{@const outcome = evalAttr.evaluation.outcome}
						{@const references = evalAttr.evaluation.references && toFullyQualified(evalAttr.evaluation.references)}

						<div data-column>
							{#if componentName === 'AddressCorrelationDetails'}
								<AddressCorrelationDetails {...(componentProps as AddressCorrelationDetailsProps)} {wallet} />
							{:else if componentName === 'PrivateTransfersDetails'}
								<PrivateTransfersDetails {...(componentProps as PrivateTransfersDetailsProps)} {wallet} />
							{:else if componentName === 'ChainVerificationDetails'}
								<ChainVerificationDetails {...(componentProps as ChainVerificationDetailsProps)} {wallet} refs={references} />
							{:else if componentName === 'ScamAlertDetails'}
								<ScamAlertDetails {...(componentProps as ScamAlertDetailsProps)} {wallet} {outcome} />
							{:else if componentName === 'SecurityAuditsDetails'}
								<SecurityAuditsDetails {...(componentProps as SecurityAuditsDetailsProps)} {wallet} metadata={outcome.metadata!} />
							{:else if componentName === 'TransactionInclusionDetails'}
								<TransactionInclusionDetails {...(componentProps as TransactionInclusionDetailsProps)} {wallet} />
							{:else if componentName === 'FundingDetails'}
								<FundingDetails {...(componentProps as FundingDetailsProps)} {wallet} />
							{:else if componentName === 'AccountRecoveryDetails'}
								<AccountRecoveryDetails {...(componentProps as AccountRecoveryDetailsProps)} {wallet} metadata={outcome.metadata!} />
							{:else if componentName === 'AccountUnruggabilityDetails'}
								<AccountUnruggabilityDetails {...(componentProps as AccountUnruggabilityDetailsProps)} {wallet} metadata={outcome.metadata!} />
							{:else if componentName === 'UnratedAttribute'}
								<UnratedAttribute {...(componentProps as UnratedAttributeProps<OutcomeMetadata>)} {wallet} />
							{/if}
						</div>

					{:else}
						<div data-column>
							<Typography
								content={{
									contentType: ContentType.TEXT,
									text: `No detailed evaluation available for ${attribute.displayName}`,
								}}
							/>
						</div>
					{/if}
				</li>
			</ul>

			{#if variantSpecificCaption}
				<div class="variant-caption">
					{variantSpecificCaption}
				</div>
			{/if}

			{#if evalAttr.evaluation.impact}
				<div
					class="impact"
					data-column="gap-6"
				>
					<Typography
						content={evalAttr.evaluation.impact}
						strings={{ WALLET_NAME: wallet.metadata.displayName }}
					/>
				</div>
			{/if}

			{#if (
				evalAttr.evaluation.references?.length &&
				(
					isTypographicContent(evalAttr.evaluation.details) ||
					!(
						// Custom components that render their own reference links
						[
							'ChainVerificationDetails',
							'FundingDetails',
							'ScamAlertDetails',
							'SecurityAuditsDetails',
						]
							.includes(evalAttr.evaluation.details.component.component)
					)
				)
			)}
				<ReferenceLinks
					references={toFullyQualified(evalAttr.evaluation.references)}
					cardBackground="secondary"
				/>
			{/if}

			{#if attribute.id === 'hardwareWalletSupport' && evalAttr.evaluation.outcome && typeof evalAttr.evaluation.outcome === 'object' && 'supportedHardwareWallets' in evalAttr.evaluation.outcome && Array.isArray(evalAttr.evaluation.outcome.supportedHardwareWallets) && evalAttr.evaluation.outcome.supportedHardwareWallets.length > 0}
				{@const supportedBrands = evalAttr.evaluation.outcome.supportedHardwareWallets}

				{@const supportedModels =
					allHardwareModels.filter(m => (
						supportedBrands.includes(m.brandId.toUpperCase())
					))
				}

				<div class="supported-hardware-wallets" data-card="secondary padding-6">
					<h4>Supported hardware wallets:</h4>
					<div data-row="gap-2 wrap start">
						{#each supportedModels.filter(m => !selectedModel || m.id === selectedModel) as model}
							<a
								href={`/${model.brandId}/?model=${model.modelId}`}
								data-badge="medium"
							>
								<img src={model.iconUrl} alt={model.brandName} />
								{model.modelName}
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<div class="attribute-accordions" data-column="gap-3">
				<details
					open
					data-card="padding-5 secondary radius-4"
					data-column="gap-0"
					data-sticky-container
				>
					<summary data-sticky="block block-start backdrop-before backdrop-stuck">
						<h4
							id={`${id}-why`}
							data-sticky-breadcrumb="item mobile"
						>
							<a data-link="camouflaged" href={`#${id}-why`}>
								{evalAttr.evaluation.outcome.rating === Rating.PASS || evalAttr.evaluation.outcome.rating === Rating.UNRATED ? 'Why does this matter?' : 'Why should I care?'}
							</a>
						</h4>
					</summary>

					<section data-column="gap-6">
						{#if attribute.why}
							<Typography
								content={attribute.why}
							/>
						{:else}
							<p>No explanation available.</p>
						{/if}
					</section>
				</details>

				<details
					open
					data-card="secondary padding-5 radius-4"
					data-column="gap-0"
					data-sticky-container
				>
					<summary data-sticky="block block-start backdrop-before backdrop-stuck">
						<h4
							id={`${id}-methodology`}
							data-sticky-breadcrumb="item mobile"
						>
							<a data-link="camouflaged" href={`#${id}-methodology`}>
								{getHowIsEvaluatedHeading(attribute)}
							</a>
						</h4>
					</summary>

					<section
						class="attribute-rating-methodology"
						data-column="gap-6"
					>
						{#if attribute.methodology}
							<Typography content={attribute.methodology} />
						{:else}
							<p>No methodology information available.</p>
						{/if}

						{#if attribute.ratingScale}
							{#if attribute.ratingScale.display === 'simple'}
								<aside
									data-card="radius-4"
								>
									<Typography
										content={attribute.ratingScale.content}
									/>
								</aside>
							{:else}
								<aside
									data-card="radius-4"
									data-column="gap-5"
								>
									{#if attribute.ratingScale.exhaustive}
										<h5>A few examples:</h5>
									{/if}

									<ul data-list="gap-4">
										{#each (
											[
												{
													rating: Rating.PASS,
													label: 'passing',
													exampleRatings: attribute.ratingScale.pass,
												},
												{
													rating: Rating.PARTIAL,
													label: 'partial',
													exampleRatings: attribute.ratingScale.partial,
												},
												{
													rating: Rating.FAIL,
													label: 'failing',
													exampleRatings: attribute.ratingScale.fail,
												},
											]
												.filter(({ exampleRatings }) => !!exampleRatings)
												.map(({ rating, label, exampleRatings }) => ({
													rating,
													label,
													exampleRatings: normalizeExampleRatings(exampleRatings),
												}))
												.filter(
													(item): item is typeof item & { exampleRatings: NonEmptyArray<ExampleRating<OutcomeMetadata>> } => item.exampleRatings.length > 0,
												)
										) as { rating, label, exampleRatings }}
											<li
												data-list-item="gap-3"
												data-list-item-marker={ratingIcons[rating]}
											>
												<p>A wallet would get a <strong>{label}</strong> rating if...</p>

												<ul>
													{#each exampleRatings as exampleRating}
														<li>
															{#if exampleRating.description.contentType === ContentType.MARKDOWN}
																<Typography
																	content={exampleRating.description}
																/>
															{:else}
																{exampleRating.description.text}
															{/if}
														</li>
													{/each}
												</ul>
											</li>
										{/each}
									</ul>
								</aside>
							{/if}
						{/if}
					</section>
				</details>

				{#if howToImprove}
					<details
						open
						data-card="secondary padding-5 radius-4"
						data-column="gap-0"
						data-sticky-container
						data-sticky-breadcrumb="scope mobile"
					>
						<span
							class="detail-breadcrumb-position"
							data-sticky-breadcrumb="position mobile"
							aria-hidden="true"
						></span>

						<summary data-sticky="block block-start backdrop-before backdrop-stuck">
							<h4
								id={`${id}-improvement`}
								data-sticky-breadcrumb="item mobile"
							>
								<a data-link="camouflaged" href={`#${id}-improvement`}>
									{getHowToImproveHeading(attribute, wallet.metadata.displayName)}
								</a>
							</h4>
						</summary>

						<section data-column>
							<Typography
								content={howToImprove}
								strings={getWalletEvalStrings(wallet)}
							/>

							{#if override}
								<div class="note" data-card="padding-3" data-row="gap-4">
									<div class="icon">ℹ️</div>
									<p>
										{`Note: This recommendation is specific to ${wallet.metadata.displayName} from the Walletbeat team, not our general recommendation for all wallets of this type.`}
									</p>
								</div>
							{/if}
						</section>
					</details>
				{/if}
			</div>
			</div>
		</details>
	</section>
{/snippet}


<style>
	.container {
		---wallet-content-block-padding-max: 5rem;
		---wallet-content-inline-padding: 2rem;
		---wallet-icon-sticky-block-start: calc(
			var(---wallet-page-block-offset)
			+ var(---wallet-sticky-content-inset)
		);
		---wallet-content-inline-start: max(
			var(---wallet-content-inline-padding),
			(
				var(--sticky-sizeInline)
				- var(--scrollItem-inlineDetached-maxSize)
			)
			/ 2
		);
		---wallet-name-flow-block-start: calc(
			var(---wallet-page-block-offset)
				+ min(
					var(---wallet-content-inline-start),
					var(---wallet-content-block-padding-max)
				)
		);
		---wallet-breadcrumb-attribute-font-size: 1.17rem;
		---wallet-breadcrumb-group-font-size: calc(
			(
				var(---wallet-breadcrumb-root-font-size)
				+ var(---wallet-breadcrumb-attribute-font-size)
			)
			/ 2
		);
		---wallet-breadcrumb-icon-block-start: calc(
			anchor(--sticky-breadcrumb-scope top)
			+ (
				var(---wallet-breadcrumb-block-size)
					- var(---wallet-breadcrumb-heading-icon-size)
			)
			/ 2
		);
		---wallet-breadcrumb-icon-inline-start: calc(
			anchor(var(--stickyBreadcrumb-parentAnchor) end)
				+ var(---wallet-breadcrumb-gap)
		);
		---wallet-breadcrumb-heading-translate: calc(
			var(---wallet-breadcrumb-heading-icon-size)
				+ var(---wallet-breadcrumb-heading-icon-gap)
		);
		---wallet-breadcrumb-companion-block-start: calc(
			var(---wallet-icon-sticky-block-start)
				+ var(---wallet-breadcrumb-block-size) / 2
		);
		---wallet-breadcrumb-companion-inline-end-clearance: 0px;
		---wallet-breadcrumb-companion-slot-inline-size: 12rem;
		---wallet-breadcrumb-surface-inline-end-clearance: var(
			---wallet-page-navigation-inline-size
		);
		---wallet-attribute-heading-font-size: 1.17em;
		/* One sticky row of travel: leave the flow pad and land as the source
		 * would reach the sticky inset. */
		---wallet-breadcrumb-arrival-offset: 0px;
		---wallet-breadcrumb-animation-range:
			exit-crossing calc(
				1px
					- var(---wallet-breadcrumb-arrival-offset)
					- var(---wallet-breadcrumb-block-size)
			)
			exit-crossing calc(1px - var(---wallet-breadcrumb-arrival-offset));
		---wallet-breadcrumb-attribute-arrival-offset: 0px;
		---wallet-pie-attribute-animation-range:
			exit-crossing calc(
				1px
					- var(---wallet-breadcrumb-attribute-arrival-offset)
					- var(---wallet-breadcrumb-block-size)
			)
			exit-crossing calc(
				1px - var(---wallet-breadcrumb-attribute-arrival-offset)
			);
		---wallet-group-icon-size: 2rem;
		---wallet-group-header-padding-block: 0px;
		---wallet-group-heading-font-size: var(---wallet-breadcrumb-group-font-size);
		---wallet-group-caption-white-space: nowrap;
		display: grid;
		grid-template:
			'Content Nav'
			/ minmax(0, 1fr) auto
		;
		position: relative;
		line-height: var(---wallet-line-height);

		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 54rem;
			--scrollItem-inlineDetached-paddingStart: var(---wallet-content-inline-padding);
			--scrollItem-inlineDetached-maxPaddingMatchStart: var(---wallet-content-block-padding-max);
			--scrollItem-inlineDetached-paddingEnd: var(---wallet-content-inline-padding);
			--scrollItem-inlineDetached-maxPaddingMatchEnd: var(---wallet-content-block-padding-max);
			--sticky-marginInlineEnd: var(---wallet-page-navigation-inline-size);

			@media (max-width: 1024px) {
				--sticky-marginInlineEnd: 0px;
			}
		}

		@media (max-width: 1024px) {
			---wallet-mobile-pie-size-rem: 8;
			---wallet-mobile-pie-size: calc(
				var(---wallet-mobile-pie-size-rem) * 1rem
			);
			---wallet-mobile-pie-flow-size-rem: 18;
			---wallet-mobile-pie-flow-size: calc(
				var(---wallet-mobile-pie-flow-size-rem) * 1rem
			);
			---wallet-mobile-pie-flow-inline-start: calc(
				50vi - var(---wallet-mobile-pie-flow-size) / 2
			);
			---wallet-mobile-pie-scale: calc(
				var(---wallet-mobile-pie-size-rem)
					/ var(---wallet-mobile-pie-flow-size-rem)
			);
			---wallet-mobile-pie-target-block-start: calc(
				var(--navigation-mobile-blockSize)
					- (
						var(---wallet-mobile-pie-flow-size)
							- var(---wallet-mobile-pie-size)
					) / 2
			);
			---wallet-mobile-pie-target-inline-start: calc(
				100vi
					- var(--navigation-mobile-gap)
					- (
						var(---wallet-mobile-pie-flow-size)
							+ var(---wallet-mobile-pie-size)
					) / 2
			);
			---wallet-mobile-pie-inline-clearance: calc(
				var(---wallet-mobile-pie-size)
					+ 0.5rem
			);
			---wallet-breadcrumb-inline-end: calc(
				var(---wallet-mobile-pie-inline-clearance)
				+ var(--navigation-mobile-gap)
			);
			---wallet-breadcrumb-companion-inline-end-clearance: var(
				---wallet-mobile-pie-inline-clearance
			);
			---wallet-breadcrumb-surface-inline-end-clearance: 0px;
			---wallet-name-mobile-block-start: calc(
				(
					var(--navigation-mobile-blockSize)
						- var(---wallet-name-flow-font-size)
							* var(---wallet-line-height)
				) / 2
			);
			grid-template:
				[Nav-start]
				'Content'
				[Nav-end]
				/ [Nav-start] minmax(0, 1fr) [Nav-end]
			;

			@media (max-width: 480px) {
				/* Keep the compact badge lane intrinsic-looking without allowing
				 * its fixed handoff to collapse the summary's flow reservation. */
				---wallet-breadcrumb-companion-slot-inline-size: calc(
					4.625rem
						+ var(--navigation-mobile-gap)
				);
			}
		}

		article {
			grid-area: Content;
			position: relative;
			timeline-scope: --wallet-stage-timeline;
		}

		.page-navigation {
			/* Nested scroll root: don't inherit the page's perspective or backdrop. */
			--scrollContainer-perspective: none;
			anchor-name: --wallet-page-navigation;

			grid-area: Nav;
			z-index: 2;

			position: fixed;
			inset-inline-start: auto;
			inset-inline-end: 0;
			inset-block-start: var(---wallet-page-block-offset);
			inset-block-end: auto;
			align-self: start;
			inline-size: var(---wallet-page-navigation-inline-size);
			block-size: calc(100cqb - var(---wallet-page-block-offset));

			scroll-behavior: smooth;
			background-color: var(---wallet-breadcrumb-surface-background);
			box-shadow: 0 0 var(--separator-width) var(--border-color);

			&::after {
				content: '';
				z-index: 3;
				position: sticky;
				inset-block-end: 0;
				flex: 0 0 calc(
					var(---anchor-control-inset)
						+ var(---anchor-button-size)
						+ var(---anchor-control-gap)
				);
				margin-block-start: auto;
				background-color: var(--background-secondary);
				box-shadow: 0 calc(-1 * var(--separator-width)) 0 var(--border-color);
			}

			.page-navigation-panel {
				flex: 1 1 auto;
				min-block-size: 0;
				background: transparent;
				color: inherit;

				@media (min-width: 1025px) {
					display: flex;
					overflow: visible;
					/*
					 * The panel is the TOC scroll viewport. Pull its box over the
					 * pie while retaining the pie-sized flow reservation, so the
					 * flower remains an overlay rather than a second scroll region.
					 */
					margin-block-start: calc(-1 * var(---pie-size));
					position: static;
					inline-size: 100%;
				}
			}

			.page-navigation-panel > nav {
				--navigation-items-level-2-grid-columns: repeat(
					auto-fit,
					minmax(min(100%, calc(32ch + 3rem)), 1fr)
				);

				position: relative;
				z-index: 0;
				min-block-size: max-content;
				padding: 0.75rem;

				&[data-sticky-container] {
					--sticky-paddingBlockStart: 0.75rem;
					--sticky-paddingBlockEnd: 0.75rem;
				}

				/* TOC attributes are the same semantic level as the main nav's
				 * depth-2 grid; the TOC starts one DOM depth earlier. */
				:global(.navigation-items menu[data-navigation-depth='1']) {
					display: grid;
					grid-template-columns: var(--navigation-items-level-2-grid-columns);
					margin-inline-start: 0;
				}

				:global(
					.navigation-items
						menu[data-navigation-depth='1']
						> li
						> a
						> [data-row-item='flexible']
				) {
					white-space: nowrap;
				}
			}

			@media (max-width: 1024px) {
				--navigation-menu-maskFade: 9rem;

				z-index: var(---wallet-breadcrumb-layer-root);
				position: relative;
				inset: auto;
				inline-size: 100%;
				block-size: var(---wallet-mobile-pie-flow-size);
				margin-block-end: calc(
					(
						var(--navigation-mobile-blockSize)
							- var(---wallet-mobile-pie-size)
					) / 2
				);
				display: flex;
				background-color: transparent;
				box-shadow: none;
				pointer-events: none;

				&::after {
					content: none;
				}

				.page-navigation-panel {
					inline-size: 100%;
					block-size: calc(100dvb - var(---wallet-page-block-offset));
					clip-path: inset(0 0 100% 0);
					transition-property:
						background-color,
						-webkit-backdrop-filter,
						backdrop-filter,
						clip-path,
						display,
						overlay;
					transition-behavior: allow-discrete;
					pointer-events: auto;
				}

				.page-navigation-panel > nav {
					inline-size: 100%;
					flex: 1 0 auto;
					min-block-size: 0;
					background-color: var(---wallet-breadcrumb-surface-background);
					box-shadow: none;
					filter: blur(0);
					mask-image: linear-gradient(
						to bottom,
						black calc(100% - var(--navigation-menu-maskFade)),
						transparent
					);
					mask-position: top;
					mask-repeat: no-repeat;
					mask-size: 100% calc(100% + var(--navigation-menu-maskFade));
					opacity: 1;
					translate: 0 0 0;
					transition-property: filter, opacity, translate, mask-size, display;
					transition-behavior: allow-discrete;
				}

				.page-navigation-panel:not(:popover-open) > nav {
					filter: blur(0.375rem);
					interactivity: inert;
					mask-size: 100% 0;
					opacity: 0;
					translate: 0 -0.75rem 1.25rem;
					pointer-events: none;
				}

				.page-navigation-panel:popover-open {
					position: fixed;
					inset:
						var(---wallet-page-block-offset)
						0
						0;
					block-size: calc(100dvb - var(---wallet-page-block-offset));
					clip-path: inset(0);
					background: linear-gradient(
						to bottom,
						transparent var(---wallet-mobile-pie-size),
						var(---wallet-breadcrumb-surface-background)
							var(---wallet-mobile-pie-size)
					);
					pointer-events: none;

					> nav {
						block-size: calc(100% - var(---wallet-mobile-pie-size));
						margin-block-start: var(---wallet-mobile-pie-size);
						pointer-events: auto;
					}

					@starting-style {
						clip-path: inset(0 0 100% 0);

						> nav {
							filter: blur(0.375rem);
							mask-size: 100% 0;
							opacity: 0;
							translate: 0 -0.75rem 1.25rem;
						}
					}
				}

				> .pie-navigation {
					pointer-events: none;
				}

			}
		}
	}

	:global(#layout:has(#wallet-page)) {
		/*
		 * A perspective establishes a containing block for fixed descendants.
		 * Breadcrumbs must remain fixed to this scroll container, not its moving
		 * contents.
		 */
		--scrollContainer-perspective: none;
		scroll-timeline-name: --wallet-page-scroll-timeline;
		scroll-timeline-axis: block;
		/* Longest depth-2 attribute label plus its icon and row padding. */
		---wallet-page-navigation-inline-size-rem: 26;
		---wallet-page-navigation-inline-size: calc(
			var(---wallet-page-navigation-inline-size-rem)
			* 1rem
		);
		---wallet-page-block-offset: 0px;
		---wallet-breadcrumb-surface-background: light-dark(#F8EDFF, #130a2b);
		---wallet-breadcrumb-layer-root: 20;
		---wallet-breadcrumb-layer-group: 21;
		---wallet-breadcrumb-layer-attribute: 22;
		---wallet-breadcrumb-layer-detail: 23;
		---wallet-sticky-content-inset: 1rem;
		---wallet-name-sticky-icon-size: 2rem;
		---wallet-name-flow-icon-size: 3rem;
		---wallet-name-flow-font-size: 2.25rem;
		---wallet-name-scale: calc(
			var(---wallet-breadcrumb-root-font-size)
				/ var(---wallet-name-flow-font-size)
		);
		---wallet-line-height: 1.6;
		---wallet-breadcrumb-root-font-size: 1.8rem;
		---wallet-breadcrumb-gap: 1.5rem;
		---wallet-breadcrumb-heading-icon-size: 1.5rem;
		---wallet-breadcrumb-heading-icon-gap: 0.5rem;
		---wallet-breadcrumb-block-size: calc(
			var(---wallet-breadcrumb-root-font-size)
			* var(---wallet-line-height)
		);
		---wallet-breadcrumb-mobile-row-gap: 0.25rem;
		---wallet-breadcrumb-attribute-row-offset: 0px;
		---wallet-breadcrumb-surface-fade: 0.5rem;
		---wallet-header-animation-range: 1px 7.5rem;
		/*
		 * Scroll padding / sticky h4 sit flush under crumb text.
		 * `--stickyBreadcrumb-trackBlockEnd` still includes the surface fade for
		 * breadcrumb exit ranges; hash targets and accordion stickies omit it.
		 */
		---wallet-sticky-stack-block-end: calc(
			var(---wallet-page-block-offset)
			+ var(---wallet-sticky-content-inset)
			+ var(---wallet-breadcrumb-block-size)
			+ var(---wallet-breadcrumb-attribute-row-offset)
		);
		--scrollContainer-scrollPaddingBlockStart: var(---wallet-sticky-stack-block-end);
		---anchor-button-size: 2.5rem;
		---anchor-control-inset: 0.75rem;
		---anchor-control-gap: 0.5rem;
		scroll-marker-group: after;
		scroll-behavior: auto;
		anchor-scope: --wallet-footer;
		timeline-scope:
			--wallet-ratings-start-timeline,
			--wallet-footer-entry;

		@media (min-width: 865px) and (max-width: 1280px) {
			---wallet-page-navigation-inline-size-rem: 20;
			---wallet-breadcrumb-root-font-size: 1.5rem;
			---wallet-breadcrumb-gap: 1rem;
			---wallet-breadcrumb-heading-icon-size: 1.25rem;
			---wallet-breadcrumb-heading-icon-gap: 0.25rem;
		}

		@media (max-width: 1024px) {
			---wallet-breadcrumb-gap: 1.25rem;
			---wallet-page-block-offset: var(--navigation-mobile-blockSize);
			---wallet-name-sticky-icon-size: 2.4rem;
			---wallet-breadcrumb-root-font-size: 1.25rem;
			---wallet-sticky-content-inset: calc(
				(
					var(--navigation-mobile-blockSize)
						- var(---wallet-breadcrumb-block-size)
				) / 2
			);
			---wallet-name-trailing-reserve: calc(
				var(--navigation-mobile-trailingClearance)
					+ var(--navigation-mobile-gap)
			);
			---wallet-name-icon-excess: calc(
				var(---wallet-name-sticky-icon-size)
					/ var(---wallet-name-scale)
					- var(---wallet-name-flow-icon-size)
			);
			---wallet-name-target-inline-start: calc(
				50vi
					+ (
						var(--navigation-logo-inlineSize)
							+ var(---wallet-breadcrumb-gap)
					) / 2
			);
			anchor-scope:
				--wallet-footer,
				--layout-site-logo,
				--wallet-breadcrumb-root,
				--wallet-breadcrumb-wallet-icon,
				--wallet-name-collision;
			/* The target supplies the next row; do not reserve it before it sticks. */
			--scrollContainer-scrollPaddingBlockStart: var(---wallet-page-block-offset);

			@media (max-width: 480px) {
				---wallet-breadcrumb-attribute-row-offset: calc(
					var(---wallet-breadcrumb-block-size)
						+ var(---wallet-breadcrumb-mobile-row-gap)
				);
				/* The group crumb owns the first row under the nav; H3 owns the next. */
				---wallet-breadcrumb-attribute-arrival-offset: calc(
					var(---wallet-sticky-content-inset)
						+ var(---wallet-breadcrumb-block-size)
						+ var(---wallet-breadcrumb-mobile-row-gap)
				);
			}
		}

		/* Keep the native scroll buttons; drop the marker surface and its anchors. */
		&::scroll-marker-group {
			display: none;
		}

		&::scroll-button(block-start),
		&::scroll-button(block-end) {
			z-index: 5;
			position: fixed;
			inset-block-start: auto;
			inset-block-end: var(---anchor-control-inset);
			inline-size: var(---anchor-button-size);
			block-size: var(---anchor-button-size);
			padding: 0;
			border: var(--separator-width) solid var(--border-color);
			border-radius: 50%;
			background-color: var(--background-secondary);
			color: var(--text-primary);
			font: inherit;
			font-size: 1.25rem;
			line-height: 1;
			transition-property: scale, background-color, border-color, opacity;
			animation: keep-anchor-controls-above-footer linear both;
			animation-timeline: --wallet-footer-entry;
			animation-range: entry 0% entry 100%;
			&:is(:hover, :focus-visible) {
				background-color: var(--background-tertiary);
				border-color: var(--text-secondary);
				scale: 1.05;
			}

			&:disabled {
				opacity: 0.38;
			}
		}

		&::scroll-button(block-start) {
			inset-inline: auto calc(
				var(---anchor-control-inset)
				+ var(---anchor-button-size)
				+ var(---anchor-control-gap)
			);
			content: '↑' / 'Scroll toward the previous rating section';
		}

		&::scroll-button(block-end) {
			inset-inline: auto var(---anchor-control-inset);
			content: '↓' / 'Scroll toward the next rating section';
		}
	}

	/*
	 * Keep the independently animated background from competing with the
	 * anchor-positioned scroll animations for main-thread style updates.
	 * The blobs remain rendered; only their decorative ambient motion pauses
	 * while WalletPage is mounted.
	 */
	:global(body:has(#wallet-page) .background-blob *) {
		animation-play-state: paused;
	}

	/*
	 * The mobile navigation depth effect promotes `#content` with an identity
	 * transform. That containing block would make fixed breadcrumb insets track
	 * the scroll root instead of the viewport.
	 */
	:global(#layout:has(#wallet-page) > #content) {
		transform: none;
		transform-style: flat;
	}

	:global(#content:has(#wallet-page) > footer) {
		anchor-name: --wallet-footer;
		view-timeline-name: --wallet-footer-entry;
		view-timeline-axis: block;
	}

	:global(#wallet-page :is(.attribute-group, .attribute))::scroll-marker {
		content: none;
	}

	@keyframes keep-anchor-controls-above-footer {
		to {
			inset-block-end: calc(
				var(---anchor-control-inset)
					+ anchor-size(--wallet-footer block)
			);
		}
	}

	.details-controls-layer {
		position: absolute;
		inset: 0;
		z-index: 4;
		pointer-events: none;
	}

	.details-controls {
		--icon-size: var(---anchor-button-size);
		--icon-navigation-borderColor: var(--border-color);
		--icon-navigation-color: var(--text-primary);
		--sticky-insetBlockStart: calc(
			100dvb
				- var(---anchor-control-inset)
				- var(---anchor-button-size)
		);
		--sticky-insetInlineEnd: var(---anchor-control-inset);

		inline-size: max-content;
		margin-inline:
			auto
			calc(
				var(---wallet-page-navigation-inline-size)
					+ var(---anchor-control-inset)
			);
		list-style: none;
		pointer-events: auto;

		@media (max-width: 1024px) {
			margin-inline: var(---anchor-control-inset) auto;
		}

		:global(button[data-details-scope]) {
			background-color: var(---wallet-breadcrumb-surface-background);
			transition-property: color, background-color, border-color, scale;

			&:is(:hover, :focus-visible) {
				background-color: var(--background-tertiary);
				border-color: var(--text-secondary);
				scale: 1.05;
			}
		}

	}

	@property ---slice-scale {
		syntax: "<number>";
		inherits: true;
		initial-value: 1;
	}

	@property ---pie-start-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	@keyframes -global-WalletPieRotationStep {
		from {
			---pie-start-angle: 0deg;
		}

		to {
			/*
			 * Each animation's linear() easing scales this unit angle by its
			 * configured delta before native composition sums every step.
			 */
			---pie-start-angle: 1deg;
		}
	}

	.pie-navigation {
		display: none;
	}

	:is(.toc-icon, .attribute-group-icon, .attribute-icon) {
		display: inline-grid;
		place-items: center;
		position: relative;
		inline-size: var(--icon-size);
		block-size: var(--icon-size);
		border: 0;
		background: transparent;
		color: var(--accent, currentColor);

		&:is(.toc-icon)::before,
		> .breadcrumb-icon {
			position: absolute;
			inset: 50% auto auto 50%;
			translate: -50% -50%;
		}

		&:is(.toc-icon)::before {
			font-size: calc(var(--icon-size) * 0.55);
		}

		&:is(.attribute-group-icon, .attribute-icon)::after {
			content: '';
			position: absolute;
			inset: 50% auto auto 50%;
			inline-size: 0;
			block-size: 0;
			anchor-name: var(---wallet-icon-anchor);
		}

		> .breadcrumb-icon {
			font-size: var(--icon-size);
			inline-size: 1em;
			block-size: 1em;

			&::before {
				font-size: 1em;
			}
		}
	}

	@supports (clip-path: shape(from 0 0, line to 1px 1px, close)) {

		.container .page-navigation {
			---pie-size-rem: var(---wallet-page-navigation-inline-size-rem);
			---pie-size: calc(var(---pie-size-rem) * 1rem);

			--sticky-marginBlockStart: calc(var(---pie-size) + 0.5rem);
		}

		.container .page-navigation > .pie-navigation[data-sticky] {
			/* Face the active slice toward the content lane. */
			---pie-target-rotate: 0.75turn;

			/* Match Pie's inline-configured view box, including its padding. */
			---pie-diameter: calc(2 * (var(--pie-maxR) + var(--pie-padding)));
			---pie-origin: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
			/*
			 * Unitless rem/pixel counts preserve Firefox's fallback without
			 * duplicating the configured pie size.
			 */
			---pie-scale: calc(var(---pie-size-rem) / (var(---pie-diameter) / 16));
			/* FullTop starts at 12 o'clock. */
			---pie-rotate: calc(
				var(---pie-target-rotate)
					- var(---initial-slice-mid-angle, 0deg)
			);
			--sticky-insetBlockStart: 0px;

			display: block;
			z-index: 3;
			align-self: start;
			flex-shrink: 0;
			justify-self: stretch;
			inline-size: 100%;
			block-size: var(---pie-size);
			max-inline-size: none;
			max-block-size: none;
			pointer-events: none;
			border-radius: 0;
			--sticky-backgroundColor: var(--background-secondary);
			--sticky-backdropFilter: blur(1rem);

			&:dir(rtl) {
				---pie-target-rotate: 0.25turn;
			}

			@media (max-width: 1024px) {
				---pie-target-rotate: 0.75turn;
			}

			.pie-navigation-placement,
			.pie-navigation-geometry {
				position: relative;
				inline-size: var(---pie-size);
				block-size: var(---pie-size);
			}

			.pie-navigation-placement {
				margin-inline: auto;
			}

			.pie-navigation-geometry {
				margin-inline: 0;
				contain: strict;
			}

			@supports (
				((animation-timeline: scroll()) and (animation-range: 0% 100%)) and
					(animation-composition: accumulate) and
					(container-type: scroll-state) and
					(position-anchor: --wallet-name) and
					(inset-inline-start: anchor(--wallet-name end))
			) {
				.pie-navigation-geometry {
					animation-name: var(---pie-rotation-animation-names);
					animation-timeline: var(---pie-rotation-animation-timelines);
					animation-timing-function: var(
						---pie-rotation-animation-timing-functions
					);
					animation-duration: 1ms;
					animation-fill-mode: both;
					animation-composition: accumulate;
					animation-range: var(---pie-rotation-animation-ranges);
				}
			}

			@media (prefers-reduced-motion: reduce) {
				.pie-navigation-geometry {
					animation: none;
				}
			}

			:global(.navigation-items) {
				position: absolute;
				inset: 50% auto auto 50%;
				inline-size: calc(var(---pie-diameter) * 1px);
				block-size: calc(var(---pie-diameter) * 1px);
				contain: strict;
				translate: -50% -50%;
				scale: var(---pie-scale);
				transform: rotate(var(---pie-rotate));
				transform-origin: center;
				clip-path: circle(50%);
				pointer-events: none;
				isolation: isolate;
			}

			:global(.navigation-items),
			:global(.navigation-items menu),
			:global(.navigation-items li),
			:global(.navigation-items details),
			:global(.navigation-items summary) {
				margin: 0;
				padding: 0;
				list-style: none;
				background: transparent;
			}

			:global(.navigation-items menu),
			:global(.navigation-items li),
			:global(.navigation-items details) {
				display: block;
				position: absolute;
				inset: 0;
				inline-size: calc(var(---pie-diameter) * 1px);
				block-size: calc(var(---pie-diameter) * 1px);
				pointer-events: none;
			}

			:global(.navigation-items menu::before),
			:global(.navigation-items summary::before),
			:global(.navigation-items summary::after),
			:global(.navigation-items summary::marker) {
				display: none;
				content: none;
				background: none;
			}

			:global(.navigation-items summary) {
				display: contents;
				background: none;
			}

			:global(.navigation-items summary > a),
			:global(.navigation-items menu[data-navigation-depth='1'] > li > a) {
				---slice-mid-angle: calc(
					var(--slice-midAngle) * 1deg
					+ var(---pie-start-angle)
				);
				---slice-label-size: var(--slice-labelSize);
				---slice-scale: 1;
				---slice-label-offset: calc(var(--slice-labelR) * 1px);
				--pie-originX: var(---pie-origin);
				--pie-originY: var(---pie-origin);

				display: block;
				position: absolute;
				inset: 0;
				inline-size: 100%;
				block-size: 100%;
				padding: 0;
				border-radius: 0;
				background: var(--accent, var(--background-tertiary));
				color: var(--text-primary);
				opacity: 0.62;
				pointer-events: auto;
				transform-origin: var(--pie-originX) var(--pie-originY);
				transform:
					rotate(var(---slice-mid-angle))
					scale(var(---slice-scale))
					translateY(calc(var(--slice-offset) * -1px));
				transition-property: opacity, ---slice-scale;
			}

			:global(.navigation-items a:is(:hover, :focus-visible, :interest-source, :target-current)) {
				---slice-scale: 1.045;
				opacity: 1;
				outline: none;
			}

			:global(.navigation-items menu[data-navigation-depth='1'] > li > a) {
				z-index: 1;
				opacity: 0.08;
				pointer-events: none;
			}

			:global(.navigation-items details:is(:hover, :focus-within) menu[data-navigation-depth='1'] > li > a),
			:global(.navigation-items details:has(> summary > a:interest-source) menu[data-navigation-depth='1'] > li > a),
			:global(.navigation-items details:has(> menu a:interest-source) menu[data-navigation-depth='1'] > li > a) {
				opacity: 0.62;
				pointer-events: auto;
			}

			:global(.navigation-items a > span[data-row-item]) {
				position: absolute;
				inline-size: 1px;
				block-size: 1px;
				margin: -1px;
				overflow: hidden;
				clip-path: inset(50%);
				white-space: nowrap;
			}

			:global(.navigation-items a > .pie-navigation-icon) {
				--icon-size: calc(var(---slice-label-size) * 1px);

				position: absolute;
				inset: var(---pie-origin) auto auto var(---pie-origin);
				translate: -50% calc(-50% - var(---slice-label-offset));
				rotate: calc(-1 * (var(---pie-rotate) + var(---slice-mid-angle)));
				color: var(--accent);
				filter: none;
			}
		}

		/*
		 * Chromium currently fails to invalidate :target-current when it is
		 * nested beneath the pie rule. Keep this state selector flat.
		 */
		:global(#wallet-page .pie-navigation .navigation-items a:target-current) {
			---slice-scale: 1.075;
			opacity: 1;
			outline: none;
			pointer-events: auto;

		}

		@media (max-width: 1024px) {
			.container .page-navigation {
				padding-block-start: 0;
				--sticky-marginBlockStart: 0px;
			}

			.container .page-navigation > .pie-navigation[data-sticky] {
				---pie-size-rem: var(---wallet-mobile-pie-flow-size-rem);
				---pie-size: var(---wallet-mobile-pie-flow-size);

				z-index: calc(var(---wallet-breadcrumb-layer-detail) + 1);
				anchor-name: --wallet-mobile-pie-flow;
				flex: 0 0 var(---wallet-mobile-pie-flow-size);
				inset-block-start: 0;
				inset-inline: 0;
				inline-size: 100%;
				block-size: var(---wallet-mobile-pie-flow-size);
				display: flex;
				align-items: center;

				.pie-navigation-placement {
					margin-inline: auto;
					translate: none;
				}

				&::before {
					content: none;
				}

				@supports (
					((animation-timeline: scroll()) and (animation-range: 0% 100%)) and
						(container-type: scroll-state) and
						(position-anchor: --wallet-name) and
						(inset-inline-start: anchor(--wallet-name end))
				) {
					z-index: auto;

					.pie-navigation-placement {
						z-index: calc(var(---wallet-breadcrumb-layer-attribute) + 1);
						position: fixed;
						inset-inline-start: var(---wallet-mobile-pie-flow-inline-start);
						pointer-events: none;
						transform-origin: center;
						animation: WalletMobilePiePlacement linear both;
						animation-timeline: --wallet-stage-timeline;
						animation-range: entry 60% entry 100%;
					}

					@media (prefers-reduced-motion: reduce) {
						.pie-navigation-placement {
							inset-block-start: var(---wallet-mobile-pie-target-block-start);
							inset-inline-start: var(---wallet-mobile-pie-target-inline-start);
							animation: none;
							scale: var(---wallet-mobile-pie-scale);
						}
					}
				}
			}

			.container
				.page-navigation:has(.page-navigation-panel:popover-open)
				> .pie-navigation[data-sticky] {
				.pie-navigation-placement {
					position: fixed;
					inset-block-start: var(---wallet-mobile-pie-target-block-start);
					inset-inline-start: var(---wallet-mobile-pie-target-inline-start);
					translate: none;
					scale: var(---wallet-mobile-pie-scale);
					animation: none;
				}
			}
		}

		@keyframes WalletMobilePiePlacement {
			from {
				inset-block-start: calc(
					anchor(--wallet-mobile-pie-flow top)
						+ (
							var(--navigation-mobile-blockSize)
								- var(---wallet-mobile-pie-size)
						) / 2
				);
				translate: none;
				scale: 1;
			}

			to {
				inset-block-start: var(---wallet-mobile-pie-target-block-start);
				translate: calc(
					var(---wallet-mobile-pie-target-inline-start)
						- var(---wallet-mobile-pie-flow-inline-start)
				)
					0;
				scale: var(---wallet-mobile-pie-scale);
			}
		}
	}

	/*
	 * Permalink affordance for in-flow heading links. Sticky breadcrumb items
	 * own `::before` for the `›` marker; the hash styles must not win on
	 * specificity and skew marker size/box geometry.
	 */
	a:has(> :is(h1, h2, h3)):not([data-sticky-breadcrumb]) {
		display: flex;
		align-items: center;

		&::before {
			content: '# ';
			display: inline-flex;
			justify-content: end;
			text-align: end;
			inline-size: 0;
			padding-inline-end: 0.66rem;
			margin-inline-start: -0.66rem;
			font-size: 1.25rem;
			line-height: calc(1 / 0.7);

			transition-property: opacity;
		}

		&:not(:hover, :focus-visible)::before {
			opacity: 0;
		}
	}

	article {
		min-inline-size: 0;

		> header#top {
			z-index: var(---wallet-breadcrumb-layer-root);
			view-timeline-name: --header-timeline;
			view-timeline-axis: block;
		}

		.wallet-name {
			z-index: 2;
			align-self: start;
			inline-size: max-content;

			h1 {
				font-size: var(---wallet-name-flow-font-size);
			}
		}

		.wallet-icon {
			inline-size: var(---wallet-name-flow-icon-size);
			block-size: var(---wallet-name-flow-icon-size);
			filter: drop-shadow(0 0 0.5rem rgba(255, 255, 255, 0.1));
		}

		.wallet-title-row {
			anchor-name: --wallet-title-flow-position;
			min-block-size: max(
				var(---wallet-name-flow-icon-size),
				calc(
					var(---wallet-name-flow-font-size)
					* var(---wallet-line-height)
				)
			);
		}

		@media (max-width: 1024px) {
			.wallet-summary-badges {
				flex-basis: 100%;
				justify-content: end;
				padding-inline-end: var(---wallet-breadcrumb-companion-inline-end-clearance);
			}
		}
	}

	.wallet-variant-picker-position {
		display: inline-grid;

		> :is(.wallet-variant-picker-anchor, .wallet-variant-picker-control) {
			grid-area: 1 / 1;
		}
	}

	.wallet-variant-picker-anchor {
		anchor-name: --wallet-variant-picker-position;
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.66em;
		border: 1px solid transparent;
		font-size: smaller;
		visibility: hidden;

		> span:first-child {
			flex: none;
			inline-size: 1em;
			block-size: 1em;
		}

		&::after {
			content: '';
			flex: none;
			inline-size: 0.75em;
			block-size: 1em;
		}
	}

	@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%)) {
		.attribute-heading-position {
			/* One heading box publishes the synchronized breadcrumb and pie tracks. */
			view-timeline-name:
				--sticky-breadcrumb-timeline,
				var(---pie-timeline, none);
			view-timeline-axis: block;
			view-timeline-inset: var(--stickyBreadcrumb-item-insetBlockStart, 0px) 0;
		}

		:is(
			.stage-heading-position,
			.attribute-group-heading-position
		)[data-sticky-breadcrumb~='position'] {
			/* Its sticky header cannot exit-cross the viewport. The non-sticky
			 * section or group stack owns the shared breadcrumb/pie timeline. */
			view-timeline-name: none;
		}

		@keyframes WalletBreadcrumbRevealAnimation {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		@keyframes WalletBreadcrumbMarkerAnimation {
			from {
				content: '#';
				opacity: 0;
			}
			0.01%,
			to {
				content: '›';
			}
			to {
				opacity: 1;
			}
		}

		@supports (
			(container-type: scroll-state) and
			(position-anchor: --wallet-name) and
			(inset-inline-start: anchor(--wallet-name end))
		) {
		.attribute > details > summary > header {
			anchor-scope:
				--sticky-breadcrumb-position,
				var(---wallet-icon-anchor),
				var(---wallet-companion-anchor);
			timeline-scope: --sticky-breadcrumb-timeline;
		}

		#stages > header {
			anchor-scope: --sticky-breadcrumb-position;
		}

		.attribute-group > .attribute-group-stack > header {
			anchor-scope:
				--sticky-breadcrumb-position,
				var(---wallet-icon-anchor);
		}

		.attribute-group-stack {
			timeline-scope: --sticky-breadcrumb-timeline;
			view-timeline-name:
				--sticky-breadcrumb-timeline,
				var(---pie-timeline, none);
			view-timeline-axis: block;
		}

		:is(#stages, .attribute-group-stack) {
			view-timeline-inset:
				calc(
					var(--stickyBreadcrumb-item-insetBlockStart, 0px)
						+ var(--stickyBreadcrumb-item-blockOffset, 0px)
				)
					0;

			@media (min-width: 1025px) {
				view-timeline-inset:
					calc(
						var(---wallet-icon-sticky-block-start)
							+ var(---wallet-breadcrumb-block-size)
							+ var(---wallet-breadcrumb-surface-fade)
					)
					0;
			}
		}

		#stages {
			timeline-scope:
				--sticky-breadcrumb-timeline,
				--sticky-breadcrumb-scope-timeline;
		}

		#stages > [data-scroll-item] {
			view-timeline-name: --sticky-breadcrumb-scope-timeline;
			view-timeline-axis: block;
			view-timeline-inset: var(--stickyBreadcrumb-trackBlockEnd, 0px) 0;
		}

		.container {
			--stickyBreadcrumb-gap: var(---wallet-breadcrumb-gap);
			--stickyBreadcrumb-item-insetBlockStart: var(---wallet-icon-sticky-block-start);
			--stickyBreadcrumb-item-blockSize: var(---wallet-breadcrumb-block-size);
			--stickyBreadcrumb-trackBlockEnd: calc(
				var(---wallet-icon-sticky-block-start)
				+ var(---wallet-breadcrumb-block-size)
				+ var(---wallet-breadcrumb-surface-fade)
			);
			--stickyBreadcrumb-animationRange: var(---wallet-breadcrumb-animation-range);
			/* Scroll position already supplies progression; easing only adds perceived lag. */
			--stickyBreadcrumb-animationTimingFunction: linear;
		}

		@media (prefers-reduced-motion: no-preference) {
			.container {
				---wallet-group-header-padding-block: 1rem;
				---wallet-group-icon-size: 4.125em;
				---wallet-group-heading-font-size: 1.8rem;
				---wallet-group-caption-white-space: normal;
			}

			.attribute-group-stack {
				---wallet-group-sticky-block-end-override: var(---wallet-sticky-stack-block-end);
			}

			.attribute-group > .attribute-group-stack[data-scroll-item] {
				position: relative;
				inset-inline: auto;
			}

			:is(
				#stages > header[data-scroll-item][data-sticky],
				.attribute-group
					> .attribute-group-stack[data-scroll-item]
					> header[data-scroll-item][data-sticky]
			) {
				z-index: var(---wallet-breadcrumb-layer-group);
				overflow: visible;
				max-block-size: none;

				&::before {
					content: none;
				}
			}

		}

		article > header#top .wallet-name {
			--stickyBreadcrumb-itemAnchor: --wallet-breadcrumb-root;
		}

		article > header#top .wallet-title-row::after {
			content: attr(data-wallet-name) / '';
			order: -1;
			flex: none;
			padding-inline-start: calc(
				var(---wallet-name-flow-icon-size)
					+ 0.5em
			);

			visibility: hidden;
			font-family: var(--fontFamily-spaceGrotesk), 'Noto Color Emoji';
			font-size: var(---wallet-name-flow-font-size);
			font-weight: 700;
			white-space: nowrap;
		}

		:is(#stages, .attribute-group) {
			--stickyBreadcrumb-itemAnchor: --wallet-breadcrumb-group;
			--stickyBreadcrumb-parentAnchor: --wallet-breadcrumb-root;
		}

		.attribute {
			--stickyBreadcrumb-itemAnchor: --wallet-breadcrumb-attribute;
			--stickyBreadcrumb-parentAnchor: --wallet-breadcrumb-group;
			--stickyBreadcrumb-iconAnchor: --wallet-breadcrumb-attribute-icon;
			---wallet-breadcrumb-arrival-offset: var(
				---wallet-breadcrumb-attribute-arrival-offset
			);
			---wallet-breadcrumb-animation-range: var(
				---wallet-pie-attribute-animation-range
			);
			--stickyBreadcrumb-animationRange: var(
				---wallet-breadcrumb-animation-range
			);
			scroll-margin-block-start: var(
				---wallet-breadcrumb-attribute-arrival-offset
			);
		}

		[data-sticky-breadcrumb~='item']:not([data-sticky-breadcrumb~='root']) {
			display: flex;
			align-items: safe center;

			> :is(h2, h3, h4) {
				flex: 1 1 auto;
				min-inline-size: 0;
			}

			&::before {
				/* Sticky trail marker; must not inherit permalink hash styles. */
				content: '›';
				position: absolute;
				inset-block-start: 0;
				inset-inline-start: calc(
					-1 * var(--stickyBreadcrumb-gap)
				);
				display: flex;
				align-items: center;
				justify-content: center;
				inline-size: var(--stickyBreadcrumb-gap);
				min-inline-size: var(--stickyBreadcrumb-gap);
				block-size: var(--stickyBreadcrumb-item-blockSize);
				padding: 0;
				margin: 0;
				font-size: 1em;
				line-height: 1;
				text-box: trim-both cap alphabetic;
				overflow: clip;
				pointer-events: none;
				opacity: 0;
			}
		}

		.attribute-accordions {
			details > summary[data-sticky] {
				> h4[data-sticky-breadcrumb~='item']::before {
					content: '#';
					opacity: 0;
				}

				&:is(:hover, :focus-within)
					> h4[data-sticky-breadcrumb~='item']::before {
					opacity: 1;
				}
			}
		}

		article > header#top {
			&::before,
			&::after {
				content: '';
				z-index: 0;
				pointer-events: none;
				background-color: var(---wallet-breadcrumb-surface-background);
				backdrop-filter: blur(20px);

				@media (prefers-reduced-transparency: reduce) {
					backdrop-filter: none;
				}
			}

			&::before {
				position: fixed;
				inset: 0 0 auto;
				block-size: var(--navigation-mobile-blockSize);

				@media (min-width: 1025px) {
					content: none;
				}
			}

			&::after {
				anchor-name: --wallet-breadcrumb-surface;

				position: fixed;
				inset-block-start: calc(
					var(---wallet-page-block-offset)
					- var(---wallet-breadcrumb-surface-fade)
				);
				inset-inline-start: var(--sticky-insetInlineStart);
				inline-size: calc(
					100vi
					- var(--sticky-insetInlineStart)
					- var(---wallet-page-navigation-inline-size)
				);
				block-size: calc(
					2 * var(---wallet-sticky-content-inset)
					+ var(---wallet-breadcrumb-block-size)
					+ var(---wallet-breadcrumb-attribute-row-offset)
					+ 2 * var(---wallet-breadcrumb-surface-fade)
				);

				-webkit-mask-image: linear-gradient(
					to top,
					transparent,
					white var(---wallet-breadcrumb-surface-fade)
				);
				mask-image: linear-gradient(
					to top,
					transparent,
					white var(---wallet-breadcrumb-surface-fade)
				);
				opacity: 0;
				animation: WalletBreadcrumbRevealAnimation linear both;
				animation-timeline: --wallet-ratings-start-timeline;
				animation-range:
					var(---wallet-breadcrumb-animation-range);

				@media (max-width: 1024px) {
					inset-block-start: var(---wallet-page-block-offset);
					inset-inline-start: 0;
					inline-size: 100vi;
					block-size: calc(
						var(--navigation-mobile-blockSize)
							+ var(---wallet-breadcrumb-attribute-row-offset)
					);
				}
			}

			.wallet-name[data-sticky-breadcrumb] {
				anchor-name: none;
				z-index: var(---wallet-breadcrumb-layer-root);
				position: fixed;
				inset-block-start: var(---wallet-icon-sticky-block-start);
				inset-inline-start: calc(
					var(--sticky-insetInlineStart)
						+ var(---wallet-content-inline-start)
				);
				margin-inline-start: 0;
				font-size: var(---wallet-name-flow-font-size);

				animation: WalletNameAnimation linear both;
				animation-timeline: --wallet-page-scroll-timeline;
				animation-range: var(---wallet-header-animation-range);

				h1 {
					anchor-name: --wallet-breadcrumb-root;
					font-size: inherit;
					transform-origin: left center;
					animation: WalletRootContentAnimation linear both;
					animation-timeline: --wallet-page-scroll-timeline;
					animation-range: var(---wallet-header-animation-range);
				}
			}

			.wallet-icon {
				anchor-name: --wallet-breadcrumb-wallet-icon;
				flex: none;
				transform-origin: center;
				animation: WalletIconAnimation linear both;
				animation-timeline: --wallet-page-scroll-timeline;
				animation-range: var(---wallet-header-animation-range);
			}
		}

		:is(
			.stage-heading-position,
			.attribute-group-heading-position,
			.attribute-heading-position
		)[data-sticky-breadcrumb~='position']
			> [data-sticky-breadcrumb~='item']
			> :is(h2, h3) {
			transform-origin: left center;
			animation: BreadcrumbHeadingAnimation var(--stickyBreadcrumb-animationTimingFunction) both;
			animation-timeline: --sticky-breadcrumb-timeline;
			animation-range: var(---wallet-breadcrumb-animation-range);
		}

		:is(
			.stage-heading-position,
			.attribute-group-heading-position
		)[data-sticky-breadcrumb~='position'] {
			--stickyBreadcrumb-position-minBlockSize: 2.875rem;
			---wallet-breadcrumb-heading-scale: calc(
				var(---wallet-breadcrumb-group-font-size)
					/ var(---wallet-group-heading-font-size)
			);

			> [data-sticky-breadcrumb~='item'] {
				z-index: var(---wallet-breadcrumb-layer-group);
				position-visibility: always;

				h2 {
					font-size: var(---wallet-group-heading-font-size);
				}
			}
		}

		.attribute-group-stack > header .section-caption {
			animation: StickyBreadcrumbItemExitAnimation var(--stickyBreadcrumb-animationTimingFunction) both;
			animation-timeline: --sticky-breadcrumb-timeline;
			animation-range:
				var(---wallet-breadcrumb-animation-range);
		}

		.attribute-heading-position[data-sticky-breadcrumb~='position'] {
			/*
			 * Reserve end space matching where sticky badges are parked
			 * (surface end + content inset + pie clearance) plus a badge slot.
			 * `anchor-size` / edge-anchoring against the fixed badges is unreliable
			 * while they animate (`translate`, fixed containing block).
			 */
			--stickyBreadcrumb-position-minBlockSize: 1.875rem;
			--stickyBreadcrumb-item-insetInlineEnd: calc(
				var(---wallet-content-inline-start)
					+ var(---wallet-breadcrumb-surface-inline-end-clearance)
					+ var(---wallet-breadcrumb-companion-inline-end-clearance)
					+ var(---wallet-breadcrumb-companion-slot-inline-size)
					+ var(---wallet-breadcrumb-heading-translate)
					+ 0.5rem
			);
			--stickyBreadcrumb-item-inlineSize: auto;
			--stickyBreadcrumb-item-positionTryFallbacks:
				--sticky-breadcrumb-next-row,
				--sticky-breadcrumb-constrained-row;
			--stickyBreadcrumb-item-nextRowInsetInlineStart: calc(
				anchor(--wallet-breadcrumb-surface start)
				+ var(---wallet-content-inline-start)
			);
			--stickyBreadcrumb-item-nextRowInsetInlineEnd: var(
				---wallet-content-inline-start
			);
			--stickyBreadcrumb-item-rowGap: var(---wallet-breadcrumb-mobile-row-gap);
			---wallet-breadcrumb-heading-scale: calc(
				var(---wallet-breadcrumb-attribute-font-size)
					/ var(---wallet-attribute-heading-font-size)
			);
			/* The view timeline ends where the anchored attribute crumb lands.
			 * Compact layouts use the row below the group crumb; desktop's
			 * constrained lane reserves one additional group-height row. */
			@media (max-width: 1024px) {
				view-timeline-inset:
					calc(
						var(---wallet-icon-sticky-block-start)
							+ var(---wallet-breadcrumb-block-size)
					)
					0;
			}

			@media (min-width: 1025px) {
				view-timeline-inset:
					calc(
						var(---wallet-icon-sticky-block-start)
							+ 2 * var(---wallet-breadcrumb-block-size)
					)
					0;
			}

			@media (max-width: 480px) {
				--stickyBreadcrumb-item-blockOffset: var(
					---wallet-breadcrumb-attribute-row-offset
				);
				--stickyBreadcrumb-item-targetAnchor: auto;
				--stickyBreadcrumb-item-targetInsetBlockStart: calc(
					anchor(--wallet-breadcrumb-group top)
						+ var(---wallet-breadcrumb-attribute-row-offset)
				);
				--stickyBreadcrumb-item-insetInlineStart: calc(
					anchor(--wallet-breadcrumb-surface start)
						+ var(---wallet-content-inline-start)
						- var(---wallet-breadcrumb-gap)
				);
				--stickyBreadcrumb-item-insetInlineEnd: var(
					---wallet-content-inline-start
				);
				--stickyBreadcrumb-item-positionTryFallbacks: none;
			}

			> [data-sticky-breadcrumb~='item'] {
				z-index: var(---wallet-breadcrumb-layer-attribute);
				container-type: anchored;
				/* Respect the end reservation owned by the companion lane. */
				min-inline-size: 0;
				max-inline-size: none;
			}
		}

		.attribute-heading-position > [data-sticky-breadcrumb~='item']::after {
			content: '';
			position: absolute;
			inset: 0 auto 0 0;
			inline-size: 1px;
			anchor-name: var(--stickyBreadcrumb-iconAnchor);
			pointer-events: none;
		}

		:is(
			.stage-heading-position,
			.attribute-group-heading-position,
			.attribute-heading-position
		)[data-sticky-breadcrumb~='position']
			> [data-sticky-breadcrumb~='item']::before {
			animation:
				WalletBreadcrumbMarkerAnimation var(--stickyBreadcrumb-animationTimingFunction) forwards;
			animation-timeline: --sticky-breadcrumb-timeline;
			animation-range:
				var(---wallet-breadcrumb-animation-range);
			/* Preserve the underlying hover/focus opacity before the scroll effect. */
			animation-composition: add;
		}

		@container anchored(fallback: --sticky-breadcrumb-next-row) or anchored(fallback: --sticky-breadcrumb-constrained-row) {
			.attribute-heading-position[data-sticky-breadcrumb~='position']
				> [data-sticky-breadcrumb~='item']::before {
				content: '#';
				opacity: 0;
				animation: none;
			}
		}

		.attribute-accordions details {
			@media (max-width: 1024px) {
				> summary[data-sticky] {
					z-index: var(---wallet-breadcrumb-layer-detail);
				}

				> summary > h4[data-sticky-breadcrumb~='item'] {
					z-index: var(---wallet-breadcrumb-layer-detail);
					position: relative;
					position-anchor: auto;
					inset: auto;
					inline-size: auto;
					min-inline-size: 0;
					max-inline-size: none;
					min-block-size: 0;
					margin-inline-start: 0;
					position-try-fallbacks: none;
					font-size: 1rem;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					animation: none;

					&::before {
						inset-inline-start: -1rem;
						inline-size: 0.75rem;
						min-inline-size: 0.75rem;
					}
				}
			}
		}

		.attribute > details {
			.attribute-summary-companions-position {
				anchor-name: var(---wallet-companion-anchor);
				inline-size: min(
					100%,
					var(---wallet-breadcrumb-companion-slot-inline-size)
				);
				min-inline-size: min-content;
				max-inline-size: var(---wallet-breadcrumb-companion-slot-inline-size);
				min-block-size: 1.85rem;
				flex: 0 1 var(---wallet-breadcrumb-companion-slot-inline-size);
				margin-inline-start: auto;

				> .attribute-summary-companions {
					z-index: var(---wallet-breadcrumb-layer-attribute);
					inline-size: anchor-size(
						var(---wallet-companion-anchor) width
					);
					max-inline-size: none;
					justify-content: end;
					white-space: normal;
					position-visibility: always;
				}
			}

			&[open] .attribute-summary-companions {
				position: fixed;
				position-anchor: var(---wallet-companion-anchor);
				inset-block-start: calc(
					anchor(var(---wallet-companion-anchor) top)
					+ anchor-size(var(---wallet-companion-anchor) height) / 2
				);
				inset-inline-start: anchor(
					var(---wallet-companion-anchor) start
				);
				inset-inline-end: auto;
				translate: 0 -50%;
				animation:
					AttributeBreadcrumbCompanionsAnimation var(--stickyBreadcrumb-animationTimingFunction) both,
					AttributeBreadcrumbCompanionsOutAnimation linear both;
				animation-timeline:
					--sticky-breadcrumb-timeline,
					--sticky-breadcrumb-scope-timeline;
				animation-range:
					var(---wallet-breadcrumb-animation-range),
					var(---stickyBreadcrumb-exitAnimationRangeStart)
					var(---stickyBreadcrumb-exitAnimationRangeEnd);
				animation-composition: replace, add;
			}

			&:not([open]) {
				.attribute-heading-position > [data-sticky-breadcrumb~='item'] {
					position: static;
					position-anchor: auto;
					inset: auto;
					margin-inline-start: 0;
					animation: none;
				}

				.attribute-heading-position > [data-sticky-breadcrumb~='item']::before,
				.attribute-heading-position h3,
				.attribute-summary-companions,
				.attribute-icon > .breadcrumb-icon {
					animation: none;
				}

			}
		}

		@keyframes AttributeBreadcrumbCompanionsAnimation {
			to {
				inset-block-start: var(---wallet-breadcrumb-companion-block-start);
				inset-inline-start: auto;
				inset-inline-end: calc(
					anchor(--wallet-breadcrumb-surface end)
					+ var(---wallet-content-inline-start)
					+ var(---wallet-breadcrumb-companion-inline-end-clearance)
				);
				translate: 0 -50%;
			}
		}

		@keyframes AttributeBreadcrumbCompanionsOutAnimation {
			from {
				visibility: visible;
				translate: 0 0;
			}
			to {
				visibility: hidden;
				translate: 0 -100vb;
			}
		}

		:is(.attribute-group-icon, .attribute-icon) {
			transform-origin: top left;

			> .breadcrumb-icon {
				position-visibility: always;
				transform-origin: top left;
				animation:
					BreadcrumbSliceIconAnimation var(--stickyBreadcrumb-animationTimingFunction) both,
					BreadcrumbFlyOutAnimation linear both;
				animation-timeline:
					--sticky-breadcrumb-timeline,
					--sticky-breadcrumb-scope-timeline;
				animation-range:
					var(---wallet-breadcrumb-animation-range),
					var(---stickyBreadcrumb-exitAnimationRangeStart)
					var(---stickyBreadcrumb-exitAnimationRangeEnd);
				animation-composition: replace, add;
			}
		}

		.container .attribute-group-icon > .breadcrumb-icon,
		.container .attribute > details[open] .attribute-icon > .breadcrumb-icon {
			position: fixed;
			position-anchor: var(---wallet-icon-anchor);
			inset-block-start: anchor(var(---wallet-icon-anchor) top);
			inset-inline-start: anchor(var(---wallet-icon-anchor) start);
		}

		.attribute-group-icon {
			z-index: var(---wallet-breadcrumb-layer-group);
			---wallet-breadcrumb-icon-block-start: calc(
				var(--stickyBreadcrumb-item-insetBlockStart)
					+ (
						var(---wallet-breadcrumb-block-size)
							- var(---wallet-breadcrumb-heading-icon-size)
					) / 2
			);
			---wallet-breadcrumb-icon-inline-start: anchor(
				--wallet-breadcrumb-group start
			);
		}

		.attribute-icon {
			z-index: var(---wallet-breadcrumb-layer-attribute);
			---wallet-breadcrumb-icon-block-start: calc(
				var(--stickyBreadcrumb-item-insetBlockStart)
					+ (
						var(---wallet-breadcrumb-block-size)
							- var(---wallet-breadcrumb-heading-icon-size)
					) / 2
			);
			---wallet-breadcrumb-icon-inline-start: anchor(
				--wallet-breadcrumb-attribute-icon start
			);

			@media (max-width: 480px), (min-width: 1025px) and (max-width: 1399px) {
				---wallet-breadcrumb-icon-block-start: calc(
					var(--stickyBreadcrumb-item-insetBlockStart)
						+ var(---wallet-breadcrumb-attribute-row-offset)
						+ (
							var(---wallet-breadcrumb-block-size)
								- var(---wallet-breadcrumb-heading-icon-size)
						) / 2
				);
			}
		}

		@keyframes BreadcrumbSliceIconAnimation {
			to {
				position-anchor: auto;
				inset-block-start: var(---wallet-breadcrumb-icon-block-start);
				inset-inline-start: var(---wallet-breadcrumb-icon-inline-start);
				translate: none;
				scale: calc(
					var(---wallet-breadcrumb-heading-icon-size)
						/ 1em
				);
			}
		}

		@keyframes BreadcrumbFlyOutAnimation {
			from {
				visibility: visible;
				translate: 0 0;
			}
			to {
				visibility: hidden;
				translate: 0 -100vb;
			}
		}

		@keyframes BreadcrumbHeadingAnimation {
			from {
				translate: none;
				scale: 1;
			}
			to {
				translate: var(---wallet-breadcrumb-heading-translate);
				scale: var(---wallet-breadcrumb-heading-scale);
			}
		}

		@keyframes WalletNameAnimation {
			from {
				translate: 0 calc(
					var(---wallet-name-flow-block-start)
						- var(---wallet-icon-sticky-block-start)
				);
			}
			to { translate: none; }
		}

		@keyframes WalletRootContentAnimation {
			to {
				scale: var(---wallet-name-scale);
			}
		}

		@keyframes WalletIconAnimation {
			to {
				filter: none;
				scale: calc(
					var(---wallet-name-sticky-icon-size)
						/ (
							var(---wallet-name-flow-icon-size)
								* var(---wallet-name-scale)
						)
				);
			}
		}

		@keyframes WalletNameMobileAnimation {
			from {
				translate:
					calc(
						var(--sticky-insetInlineStart)
							+ var(---wallet-content-inline-start)
							- var(---wallet-name-target-inline-start)
					)
					calc(
						var(---wallet-name-flow-block-start)
							- var(---wallet-name-mobile-block-start)
					);
			}
			to { translate: none; }
		}

		@keyframes WalletRootContentMobileAnimation {
			from {
				translate: none;
				scale: 1;
			}
			to {
				translate: -50% 0;
				scale: var(---wallet-name-scale);
			}
		}

		@keyframes WalletRootContentWithoutSiteLogoMobileAnimation {
			from {
				translate: calc(
					var(---wallet-name-target-inline-start) - 50vi
				)
					0;
				scale: 1;
			}

			to {
				translate: -50% 0;
				scale: var(---wallet-name-scale);
			}
		}

		@keyframes WalletNameTextMobileAnimation {
			to { translate: calc(var(---wallet-name-icon-excess) / 2) 0; }
		}

		@keyframes LayoutLogoWalletBreadcrumbAnimation {
			from {
				translate: var(---wallet-site-logo-center-offset) 0;
			}

			to {
				translate: 0 0;
			}
		}

		@keyframes LayoutLogoWalletBreadcrumbOutAnimation {
			from {
				translate: var(---wallet-site-logo-center-offset) 0;
			}

			to {
				translate:
					var(---wallet-site-logo-center-offset)
					calc(-1rem - var(--navigation-logo-blockSize));
			}
		}

		@media (min-width: 1025px) and (max-width: 1399px) {
			:global(#layout:has(#wallet-page)) {
				---wallet-breadcrumb-attribute-row-offset: calc(
					var(---wallet-breadcrumb-block-size)
						+ var(---wallet-breadcrumb-mobile-row-gap)
				);
			}

			.container {
				/* Scroll padding already includes this wrapped attribute row. */
				---wallet-breadcrumb-companion-block-start: calc(
					var(---wallet-icon-sticky-block-start)
						+ var(---wallet-breadcrumb-attribute-row-offset)
						+ var(---wallet-breadcrumb-block-size) / 2
				);
			}

			.attribute-heading-position[data-sticky-breadcrumb~='position'] {
				--stickyBreadcrumb-item-blockOffset: var(
					---wallet-breadcrumb-attribute-row-offset
				);
				--stickyBreadcrumb-item-inlineSize: anchor-size(
					--sticky-breadcrumb-position width
				);
				--stickyBreadcrumb-item-insetInlineStart: calc(
					anchor(--wallet-breadcrumb-surface start)
						+ var(---wallet-content-inline-start)
						- var(---wallet-breadcrumb-gap)
				);
			}

			.page-navigation .pie-navigation-geometry {
				/* The pie has no layout stake in the constrained breadcrumb's second
				 * row, so advance both rotation ranges without moving hash targets. */
				---wallet-breadcrumb-animation-range:
					exit-crossing calc(
						1px
							- var(---wallet-breadcrumb-attribute-row-offset)
							- var(---wallet-breadcrumb-block-size)
					)
					exit-crossing calc(
						1px - var(---wallet-breadcrumb-attribute-row-offset)
					);
				---wallet-pie-attribute-animation-range: var(
					---wallet-breadcrumb-animation-range
				);
			}

		}

		@media (max-width: 480px), (min-width: 1025px) and (max-width: 1399px) {
			.attribute > details .attribute-summary-companions-position {
				flex: 0 0 100%;
				inline-size: 100%;
				max-inline-size: 100%;
			}

			.attribute-heading-position[data-sticky-breadcrumb~='position']
				> [data-sticky-breadcrumb~='item']::before {
				content: '#';
				animation: none;
				opacity: 0;
			}
		}

		@media (max-width: 1024px) {
			.container {
				---wallet-breadcrumb-companion-block-start: calc(
					var(---wallet-page-block-offset)
						+ var(--navigation-mobile-blockSize) / 2
				);
			}
			article > header#top .wallet-name[data-sticky-breadcrumb] {
				anchor-name: --wallet-name-collision;
				container-type: anchored;
				inset-block-start: var(---wallet-name-mobile-block-start);
				inset-inline-start: var(---wallet-name-target-inline-start);
				inline-size: max-content;
				min-inline-size: 0;
				position-try-fallbacks: --wallet-root-without-site-logo;
				animation-name: WalletNameMobileAnimation;
				animation-timing-function: linear;
				animation-range: var(---wallet-header-animation-range);

				@supports (inline-size: calc-size(max-content, size * 1)) {
					inline-size: calc-size(
						max-content,
						size * var(---wallet-name-scale) / 2
							+ var(---wallet-name-trailing-reserve)
					);
				}

				h1 {
					position: relative;
					inline-size: max-content;
					max-inline-size: none;
					padding-inline-start: 0;
					transform-origin: center;
					animation: WalletRootContentMobileAnimation linear both;

					&::before {
						content: '›';
						position: absolute;
						inset-block: 0;
						inset-inline-end: 100%;
						display: grid;
						place-items: center;
						inline-size: var(---wallet-breadcrumb-gap);
						font-size: 1em;
						line-height: 1;
						text-box: trim-both cap alphabetic;
						pointer-events: none;
						opacity: 0;
						animation: WalletBreadcrumbRevealAnimation linear both;
						animation-timeline: --wallet-page-scroll-timeline;
						animation-range: var(---wallet-header-animation-range);
					}

					> * {
						flex: none;
					}

					> span {
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
						animation: WalletNameTextMobileAnimation linear both;
					}
				}

				h1,
				h1 > span {
					animation-timeline: --wallet-page-scroll-timeline;
					animation-range: var(---wallet-header-animation-range);
				}
			}

			:global(#layout:has(#wallet-page) > #nav) {
				> :global(header) {
					z-index: calc(var(---wallet-breadcrumb-layer-detail) + 2);
				}

				&:not(:popover-open) {
					z-index: calc(var(---wallet-breadcrumb-layer-detail) + 2);
					--sticky-backgroundColor: transparent;
					background-color: transparent;
					backdrop-filter: none;

					> :global(header) {
						--sticky-backgroundColor: transparent;
						background-color: transparent;
						backdrop-filter: none;
					}
				}
			}

			:global(#layout:has(#wallet-page) > .logo-position-area) {
				z-index: calc(var(---wallet-breadcrumb-layer-detail) + 3);

				> :global(.logo) {
					---wallet-site-logo-inline-size: calc(
						2 * anchor-size(--wallet-name-collision inline)
							- 2 * var(---wallet-name-trailing-reserve)
							+ var(---wallet-breadcrumb-gap)
							+ var(--navigation-logo-inlineSize)
					);
					---wallet-site-logo-center-offset: calc(
						(100cqi - var(--navigation-logo-inlineSize)) / 2
					);

					position: fixed;
					inset-block-start: 1rem;
					inset-inline-start: 50vi;
					inline-size: max(
						var(--navigation-logo-inlineSize),
						var(---wallet-site-logo-inline-size)
					);
					translate: -50% 0;
					container-type: inline-size;
					pointer-events: none;

					> :global(img) {
						pointer-events: auto;
						animation: LayoutLogoWalletBreadcrumbAnimation linear both;
						animation-timeline: --wallet-page-scroll-timeline;
						animation-range: var(---wallet-header-animation-range);
					}
				}
			}

			/* The invisible logo box turns the anchored wallet-name width into a
			 * local size query. Beyond half the viewport plus the logo's half-row
			 * allowance, the child uses the vertical-only long-name route. */
			@container (inline-size > calc(50vi + 4rem)) {
				:global(
					#layout:has(#wallet-page)
						> .logo-position-area
						> .logo
						> img
				) {
					animation-name: LayoutLogoWalletBreadcrumbOutAnimation;
				}
			}

			@container anchored(fallback: --wallet-root-without-site-logo) {
				article > header#top .wallet-name[data-sticky-breadcrumb] h1 {
					animation-name: WalletRootContentWithoutSiteLogoMobileAnimation;

					&::before {
						content: none;
					}
				}
			}

			:is(
				.stage-heading-position[data-sticky-breadcrumb~='position'],
				.attribute-group-heading-position[data-sticky-breadcrumb~='position']
			) {
				/*
				 * The root occupies the layout-navigation row at this breakpoint, so
				 * the group begins a new breadcrumb chain on the content row. Ground
				 * that row in the shared content inset instead of centering it in the
				 * space after an unrelated root anchor.
				 */
				--stickyBreadcrumb-item-insetInlineStart: calc(
					anchor(--wallet-breadcrumb-surface start)
					+ var(---wallet-content-inline-start)
				);
				--stickyBreadcrumb-item-insetInlineEnd: var(---wallet-breadcrumb-inline-end);
				--stickyBreadcrumb-item-inlineSize: max-content;
				--stickyBreadcrumb-item-translate: none;
				--stickyBreadcrumb-item-justifySelf: start;
				--stickyBreadcrumb-item-positionTryFallbacks: --sticky-breadcrumb-constrained-row;
				--stickyBreadcrumb-item-blockOffset: var(--navigation-mobile-blockSize);
				--stickyBreadcrumb-item-nextRowInsetInlineStart: calc(
					anchor(--wallet-breadcrumb-surface start)
					+ var(---wallet-content-inline-start)
				);
				--stickyBreadcrumb-item-nextRowInsetInlineEnd: var(
					---wallet-breadcrumb-inline-end
				);
				--stickyBreadcrumb-item-nextRowJustifySelf: start;
				--stickyBreadcrumb-item-rowGap: var(---wallet-breadcrumb-mobile-row-gap);
				> [data-sticky-breadcrumb~='item'] {
					max-inline-size: calc(
						100vi
							- var(--sticky-insetInlineStart)
							- var(---wallet-content-inline-start)
							- var(---wallet-breadcrumb-inline-end)
					);
					inset-block-start: max(
						anchor(--sticky-breadcrumb-position top),
						var(---wallet-icon-sticky-block-start)
					);
					h2 {
						flex: 0 1 auto;
						min-inline-size: 0;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}

					&::before {
						content: '#';
						animation: none;
						opacity: 0;
					}

				}
			}

		}

		@media (max-width: 1399px) {
			.container {
				--stickyBreadcrumb-trackBlockEnd: calc(
					var(---wallet-sticky-stack-block-end)
						+ var(---wallet-breadcrumb-surface-fade)
				);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.wallet-name[data-sticky-breadcrumb] {
				position: static;
			}

			article > header#top .wallet-title-row::after {
				content: none;
			}

			.attribute-summary-companions {
				position: static;
				translate: none;
			}

			.container .wallet-name[data-sticky-breadcrumb],
			.container .wallet-name[data-sticky-breadcrumb] h1,
			.container .wallet-icon,
			article > header#top::after,
			[data-sticky-breadcrumb~='item']::before,
			.section-caption,
			.attribute-heading-position h3,
			.attribute-summary-companions,
			.breadcrumb-icon {
				animation: none;
			}

			:is(
				.stage-heading-position,
				.attribute-group-heading-position,
				.attribute-heading-position
			)[data-sticky-breadcrumb~='position']
				> [data-sticky-breadcrumb~='item']
				> :is(h2, h3),
			:is(
				#stages > header,
				.attribute-group > .attribute-group-stack > header
			)[data-sticky]::before {
				animation: none;
			}

			article > header#top::after,
			:is(
				#stages > header,
				.attribute-group > .attribute-group-stack > header
			)[data-sticky]::before {
				opacity: 1;
			}
		}
		}
	}

	.wallet-overview {
		font-size: 0.9rem;
	}

	#stages {
		view-timeline-name:
			--wallet-stage-timeline,
			--wallet-ratings-start-timeline,
			--sticky-breadcrumb-timeline,
			--sticky-breadcrumb-scope-timeline;
		view-timeline-axis: block;

		> header {
			padding-block: 1.2rem;
		}
	}

	:is(
		#stages > header,
		.attribute-group > .attribute-group-stack > header
	)[data-sticky]::before {
		inset-block: calc(-1 * var(---wallet-breadcrumb-surface-fade));
		inset-inline: 0;
		-webkit-mask-image: linear-gradient(
			to top,
			transparent,
			white var(---wallet-breadcrumb-surface-fade)
		);
		mask-image: linear-gradient(
			to top,
			transparent,
			white var(---wallet-breadcrumb-surface-fade)
		);
	}

	:is(
		.attribute-group > .attribute-group-stack[data-scroll-item] > header[data-scroll-item],
		.attribute > details > summary > header
	) {
		min-inline-size: 0;
	}

	.attribute > details > summary > header {
		align-items: start;
	}

	.page-navigation :global(.toc-icon)::before,
	:is(.attribute-group-icon, .attribute-icon) > .breadcrumb-icon {
		line-height: 1;
		filter: none;
		transition-property: color;
	}

	:is(.attribute-group-icon, .attribute-icon) {
		order: -1;
		flex: none;
	}

	:is(
		.attribute-group-summary-layout,
		.attribute > details > summary > header
	) a:is(:hover, :focus-visible, :interest-source) {
		color: var(--accent);
		text-decoration: none;
	}

	:is(.section-caption, .subsection-caption) {
		opacity: 0.8;
		color: var(--text-secondary);
		text-wrap: pretty;
	}

	.attribute-group {
		> .attribute-group-stack[data-scroll-item] {
			--icon-size: var(---wallet-breadcrumb-heading-icon-size);
			---wallet-group-sticky-block-end: var(
				---wallet-group-sticky-block-end-override,
				calc(
					var(---wallet-page-block-offset)
					+ var(---wallet-group-icon-size)
				)
			);
		}

		> .attribute-group-stack[data-scroll-item] > header[data-scroll-item] {
			padding-block: var(---wallet-group-header-padding-block);

			> .attribute-group-summary-layout {
				> .attribute-group-heading {
					flex: 1 1 16rem;
					column-gap: 0.5rem;
					row-gap: 0.25rem;
				}
			}

			h2 {
				font-size: var(---wallet-group-heading-font-size);
				font-weight: 700;
			}

		}

		.section-caption {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: var(---wallet-group-caption-white-space);

			:global(p) {
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}
	}

	.attribute {
		> details {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

			:is(.attribute-rating-details, .variant-caption, .impact) {
				color: var(--text-secondary);
			}

			.attribute-rating-details {
				background-color: color-mix(in srgb, var(--accent) 5%, var(--background-secondary));
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
				font-weight: 500;

				&:is(ul) {
					--list-markerGap: 1em;
				}

				&[data-rating='exempt'] {
					opacity: 0.7;
				}
			}

			.variant-caption {
				font-style: italic;
				font-size: 0.9rem;
				opacity: 0.7;
			}
		}
	}

	.attribute-icon {
		--icon-size: var(---wallet-breadcrumb-heading-icon-size);
	}

	.attribute-stage-badge {
		white-space: nowrap;
	}

	.attribute-heading h3 {
		font-size: var(---wallet-attribute-heading-font-size);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.attribute-rating-methodology {
		h5 {
			font-size: 1rem;
			font-weight: 600;
		}
	}

	.attribute-accordions {
		details {
			/*
			 * Accordion sticky containers nest at sticky-level 4 under
			 * #layout → #content → main → #wallet-page. Meet the complete
			 * breadcrumb stack rather than the group lane alone.
			 */
			--sticky-marginBlockStart: calc(
				var(---wallet-sticky-stack-block-end)
				- var(--sticky3-insetBlockStart, 0px)
			);

			overflow: visible;

			&:not([open]) {
				> .detail-breadcrumb-position {
					display: none;
				}

				> summary[data-sticky] {
					position: relative;
					inset: auto;
				}
			}

			summary {
				--sticky-backgroundColor: var(--background-secondary);

				h4 {
					max-inline-size: 60ch;
					overflow-wrap: break-word;
				}
			}

			section {
				overflow: hidden;

				p {
					overflow-wrap: break-word;
				}
			}
		}
	}

	/*
	 * Browsers without the complete anchor/scroll-state breadcrumb stack keep
	 * real sticky attribute headings. Use the same compact endpoint as the
	 * animated path: the existing icon remains, its slice and the subtitle
	 * recede, and H3 owns the next sticky layer. Stage Progress remains in its
	 * native flow presentation because these engines cannot detect the exact
	 * moment a sticky item becomes stuck.
	 */
	@supports not (
		((animation-timeline: scroll()) and (animation-range: 0% 100%)) and
		(container-type: scroll-state) and
		(position-anchor: --wallet-name) and
		(inset-inline-start: anchor(--wallet-name end))
	) {
		.container {
			---wallet-fallback-sticky-padding-block: 0.5rem;
			---wallet-fallback-group-sticky-block-size: max(
				calc(
					var(---wallet-breadcrumb-group-font-size)
						* var(---wallet-line-height)
						+ 2 * var(---wallet-fallback-sticky-padding-block)
				),
				calc(
					var(---wallet-breadcrumb-heading-icon-size)
						+ 2 * var(---wallet-fallback-sticky-padding-block)
				)
			);
			---wallet-fallback-attribute-sticky-block-size: max(
				calc(
					var(---wallet-breadcrumb-attribute-font-size)
						* var(---wallet-line-height)
						+ 2 * var(---wallet-fallback-sticky-padding-block)
				),
				calc(
					var(---wallet-breadcrumb-heading-icon-size)
						+ 2 * var(---wallet-fallback-sticky-padding-block)
				)
			);
		}

		:global(#layout:has(#wallet-page)) {
			/* Native sticky rows are the targets; prospective rows add no inset. */
			--scrollContainer-scrollPaddingBlockStart: var(---wallet-page-block-offset);
		}

		.attribute {
			scroll-margin-block-start: var(---wallet-fallback-group-sticky-block-size);
		}

		:is(
			#stages > header[data-sticky],
			.attribute-group > .attribute-group-stack[data-scroll-item] > header[data-sticky]
		) {
			z-index: calc(var(---wallet-breadcrumb-layer-detail) + 2);
			min-block-size: var(---wallet-fallback-group-sticky-block-size);
			padding-block: var(---wallet-fallback-sticky-padding-block);
			background-color: var(---wallet-breadcrumb-surface-background);
			justify-content: start;
		}

		.attribute-group > .attribute-group-stack[data-scroll-item] {
			---wallet-group-sticky-block-end-override: calc(
				var(---wallet-page-block-offset)
				+ var(---wallet-fallback-group-sticky-block-size)
			);

			> header[data-sticky] > .attribute-group-summary-layout {
				flex: 0 1 auto;
				inline-size: auto;

				> .attribute-group-heading {
					flex-basis: auto;
				}
			}
		}

		:is(
			[data-sticky-breadcrumb~='position'] > [data-sticky-breadcrumb~='item'],
			.attribute-accordions
				details
				> summary
				> h4[data-sticky-breadcrumb~='item']
		) {
			position: relative;
			display: flex;
			align-items: center;

			&::before {
				content: '#';
				position: absolute;
				inset-block-start: 50%;
				inset-inline-start: calc(
					-1.75em
					- var(---wallet-breadcrumb-heading-icon-size)
					- var(---wallet-breadcrumb-heading-icon-gap)
				);
				inline-size: 1em;
				block-size: 1lh;
				padding: 0;
				margin: 0;
				display: grid;
				place-items: center;
				translate: 0 -50%;
				opacity: 0;
				pointer-events: none;
			}

		}

		.attribute-accordions
			details
			> summary
			> h4[data-sticky-breadcrumb~='item']::before {
			inset-inline-start: -1rem;
		}

		.attribute-group .section-caption,
		.attribute > details .subsection-caption {
			visibility: hidden;
			flex-basis: 0;
			inline-size: 0;
			block-size: 0;
			opacity: 0;
		}

		.attribute > details > summary .attribute-heading {
			/* A zero-sized hidden caption must not leave its row gap behind. */
			gap: 0;
		}

		:is(.stage-heading-position, .attribute-group-heading-position) h2 {
			font-size: var(---wallet-breadcrumb-group-font-size);
		}

		.attribute > details > summary {
			z-index: calc(var(---wallet-breadcrumb-layer-detail) + 3);
			position: sticky;
			inset-block-start: var(---wallet-group-sticky-block-end);
			min-block-size: var(---wallet-fallback-attribute-sticky-block-size);
			padding-block: var(---wallet-fallback-sticky-padding-block);
			background-color: var(---wallet-breadcrumb-surface-background);
			.attribute-heading-position h3 {
				font-size: var(---wallet-breadcrumb-attribute-font-size);
			}
		}

		.attribute-accordions details {
			--sticky-marginBlockStart: calc(
				var(---wallet-group-sticky-block-end)
				+ var(---wallet-fallback-attribute-sticky-block-size)
				- var(--sticky3-insetBlockStart, 0px)
			);
		}

	}

	:global(#layout:has(#wallet-page):has(.wallet-variant-picker-position)) {
		@media (min-width: 1025px) {
			.container {
				---wallet-breadcrumb-companion-inline-end-clearance: calc(
					var(--navigation-mobile-controlSize)
						+ var(--navigation-mobile-gap)
				);
			}
		}

		@media (max-width: 1024px) {
			---wallet-name-trailing-reserve: calc(
				var(--navigation-mobile-trailingClearance)
					+ var(--navigation-mobile-controlSize)
					+ 2 * var(--navigation-mobile-gap)
			);
		}
	}

	@media (max-width: 1024px) {
		:global(#layout:has(#wallet-page) > #nav > header) {
			position: relative;
			justify-content: start;

			> :global(.navigation-leading-controls),
			> :global(.navigation-trailing-controls),
			> :global(.navigation-context-controls) {
				z-index: 1;
				flex: none;
				margin-inline: 0;
			}

			> :global(.navigation-trailing-controls) {
				margin-inline-start: var(--navigation-mobile-gap);
			}

			> :global(.navigation-context-controls) {
				margin-inline-start: auto;
			}
		}

		.attribute-accordions details > summary[data-sticky] {
			flex-wrap: nowrap;
		}

		/* Opening the TOC reuses the settled header keyframes instead of defining a
		 * second header layout. The long-name position fallback therefore remains
		 * the sole authority for whether the site logo exits upward. */
		:global(
			#layout:has(#wallet-page .page-navigation-panel:popover-open)
				> .logo-position-area
				> .logo
				> img
		),
		.container:has(.page-navigation-panel:popover-open)
			:is(.wallet-name, .wallet-name h1, .wallet-name h1 > span, .wallet-icon),
		.container:has(.page-navigation-panel:popover-open) .wallet-name h1::before {
			animation-timeline: auto;
			animation-duration: 1ms;
			animation-delay: -1ms;
		}

	}

	/* Permalink hashes yield to arrows only while a breadcrumb item is active. */
	:is(
		[data-sticky-breadcrumb~='position']
			> [data-sticky-breadcrumb~='item']:is(:hover, :focus-visible),
		.attribute-accordions
			details
			> summary:is(:hover, :focus-visible)
			> h4[data-sticky-breadcrumb~='item']
	)::before {
		opacity: 1;
	}

	/* The variant control keeps one scroll handoff at every breakpoint. */
	@supports (appearance: base-select) {
		.container {
			---wallet-variant-flow-radius: 0.5rem;
			---wallet-variant-sticky-size: var(--navigation-mobile-controlSize);
			---wallet-variant-sticky-block-start: calc(
				var(---wallet-icon-sticky-block-start)
					+ (
						var(---wallet-breadcrumb-block-size)
							- var(---wallet-variant-sticky-size)
					) / 2
			);
			---wallet-variant-sticky-inline-start: calc(
				anchor(--wallet-breadcrumb-surface end)
					+ var(---wallet-content-inline-start)
					+ var(---wallet-breadcrumb-companion-inline-end-clearance)
			);

			@media (min-width: 1025px) {
				---wallet-variant-sticky-inline-start: calc(
					100vi
						- var(---wallet-page-navigation-inline-size)
						- var(---wallet-content-inline-start)
						- var(---wallet-variant-sticky-size)
				);
			}
		}

		.wallet-variant-picker-anchor,
		:global(.wallet-variant-picker) {
			block-size: var(---wallet-variant-sticky-size);
		}

		.wallet-variant-picker-control {
			z-index: calc(var(---wallet-breadcrumb-layer-detail) + 3);
			position: fixed;
			inset-block-start: anchor(--wallet-variant-picker-position top);
			inset-inline-start: anchor(--wallet-variant-picker-position start);
			clip-path: inset(0 round var(---wallet-variant-flow-radius));
			animation:
				WalletVariantPickerAnimation linear both,
				WalletVariantPickerClipAnimation linear both;

			&::after {
				content: '';
				z-index: 1;
				position: absolute;
				inset: 0 auto auto 0;
				inline-size: var(---wallet-variant-sticky-size);
				block-size: var(---wallet-variant-sticky-size);
				border: 1px solid var(--icon-navigation-borderColor);
				border-radius: 50%;
				pointer-events: none;
				opacity: 0;
				animation: WalletVariantPickerCircleAnimation linear both;
				animation-timeline: --wallet-page-scroll-timeline;
				animation-range: var(---wallet-header-animation-range);
			}
		}

		:global(.wallet-variant-picker) {
			animation: WalletVariantPickerSelectAnimation linear both;
		}

		:global(.wallet-variant-picker selectedcontent > .select-label) {
			animation: WalletVariantPickerContentAnimation linear both;
		}

		:global(.wallet-variant-picker::picker-icon) {
			animation: WalletVariantPickerChevronAnimation linear both;
		}

		.wallet-variant-picker-control,
		:global(.wallet-variant-picker),
		:global(.wallet-variant-picker selectedcontent > .select-label),
		:global(.wallet-variant-picker::picker-icon) {
			animation-timeline: --wallet-page-scroll-timeline;
			animation-range: var(---wallet-header-animation-range);
		}

		:global(.wallet-variant-picker selectedcontent > span:first-child :is(svg, img)) {
			inline-size: var(--navigation-mobile-controlIconSize);
			block-size: var(--navigation-mobile-controlIconSize);
		}

		@media (max-width: 1024px) {
			.container {
				---wallet-variant-sticky-block-start: calc(
					(
						var(--navigation-mobile-blockSize)
							- var(---wallet-variant-sticky-size)
					) / 2
				);
				---wallet-variant-sticky-inline-start: calc(
					100vi
						- var(--navigation-mobile-trailingClearance)
						- var(--navigation-mobile-gap)
						- var(---wallet-variant-sticky-size)
				);
			}
		}

		@keyframes WalletVariantPickerAnimation {
			to {
				inset-block-start: var(---wallet-variant-sticky-block-start);
				inset-inline-start: var(---wallet-variant-sticky-inline-start);
			}
		}

		@keyframes WalletVariantPickerClipAnimation {
			from { clip-path: inset(0 round var(---wallet-variant-flow-radius)); }
			to {
				clip-path: circle(
					calc(var(---wallet-variant-sticky-size) / 2)
					at calc(var(---wallet-variant-sticky-size) / 2) 50%
				);
			}
		}

		@keyframes WalletVariantPickerCircleAnimation { to { opacity: 1; } }
		@keyframes WalletVariantPickerContentAnimation {
			to { opacity: 0; translate: -0.5rem 0; }
		}
		@keyframes WalletVariantPickerChevronAnimation {
			75%, to { opacity: 0; }
		}
		@keyframes WalletVariantPickerSelectAnimation {
			to { border-color: transparent; color: var(--icon-navigation-color); }
		}
	}

	@position-try --wallet-root-without-site-logo {
		inset-inline-start: 50vi;
	}

</style>
