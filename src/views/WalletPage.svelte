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
			const currentTarget = currentId
				? globalThis.document.getElementById(currentId)
				: null
			const currentGroup = currentTarget?.closest('.attribute-group') ??
				root.querySelector('.attribute-group')

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

	const groupTargetId = (groupId: string) => slugifyCamelCase(groupId)
	const groupTargetIds = $derived(new Set(
		Object.values(attributeTree).map(group => groupTargetId(group.id))
	))
	const attributeTargetId = (attributeId: string) => {
		const targetId = slugifyCamelCase(attributeId)
		return groupTargetIds.has(targetId) ? `${targetId}-attribute` : targetId
	}

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
						href: `#${groupTargetId(attrGroup.id)}`,
						children: attrGroup.attributes.flatMap(({ attribute }) => {
							const evalAttr = evalGroup[attribute.id]

							if (!evalAttr || evalAttr.evaluation.outcome.rating === Rating.EXEMPT) return []

							return [{
								id: `toc-${attrGroup.id}-${attribute.id}`,
								title: attribute.displayName,
								icon: attribute.icon,
								accentColor: ratingToColor(evalAttr.evaluation.outcome.rating),
								href: `#${attributeTargetId(attribute.id)}`,
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
						({ attribute: sourceAttribute }) => `#${attributeTargetId(sourceAttribute.id)}` === attribute.href
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

	/*
	 * Pie supplies immutable angles; CSS owns scroll progress and accumulation.
	 * The animation longhand properties are the only bridge because an ancestor cannot
	 * read a target descendant's computed custom property.
	 */
	const pieRotation = $derived.by(() => {
		const items = pieNavigationItems.flatMap(
			group => [group, ...(group.children ?? [])]
		)
		const steps = items.slice(1).map((item, index) => ({
			href: item.href,
			timeline: `--pie-section-${index + 1}`,
			delta: (
				(items[index]?.sliceStyle?.midAngle ?? 0)
					- (item.sliceStyle?.midAngle ?? 0)
			),
		}))

		return {
			initialMidAngle: items[0]?.sliceStyle?.midAngle ?? 0,
			animationNames: steps.map(() => 'WalletPieRotationStep').join(', '),
			timelineScopes: steps.map(step => step.timeline),
			animationTimelines: steps.map(step => step.timeline).join(', '),
			animationTimingFunctions: steps
				.map(step => `linear(0, ${step.delta})`)
				.join(', '),
			timelineByHref: new Map(steps.map(step => [step.href, step.timeline])),
		}
	})

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
		...pieRotation.timelineScopes,
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
				style:---initial-slice-mid-angle={`${pieRotation.initialMidAngle}deg`}
				style:--pie-padding={overallRatingPiePadding}
				style:--pie-maxR={overallRatingPieMaxRadius}
			>
				<div class="pie-navigation-placement" data-row-item="wrap-end">
					<div
						class="pie-navigation-geometry"
						style:---pie-rotation-animation-names={pieRotation.animationNames}
						style:---pie-rotation-animation-timelines={pieRotation.animationTimelines}
						style:---pie-rotation-animation-timing-functions={pieRotation.animationTimingFunctions}
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
										data-icon="wbicons emoji {item.icon}"
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
									data-icon="wbicons emoji {item.icon}"
									aria-hidden="true"
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
					data-sticky-breadcrumb="exit"
					data-sticky-row-backdrop="group"
					data-sticky="block block-start backdrop-before backdrop-stuck"
					data-row
					data-scroll-item="inline-detached"
				>
					<div
						class="stage-heading-position"
						data-sticky-breadcrumb="position"
					>
						{@render breadcrumbParentSlot()}
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
		{@const id = groupTargetId(attrGroup.id)}
		{@const href = `#${id}`}
		{@const score = calculateAttributeGroupScore(attrGroup, evalGroup)}
		{@const scoreLevel = score === null || score.score === null ? null : (score.score >= 0.7 ? 'high' : score.score >= 0.4 ? 'medium' : 'low')}
		{@const scoreColor = scoreToColor(score === null ? null : score.score)}

		<section
			class="attribute-group"
			aria-label={attrGroup.displayName}
			data-sticky-breadcrumb="scope"
			data-score={scoreLevel}
			style:--accent={scoreColor}
		>
			<hr class="attribute-group-target" {id} />

			<div
				class="attribute-group-stack"
				data-scroll-item="inline-detached padding-match-end"
				style:---pie-timeline={pieRotation.timelineByHref.get(href)}
			>
				<header
					data-sticky-breadcrumb="exit"
					data-sticky-row-backdrop="group"
					data-sticky="block block-start backdrop-before backdrop-stuck"
					data-row="start gap-4"
					data-scroll-item="inline-detached"
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
								{@render breadcrumbParentSlot()}
								<a
									data-link="camouflaged"
									data-sticky-breadcrumb="item"
									{href}
									interestfor={id}
								>
									<span class="attribute-group-icon">
										<span
											class="breadcrumb-icon"
											data-icon="wbicons emoji {attrGroup.icon}"
											aria-hidden="true"
										></span>
									</span>
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
				</header>

				<div data-column>
					<div class="attributes" data-column="gap-5">
						{#each attributes as { attribute, evalAttr }}
							{@render attributeSnippet({
								attrGroupId: attrGroup.id,
								attrGroupTitle: attrGroup.displayName,
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
	attrGroupTitle,
	attribute,
	evalAttr,
}: {
	attrGroupId: string
	attrGroupTitle: string
	attribute: Attribute<OutcomeMetadata>
	evalAttr: EvaluatedAttribute<OutcomeMetadata>
})}
	{@const relevantVariants = attrToRelevantVariants.get(attribute.id) ?? []}
	{@const id = attributeTargetId(attribute.id)}
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
		aria-label={attribute.displayName}
		style:--accent={ratingToColor(evalAttr.evaluation.outcome.rating)}
		data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
	>
		<hr class="attribute-target" {id} />

		<details
			open
			data-card="radius-8 padding-6 border-accent"
			data-column="gap-0"
			data-sticky-breadcrumb="scope"
			style:---pie-timeline={pieRotation.timelineByHref.get(href)}
		>
			<summary
				data-row
				data-sticky-breadcrumb="exit"
				data-sticky-row-backdrop="attribute"
				data-sticky="block block-start backdrop-before backdrop-stuck"
			>
				<header
					data-row-item="flexible"
					data-row="start gap-3"
				>
					<div
						class="attribute-heading"
						data-row-item="flexible basis-2"
						data-column="gap-2"
					>
						<div
							class="attribute-heading-position"
							data-sticky-breadcrumb="position"
						>
							{@render breadcrumbParentSlot(attrGroupTitle)}
							<div
								class="attribute-heading-row"
								data-row="start gap-2"
								data-sticky-breadcrumb="item"
							>
								<span class="attribute-icon">
									<span
										class="breadcrumb-icon"
										data-icon="wbicons emoji {attribute.icon}"
										aria-hidden="true"
									></span>
								</span>
								<a
									data-link="camouflaged"
									data-row-item="flexible"
									{href}
									interestfor={id}
									data-row="start gap-0"
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

								<div
									class="attribute-summary-companions"
									data-row="end gap-2 wrap"
									data-row-item="wrap-end"
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

					</div>
				</header>
			</summary>

			{#if attribute.question}
				<div class="subsection-caption">
					<Typography
						content={attribute.question}
						strings={{ WALLET_NAME: wallet.metadata.displayName }}
					/>
				</div>
			{/if}
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
					id={`${id}-why`}
					aria-labelledby={`${id}-why-heading`}
					open
					data-card="padding-5 secondary radius-4"
					data-column="gap-0"
					data-sticky-container
					data-sticky-breadcrumb="scope"
				>
					<summary
						data-sticky="block block-start backdrop-before backdrop-stuck"
						data-sticky-breadcrumb="exit"
						data-sticky-row-backdrop="detail"
					>
						<h4
							id={`${id}-why-heading`}
							data-sticky-breadcrumb="item"
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
					id={`${id}-methodology`}
					aria-labelledby={`${id}-methodology-heading`}
					open
					data-card="secondary padding-5 radius-4"
					data-column="gap-0"
					data-sticky-container
					data-sticky-breadcrumb="scope"
				>
					<summary
						data-sticky="block block-start backdrop-before backdrop-stuck"
						data-sticky-breadcrumb="exit"
						data-sticky-row-backdrop="detail"
					>
						<h4
							id={`${id}-methodology-heading`}
							data-sticky-breadcrumb="item"
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
						id={`${id}-improvement`}
						aria-labelledby={`${id}-improvement-heading`}
						open
						data-card="secondary padding-5 radius-4"
						data-column="gap-0"
						data-sticky-container
						data-sticky-breadcrumb="scope"
					>
						<summary
							data-sticky="block block-start backdrop-before backdrop-stuck"
							data-sticky-breadcrumb="exit"
							data-sticky-row-backdrop="detail"
						>
							<h4
								id={`${id}-improvement-heading`}
								data-sticky-breadcrumb="item"
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


{#snippet breadcrumbParentSlot(groupTitle?: string)}
	<span class="breadcrumb-parent-slot" aria-hidden="true">
		<span class="breadcrumb-parent-root">{wallet.metadata.displayName}</span>
		{#if groupTitle}
			<span class="breadcrumb-parent-group">{groupTitle}</span>
		{/if}
	</span>
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
		---wallet-breadcrumb-heading-flow-translate: 0px;
		---wallet-breadcrumb-trailing-control-inline-clearance: 0px;
		---wallet-attribute-heading-font-size: 1.17em;
		/* The effective view-timeline viewport is the sticky lane itself, so its
		 * complete entry phase is the one shared arrival interval. */
		---wallet-breadcrumb-animation-range: entry 0% entry 100%;
		---wallet-breadcrumb-crossing-offset: 0px;
		---wallet-group-icon-size: 2rem;
		---wallet-group-header-padding-block: 0px;
		---wallet-group-heading-font-size: var(---wallet-breadcrumb-group-font-size);
		---wallet-group-caption-white-space: nowrap;
		---wallet-group-row-block-start: calc(
			var(---wallet-icon-sticky-block-start)
				+ (
					var(---wallet-name-flow-font-size)
						* var(---wallet-line-height)
						- var(---wallet-breadcrumb-block-size)
				) / 2
		);
		---wallet-group-container-block-start: calc(
			var(---wallet-group-row-block-start)
				- var(---wallet-group-header-padding-block)
		);
		---wallet-attribute-row-block-start: calc(
			var(---wallet-group-row-block-start)
				+ var(---wallet-breadcrumb-attribute-row-offset)
		);
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
			---wallet-group-row-block-start: var(
				---wallet-icon-sticky-block-start
			);
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
			---wallet-mobile-pie-inline-translate: calc(
				(
					var(---wallet-mobile-pie-target-inline-start)
						- var(---wallet-mobile-pie-flow-inline-start)
				)
					* var(---wallet-inline-translate-direction)
			);
			---wallet-mobile-pie-inline-clearance: calc(
				var(---wallet-mobile-pie-size)
					+ 0.5rem
			);
			---wallet-breadcrumb-inline-end: calc(
				var(---wallet-mobile-pie-inline-clearance)
				+ var(--navigation-mobile-gap)
			);
			---wallet-breadcrumb-trailing-control-inline-clearance: var(
				---wallet-mobile-pie-inline-clearance
			);
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
					overflow-block: auto;
					position: static;
					inline-size: 100%;
				}
			}

			.page-navigation-panel > nav {
				position: relative;
				z-index: 0;
				min-block-size: max-content;
				padding: 0.75rem;

				&[data-sticky-container] {
					--sticky-paddingBlockStart: 0.75rem;
					--sticky-paddingBlockEnd: 0.75rem;
				}
			}

			@media (max-width: 1024px) {
				--navigation-menu-maskFade: 9rem;

				z-index: calc(var(---wallet-breadcrumb-layer-detail) + 4);
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

				.page-navigation-panel:not(:popover-open) {
					pointer-events: none;

					> nav {
						filter: blur(0.375rem);
						interactivity: inert;
						mask-size: 100% 0;
						opacity: 0;
						translate: 0 -0.75rem 1.25rem;
						pointer-events: none;
					}
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
		---wallet-inline-translate-direction: 1;
		/*
		 * A perspective establishes a containing block for fixed descendants.
		 * Breadcrumbs must remain fixed to this scroll container, not its moving
		 * contents.
		 */
		--scrollContainer-perspective: none;
		scroll-timeline-name: --wallet-page-scroll-timeline;
		scroll-timeline-axis: block;
		/* Proximity snapping is useful only until a fragment owns navigation. */
		scroll-snap-type: block proximity;

		&:has(#wallet-page :target) {
			scroll-snap-type: none;
		}
		/* Longest depth-2 attribute label plus its icon and row padding. */
		---wallet-page-navigation-inline-size-rem: 26;
		---wallet-page-navigation-inline-size: calc(
			var(---wallet-page-navigation-inline-size-rem)
			* 1rem
		);
		---wallet-page-block-offset: 0px;
		---wallet-breadcrumb-surface-background: light-dark(
			rgb(248 237 255 / 0.9),
			rgb(19 10 43 / 0.86)
		);
		---wallet-breadcrumb-surface-backdrop-filter: blur(20px);
		---wallet-breadcrumb-layer-root: 20;
		---wallet-breadcrumb-layer-group: 21;
		---wallet-breadcrumb-layer-attribute: 22;
		---wallet-breadcrumb-layer-detail: 23;
		---wallet-sticky-content-inset: 1rem;
		---wallet-name-sticky-icon-size: 32px;
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
		---wallet-root-row-block-size: calc(
			2 * var(---wallet-sticky-content-inset)
				+ var(---wallet-name-flow-font-size)
					* var(---wallet-line-height)
		);
		---wallet-breadcrumb-row-block-size: calc(
			2 * var(---wallet-sticky-content-inset)
				+ var(---wallet-breadcrumb-block-size)
		);
		---wallet-summary-companions-row-block-size: 0px;
		---wallet-breadcrumb-attribute-arrival-offset: 0px;
		---wallet-attribute-row-block-size: calc(
			var(---wallet-breadcrumb-row-block-size)
				+ var(---wallet-summary-companions-row-block-size)
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
		---wallet-sticky-stack-block-end: var(---wallet-root-row-block-size);
		--scrollContainer-scrollPaddingBlockStart: var(---wallet-sticky-stack-block-end);
		---anchor-button-size: 2.5rem;
		---anchor-control-inset: 0.75rem;
		---anchor-control-gap: 0.5rem;
		scroll-marker-group: after;
		scroll-behavior: auto;
		anchor-scope: --wallet-footer;
		timeline-scope: --wallet-footer-entry;

		@media (prefers-reduced-transparency: reduce) {
			---wallet-breadcrumb-surface-background: light-dark(#F8EDFF, #130a2b);
			---wallet-breadcrumb-surface-backdrop-filter: none;
		}

		&:dir(rtl) {
			---wallet-inline-translate-direction: -1;
		}

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
			---wallet-root-row-block-size: var(--navigation-mobile-blockSize);
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
			---wallet-sticky-stack-block-end: calc(
				var(---wallet-root-row-block-size)
					+ var(---wallet-breadcrumb-row-block-size)
			);

			@media (max-width: 480px) {
				---wallet-summary-companions-row-block-size: calc(
					2rem + var(---wallet-breadcrumb-mobile-row-gap)
				);
				---wallet-breadcrumb-attribute-row-offset: var(
					---wallet-breadcrumb-row-block-size
				);
				---wallet-sticky-stack-block-end: calc(
					var(---wallet-root-row-block-size)
						+ var(---wallet-breadcrumb-row-block-size)
						+ var(---wallet-attribute-row-block-size)
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

	.breadcrumb-parent-slot {
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

			--sticky-marginBlockStart: 0px;
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
					animation-range: var(---wallet-breadcrumb-animation-range);
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
				color: rgb(255 255 255 / 0.7);
				font-variant-emoji: text;
				filter: none;

				&::before {
					transition-property: color, filter;
				}
			}

			:global(
				.navigation-items
					a:is(:hover, :focus-visible, :interest-source, :target-current)
					> .pie-navigation-icon::before
			) {
				color: initial;
				font-variant-emoji: emoji;
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
			.container aside.page-navigation {
				display: contents;
				padding-block-start: 0;
				--sticky-marginBlockStart: 0px;
			}

			.container .page-navigation > .pie-navigation[data-sticky] {
				---pie-size-rem: var(---wallet-mobile-pie-flow-size-rem);
				---pie-size: var(---wallet-mobile-pie-flow-size);

				z-index: calc(var(---wallet-breadcrumb-layer-detail) + 1);
				anchor-name: --wallet-mobile-pie-flow;
				--sticky-insetBlockStart: var(--navigation-mobile-blockSize);
				flex: 0 0 var(---wallet-mobile-pie-flow-size);
				inset-inline: 0;
				inline-size: 100%;
				block-size: var(---wallet-mobile-pie-flow-size);
				display: flex;
				align-items: center;

				.pie-navigation-placement {
					margin-inline: auto;
					translate: none;
					overflow: clip;
					border-radius: 50%;
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
					.pie-navigation-placement {
						z-index: calc(var(---wallet-breadcrumb-layer-attribute) + 1);
						pointer-events: none;
						transform-origin: center top;
						animation: WalletMobilePiePlacement linear both;
						animation-timeline: --wallet-stage-timeline;
						animation-range: entry 60% entry 100%;
					}

					@media (prefers-reduced-motion: reduce) {
						.pie-navigation-placement {
							animation: none;
							translate: var(---wallet-mobile-pie-inline-translate) 0;
							scale: var(---wallet-mobile-pie-scale);
						}
					}
				}
			}

			.container
				.page-navigation:has(.page-navigation-panel:popover-open)
				> .pie-navigation[data-sticky] {
				.pie-navigation-placement {
					translate: var(---wallet-mobile-pie-inline-translate) 0;
					scale: var(---wallet-mobile-pie-scale);
					animation: none;
				}
			}
		}

		@keyframes WalletMobilePiePlacement {
			from {
				translate: none;
				scale: 1;
			}

			to {
				translate: var(---wallet-mobile-pie-inline-translate) 0;
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
				padding-inline-end: var(---wallet-breadcrumb-trailing-control-inline-clearance);
			}

			.attribute > details > summary {
				padding-inline-end: var(---wallet-breadcrumb-inline-end);
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
		:is(
			.attribute-group-heading-position,
			.attribute-heading-position
		)[data-sticky-breadcrumb~='position'] {
			/* Heading and pie consume the same source and arrival range. */
			view-timeline-name:
				--sticky-breadcrumb-timeline,
				var(---pie-timeline, none);
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
			from,
			99.99% {
				content: '#';
				opacity: 0;
			}

			to {
				content: '›';
				opacity: 1;
			}
		}

		@supports (
			(container-type: scroll-state) and
			(position-anchor: --wallet-name) and
			(inset-inline-start: anchor(--wallet-name end))
		) {
		.attribute > details > summary > header {
			anchor-scope: --sticky-breadcrumb-position;
			timeline-scope: --sticky-breadcrumb-timeline;
		}

		#stages > header {
			anchor-scope: --sticky-breadcrumb-position;
		}

		.attribute-group > .attribute-group-stack > header {
			anchor-scope: --sticky-breadcrumb-position;
		}

		.attribute-group-stack {
			timeline-scope: --sticky-breadcrumb-timeline;
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
				---wallet-group-heading-font-size: 1.8rem;
				---wallet-group-flow-row-block-size: calc(
					2 * var(---wallet-group-header-padding-block)
						+ var(---wallet-group-heading-font-size)
							* var(---wallet-line-height)
				);
				---wallet-group-sticky-content-block-translate: calc(
					(
						var(---wallet-breadcrumb-row-block-size)
							- var(---wallet-group-flow-row-block-size)
					) / 2
				);
				---wallet-group-icon-size: calc(
					var(---wallet-group-heading-font-size)
						* var(---wallet-line-height)
						+ 0.25rem
						+ 1rem * var(---wallet-line-height)
				);
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
				pointer-events: none;

				a {
					pointer-events: auto;
				}

			}

			[data-sticky-row-backdrop][data-sticky]::before {
				content: none;
			}

			[data-sticky-row-backdrop='detail'][data-sticky]::before {
				content: '';
			}

			[data-sticky-row-backdrop][data-sticky]::before {
				transition: none;
			}

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

		.attribute-group-target {
			scroll-margin-block-start: calc(
				-1 * var(---wallet-breadcrumb-crossing-offset)
			);

			@media (min-width: 1025px) {
				scroll-margin-block-start: calc(
					var(---wallet-group-container-block-start)
						- var(---wallet-sticky-stack-block-end)
						- var(---wallet-breadcrumb-crossing-offset)
				);
			}
		}

		.attribute-target {
			scroll-margin-block-start: calc(
				var(---wallet-breadcrumb-attribute-arrival-offset)
					- var(---wallet-breadcrumb-crossing-offset)
			);

			@media (min-width: 1025px) {
				scroll-margin-block-start: calc(
					var(---wallet-attribute-row-block-start)
						- var(---wallet-sticky-stack-block-end)
						- var(--card-padding, 0px)
						- var(--card-borderWidth, 0px)
						- var(---wallet-group-header-padding-block)
						- (
							var(---wallet-breadcrumb-attribute-font-size)
								* var(---wallet-line-height)
						)
						- var(---wallet-breadcrumb-crossing-offset)
				);
			}
		}

		.attribute > details:not([open]) {
			> summary[data-sticky] {
				position: relative;
				inset: auto;
			}

			.attribute-heading-position
				> [data-sticky-breadcrumb~='item']
				> a::before,
			.attribute-heading-position h3,
			.attribute-icon > .breadcrumb-icon {
				animation: none;
			}
		}

		[data-sticky-breadcrumb~='item']:not([data-sticky-breadcrumb~='root']) {
			display: flex;
			align-items: center;

			> :is(h2, h4),
			> a > h3 {
				flex: 1 1 auto;
				min-inline-size: 0;
			}

			> a {
				flex: 1 1 0;
				min-inline-size: 0;
			}

			&:has(> :is(.attribute-group-icon, .attribute-icon)) {
				column-gap: var(---wallet-breadcrumb-heading-icon-gap);
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
			&::after {
				content: '';
				z-index: calc(var(---wallet-breadcrumb-layer-root) - 1);
				pointer-events: none;
				background-color: var(---wallet-breadcrumb-surface-background);
				backdrop-filter: var(---wallet-breadcrumb-surface-backdrop-filter);
				anchor-name: --wallet-breadcrumb-surface;

				position: fixed;
				inset-block-start: var(---wallet-page-block-offset);
				inset-inline-start: var(--sticky-insetInlineStart);
				inline-size: calc(
					100vi
					- var(--sticky-insetInlineStart)
					- var(---wallet-page-navigation-inline-size)
				);
				block-size: var(---wallet-root-row-block-size);
				opacity: 0;
				animation: WalletBreadcrumbRevealAnimation linear both;
				animation-timeline: --wallet-page-scroll-timeline;
				animation-range: var(---wallet-header-animation-range);

				@media (max-width: 1024px) {
					inset-block-start: 0;
					inset-inline-start: 0;
					inline-size: 100vi;
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
			> :is(h2, h3),
		.attribute-heading-position[data-sticky-breadcrumb~='position']
			> [data-sticky-breadcrumb~='item']
			> a
			> h3 {
			transform-origin: left center;

			&:dir(rtl) {
				transform-origin: right center;
			}

			animation: BreadcrumbHeadingAnimation var(--stickyBreadcrumb-animationTimingFunction) both;
			animation-timeline: --sticky-breadcrumb-timeline;
			animation-range: var(---wallet-breadcrumb-animation-range);
		}

		:is(
			.stage-heading-position,
			.attribute-group-heading-position
		)[data-sticky-breadcrumb~='position'] {
			display: flex;
			align-items: center;
			--stickyBreadcrumb-position-minBlockSize: 2.875rem;
			---wallet-breadcrumb-heading-scale: calc(
				var(---wallet-breadcrumb-group-font-size)
					/ var(---wallet-group-heading-font-size)
			);

			> [data-sticky-breadcrumb~='item'] {
				z-index: var(---wallet-breadcrumb-layer-group);

				h2 {
					font-size: var(---wallet-group-heading-font-size);
				}
			}
		}

		.breadcrumb-parent-slot {
			interpolate-size: allow-keywords;
			display: flex;
			align-items: center;
			flex: none;
			inline-size: 0;
			overflow: clip;
			visibility: hidden;
			white-space: nowrap;
			animation: BreadcrumbParentSlotAnimation
				var(--stickyBreadcrumb-animationTimingFunction)
				both;
			animation-timeline: --sticky-breadcrumb-timeline;
			animation-range: var(---wallet-breadcrumb-animation-range);

			> span {
				display: inline-flex;
				align-items: center;
				flex: none;
				margin-inline-end: var(---wallet-breadcrumb-gap);
				font-family: var(--fontFamily-spaceGrotesk), 'Noto Color Emoji';
				font-weight: 700;

				&::before {
					content: '';
					flex: none;
					inline-size: var(---wallet-breadcrumb-heading-icon-size);
					block-size: var(---wallet-breadcrumb-heading-icon-size);
					margin-inline-end: var(---wallet-breadcrumb-heading-icon-gap);
				}
			}

			.breadcrumb-parent-root {
				font-size: var(---wallet-breadcrumb-root-font-size);

				&::before {
					inline-size: 2rem;
					block-size: 2rem;
				}
			}

			.breadcrumb-parent-group {
				font-size: var(---wallet-breadcrumb-group-font-size);
			}
		}

		@keyframes BreadcrumbParentSlotAnimation {
			to {
				inline-size: max-content;
			}
		}

		@keyframes WalletBreadcrumbGroupRowAlignment {
			to {
				translate: 0 var(---wallet-group-sticky-content-block-translate);
			}
		}

		:is(.section-caption, .subsection-caption) {
			animation: BreadcrumbFlowContentAnimation var(--stickyBreadcrumb-animationTimingFunction) both;
			animation-timeline: --sticky-breadcrumb-timeline;
			animation-range:
				var(---wallet-breadcrumb-animation-range);
		}

		@keyframes BreadcrumbFlowContentAnimation {
			from {
				opacity: 0.8;
				translate: none;
			}

			to {
				visibility: hidden;
				opacity: 0;
				translate: 0 -1lh;
			}
		}

		.attribute-heading-position[data-sticky-breadcrumb~='position'] {
			display: flex;
			align-items: center;
			--stickyBreadcrumb-position-minBlockSize: 1.875rem;
			---wallet-breadcrumb-heading-scale: calc(
				var(---wallet-breadcrumb-attribute-font-size)
					/ var(---wallet-attribute-heading-font-size)
			);

			> [data-sticky-breadcrumb~='item'] {
				z-index: var(---wallet-breadcrumb-layer-attribute);
				inline-size: 100%;
				min-inline-size: 0;
				max-inline-size: none;
			}
		}

		.attribute > details[open] > summary[data-sticky] {
			--sticky-insetBlockStart: calc(
				var(---wallet-sticky-stack-block-end)
					- var(---wallet-attribute-row-block-size)
			);

			z-index: var(---wallet-breadcrumb-layer-attribute);
			inline-size: 100%;
		}

		:is(
			.stage-heading-position,
			.attribute-group-heading-position,
			.attribute-heading-position
		)[data-sticky-breadcrumb~='position']
			> [data-sticky-breadcrumb~='item']::before,
		.attribute-heading-position[data-sticky-breadcrumb~='position']
			> [data-sticky-breadcrumb~='item']
			> a::before {
			animation:
				var(
					---wallet-breadcrumb-marker-animation,
					WalletBreadcrumbMarkerAnimation
				)
				var(--stickyBreadcrumb-animationTimingFunction)
				forwards;
			animation-timeline: --sticky-breadcrumb-timeline;
			animation-range:
				var(---wallet-breadcrumb-animation-range);
			/* Preserve the underlying hover/focus opacity before the scroll effect. */
			animation-composition: add;
		}

		.attribute-heading-position[data-sticky-breadcrumb~='position']
			> [data-sticky-breadcrumb~='item']:has(> a)::before {
			content: none;
			animation: none;
			opacity: 0;
		}

		/* A row-leading crumb owns the row surface and keeps its permalink marker.
		 * Trailing crumbs own only the adjacent-level separator. */
		@media (max-width: 1024px) {
			:is(.stage-heading-position, .attribute-group-heading-position) {
				---wallet-breadcrumb-marker-animation: none;

				> .breadcrumb-parent-slot {
					display: none;
				}
			}

			[data-sticky-row-backdrop='group'][data-sticky]::before {
				content: '';
			}

			:is(
				.stage-heading-position,
				.attribute-group-heading-position
			) > [data-sticky-breadcrumb~='item'] {
				animation: WalletBreadcrumbGroupRowAlignment linear both;
				animation-timeline: --sticky-breadcrumb-timeline;
				animation-range: var(---wallet-breadcrumb-animation-range);
			}
		}

		@media (max-width: 480px), (min-width: 1025px) and (max-width: 1599px) {
			.attribute-heading-position {
				---wallet-breadcrumb-marker-animation: none;

				> .breadcrumb-parent-slot {
					display: none;
				}
			}

			[data-sticky-row-backdrop='attribute'][data-sticky]::before {
				content: '';
			}
		}

		.attribute-accordions details {
			@media (max-width: 1024px) {
				> summary > h4[data-sticky-breadcrumb~='item'] {
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

		:is(.attribute-group-icon, .attribute-icon) {
			--icon-size: var(---wallet-breadcrumb-heading-icon-size);

			position: relative;
			inline-size: var(---wallet-breadcrumb-heading-icon-size);
			block-size: var(---wallet-breadcrumb-heading-icon-size);
			transform-origin: center;

			> .breadcrumb-icon {
				transform-origin: center;
				animation: BreadcrumbSliceIconAnimation var(--stickyBreadcrumb-animationTimingFunction) both;
				animation-timeline: --sticky-breadcrumb-timeline;
				animation-range: var(---wallet-breadcrumb-animation-range);
			}
		}

		.attribute-group-icon {
			z-index: var(---wallet-breadcrumb-layer-group);

			> .breadcrumb-icon {
				inset: 50% auto auto 0;
				translate: 0 -50%;
				inline-size: 1em;
				block-size: 1em;
				font-size: var(---wallet-group-icon-size);
				transform-origin: left center;

				&:dir(rtl) {
					inset-inline: auto 0;
					transform-origin: right center;
				}
			}
		}

		.attribute-icon {
			z-index: var(---wallet-breadcrumb-layer-attribute);
		}

		@keyframes BreadcrumbSliceIconAnimation {
			to {
				scale: var(---wallet-breadcrumb-icon-scale, 1);
			}
		}

		@keyframes BreadcrumbHeadingAnimation {
			from {
				translate: calc(
					var(---wallet-breadcrumb-heading-flow-translate)
						* var(---wallet-inline-translate-direction)
				);
				scale: 1;
			}
			to {
				translate: none;
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
						(
							var(--sticky-insetInlineStart)
								+ var(---wallet-content-inline-start)
								- var(---wallet-name-target-inline-start)
						)
							* var(---wallet-inline-translate-direction)
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
				translate: calc(
					-50% * var(---wallet-inline-translate-direction)
				)
					0;
				scale: var(---wallet-name-scale);
			}
		}

		@keyframes WalletRootContentWithoutSiteLogoMobileAnimation {
			from {
				translate: calc(
					(
						var(---wallet-name-target-inline-start) - 50vi
					)
						* var(---wallet-inline-translate-direction)
				)
					0;
				scale: 1;
			}

			to {
				translate: calc(
					-50% * var(---wallet-inline-translate-direction)
				)
					0;
				scale: var(---wallet-name-scale);
			}
		}

		@keyframes WalletNameTextMobileAnimation {
			to {
				translate: calc(
					var(---wallet-name-icon-excess) / 2
						* var(---wallet-inline-translate-direction)
				)
					0;
			}
		}

		@keyframes LayoutLogoWalletBreadcrumbAnimation {
			from {
				translate: calc(
					var(---wallet-site-logo-center-offset)
						* var(---wallet-inline-translate-direction)
				)
					0;
			}

			to {
				translate: 0 0;
			}
		}

		@keyframes LayoutLogoWalletBreadcrumbOutAnimation {
			from {
				translate: calc(
					var(---wallet-site-logo-center-offset)
						* var(---wallet-inline-translate-direction)
				)
					0;
			}

			to {
				translate:
					calc(
						var(---wallet-site-logo-center-offset)
							* var(---wallet-inline-translate-direction)
					)
					calc(-1rem - var(--navigation-logo-blockSize));
			}
		}

		@media (min-width: 1025px) and (max-width: 1279px) {
			/* The 20rem pie rail leaves the content lane too narrow for stable
			 * root/H2/H3 adjacency. Each level owns its own breadcrumb row in this
			 * tight desktop interval. */
			:global(#layout:has(#wallet-page)) {
				---wallet-group-row-block-start: var(---wallet-root-row-block-size);
				---wallet-breadcrumb-attribute-row-offset: var(
					---wallet-breadcrumb-row-block-size
				);
				---wallet-sticky-stack-block-end: calc(
					var(---wallet-root-row-block-size)
						+ var(---wallet-breadcrumb-row-block-size)
						+ var(---wallet-attribute-row-block-size)
				);
			}

			:is(
				#stages > header[data-scroll-item][data-sticky],
				.attribute-group
					> .attribute-group-stack[data-scroll-item]
					> header[data-scroll-item][data-sticky]
			) {
				--sticky-insetBlockStart: var(---wallet-root-row-block-size);
			}

			:is(
				.stage-heading-position,
				.attribute-group-heading-position
			) {
				---wallet-breadcrumb-marker-animation: none;

				> .breadcrumb-parent-slot {
					display: none;
				}
			}

			[data-sticky-row-backdrop='group'][data-sticky]::before {
				content: '';
			}
		}

		@media (min-width: 1280px) and (max-width: 1599px) {
			/* Above the tight desktop band H2 remains adjacent to H1, but the
			 * H3-plus-metadata row still needs its own sticky lane. */
			:global(#layout:has(#wallet-page)) {
				---wallet-breadcrumb-attribute-row-offset: calc(
					(
						var(---wallet-root-row-block-size)
							+ var(---wallet-breadcrumb-row-block-size)
					) / 2
				);
				---wallet-sticky-stack-block-end: calc(
					var(---wallet-root-row-block-size)
						+ var(---wallet-breadcrumb-row-block-size)
				);
			}
		}

		@media (min-width: 1025px) and (max-width: 1599px) {
			.attribute-heading-position[data-sticky-breadcrumb~='position'] {
				---stickyBreadcrumb-viewTimelineBlockStart: calc(
					var(---wallet-attribute-row-block-start)
						- var(---wallet-group-header-padding-block)
				);
				--stickyBreadcrumb-item-blockOffset: var(
					---wallet-breadcrumb-attribute-row-offset
				);
			}

		}

		@media (max-width: 1024px) {
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
					inline-size: max-content;
					max-inline-size: none;
					padding-inline-start: 0;
					transform-origin: center;
					animation: WalletRootContentMobileAnimation linear both;

					&::before {
						content: '# ';
						display: inline-flex;
						justify-content: end;
						inline-size: 0;
						padding-inline-end: 0.66rem;
						margin-inline-start: -0.66rem;
						line-height: 1;
						opacity: 0;
						animation: WalletBreadcrumbMarkerAnimation linear forwards;
						animation-timeline: --wallet-page-scroll-timeline;
						animation-range: var(---wallet-header-animation-range);
						animation-composition: add;
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

				&:is(:hover, :focus-visible) h1::before {
					opacity: 1;
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
					---wallet-site-logo-visual-inline-size: max(
						var(--navigation-logo-inlineSize),
						calc(
							2 * anchor-size(--wallet-name-collision inline)
								- 2 * var(---wallet-name-trailing-reserve)
								+ var(---wallet-breadcrumb-gap)
								+ var(--navigation-logo-inlineSize)
						)
					);
					---wallet-site-logo-query-block-size: max(
						var(--navigation-logo-inlineSize),
						calc(
							50vi
								+ anchor-size(--wallet-name-collision inline)
								- (
									100vi
										- var(---wallet-name-target-inline-start)
								)
						)
					);
					---wallet-site-logo-center-offset: calc(
						(100cqi - var(--navigation-logo-inlineSize)) / 2
					);

					position: fixed;
					inset-block-start: 1rem;
					/* Viewport center is physical and direction-invariant. */
					inset-inline: auto;
					left: 50vi;
					inline-size: var(---wallet-site-logo-visual-inline-size);
					block-size: var(---wallet-site-logo-query-block-size);
					translate: -50% 0;
					container-type: size;
					pointer-events: none;

					> :global(img) {
						pointer-events: auto;
						animation: LayoutLogoWalletBreadcrumbAnimation linear both;
						animation-timeline: --wallet-page-scroll-timeline;
						animation-range: var(---wallet-header-animation-range);
					}
				}
			}

			/* The invisible logo box encodes the anchored wallet-name overflow as a
			 * local size query, so the logo and wallet name share one collision state. */
			@container (block-size > 50vi) {
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
						display: none;
						animation: none;
					}
				}
			}

			:is(
				.stage-heading-position[data-sticky-breadcrumb~='position'],
				.attribute-group-heading-position[data-sticky-breadcrumb~='position']
			) {
				> [data-sticky-breadcrumb~='item'] {
					max-inline-size: calc(
						100vi
							- var(--sticky-insetInlineStart)
							- var(---wallet-content-inline-start)
							- var(---wallet-breadcrumb-inline-end)
					);
					h2 {
						flex: 0 1 auto;
						min-inline-size: 0;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}
				}
			}

		}

		@media (max-width: 1599px) {
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

			.container .wallet-name[data-sticky-breadcrumb],
			.container .wallet-name[data-sticky-breadcrumb] h1,
			.container .wallet-icon,
			[data-sticky-breadcrumb~='item']::before,
			[data-sticky-breadcrumb~='item'] > a::before,
			.section-caption,
			.subsection-caption,
			.attribute-heading-position h3,
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
			.attribute-heading-position[data-sticky-breadcrumb~='position']
				> [data-sticky-breadcrumb~='item']
				> a
				> h3,
			:is(
				#stages > header,
				.attribute-group > .attribute-group-stack > header
			)[data-sticky]::before {
				animation: none;
			}

			:is(
				#stages > header,
				.attribute-group > .attribute-group-stack > header
			)[data-sticky]::before {
				opacity: 1;
			}

			article > header#top::after {
				display: none;
			}
		}
		}
	}

	.wallet-overview {
		font-size: 0.9rem;
	}

	#stages {
		/* Stage has no slice glyph, so its ordinary H2 transition has no icon gap. */
		---wallet-breadcrumb-heading-flow-translate: 0px;
		view-timeline-name:
			--wallet-stage-timeline,
			--sticky-breadcrumb-timeline,
			--sticky-breadcrumb-scope-timeline;
		view-timeline-axis: block;

		> header {
			padding-block: var(---wallet-group-header-padding-block);
		}
	}

	:is(
		#stages > header,
		.attribute-group > .attribute-group-stack > header
	)[data-sticky-row-backdrop='group'] {
		--sticky-backgroundColor: var(---wallet-breadcrumb-surface-background);
		--sticky-backdropFilter: var(---wallet-breadcrumb-surface-backdrop-filter);

		&::before {
			inset-block: 0 auto;
			inset-inline: 0;
			block-size: var(---wallet-breadcrumb-row-block-size);
		}
	}

	[data-sticky-row-backdrop='attribute'] {
		--sticky-backgroundColor: var(---wallet-breadcrumb-surface-background);
		--sticky-backdropFilter: var(---wallet-breadcrumb-surface-backdrop-filter);

		&::before {
			inset-block: 0 auto;
			block-size: var(---wallet-attribute-row-block-size);
		}
	}

	[data-sticky-row-backdrop='detail'] {
		--sticky-backgroundColor: var(---wallet-breadcrumb-surface-background);
		--sticky-backdropFilter: var(---wallet-breadcrumb-surface-backdrop-filter);
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
		color: var(--accent, currentColor);
		font-variant-emoji: text;
		text-shadow: none;
		transition-property: color, filter, text-shadow;
	}

	.page-navigation
		:global(
			.navigation-items
				a:is(:hover, :focus-visible, :interest-source, :target-current)
				.toc-icon::before
		),
	:is(
		.attribute-group-summary-layout,
		.attribute > details > summary > header
	):has(a:is(:hover, :focus-visible, :interest-source))
		.breadcrumb-icon {
		color: initial;
		font-variant-emoji: emoji;
		text-shadow: none;
		filter: none;
	}

	:is(.attribute-group-icon, .attribute-icon) {
		order: -1;
		flex: none;
		pointer-events: none;
	}

	:is(.attribute-group-target, .attribute-target) {
		border: 0;
		margin: 0;
		padding: 0;
		block-size: 0;
	}

	:is(
		.attribute-group-summary-layout,
		.attribute > details > summary > header
	) a:is(:hover, :focus-visible, :interest-source) {
		text-decoration: none;
	}

	.attribute-group:has(> .attribute-group-target:target)
		.attribute-group-summary-layout
		.breadcrumb-icon,
	.attribute-target:target
		+ details
		> summary
		> header
		.breadcrumb-icon {
		color: initial;
		font-variant-emoji: emoji;
		text-shadow: none;
		filter: none;
	}

	@supports selector(:interest-target) {
		.attribute-group:has(> .attribute-group-target:interest-target)
			.attribute-group-summary-layout
			.breadcrumb-icon,
		.attribute-target:interest-target
			+ details
			> summary
			> header
			.breadcrumb-icon {
			color: initial;
			font-variant-emoji: emoji;
			text-shadow: none;
			filter: none;
		}

		.attribute-group:has(> .attribute-group-target:interest-target)
			.attribute-group-heading-position
			> a,
		.attribute-target:interest-target + details .attribute-heading-row > a {
			text-decoration: none;
		}
	}

	:is(.section-caption, .subsection-caption) {
		opacity: 0.8;
		color: var(--text-secondary);
		text-wrap: pretty;
	}

	.attribute-group {
		> .attribute-group-stack[data-scroll-item] {
			--icon-size: var(---wallet-group-icon-size);
			---wallet-breadcrumb-heading-flow-translate: calc(
				var(---wallet-group-icon-size)
					- var(---wallet-breadcrumb-heading-icon-size)
			);
			---wallet-breadcrumb-icon-scale: calc(
				var(---wallet-breadcrumb-heading-icon-size)
					/ var(---wallet-group-icon-size)
			);
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
		---wallet-breadcrumb-heading-flow-translate: 0px;
		---wallet-breadcrumb-icon-scale: 1;

		.attribute-summary-companions {
			flex: 0 1 auto;
			inline-size: max-content;
			max-inline-size: min(50vi, 100%);
			min-inline-size: 0;
			margin-inline-start: auto;
			justify-content: end;

			> * {
				flex: none;
				white-space: nowrap;
			}
		}

		@media (max-width: 480px) {
			> details > summary {
				padding-block: var(---wallet-sticky-content-inset);
			}

			.attribute-heading-row {
				flex-wrap: wrap;
				row-gap: var(---wallet-breadcrumb-mobile-row-gap);

				> a {
					align-items: center;
					min-block-size: var(---wallet-breadcrumb-block-size);
				}
			}

			.attribute-summary-companions {
				flex-basis: 100%;
				inline-size: 100%;
				align-items: center;
				min-block-size: 2rem;
				max-inline-size: 100%;
				padding-inline-start: calc(
					var(---wallet-breadcrumb-heading-icon-size)
						+ var(---wallet-breadcrumb-heading-icon-gap)
				);
			}
		}

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

	.attribute-content :global(code) {
		overflow-wrap: anywhere;
	}

	.attribute-icon {
		--icon-size: var(---wallet-breadcrumb-heading-icon-size);
	}

	.attribute-stage-badge {
		margin-inline-start: 0.5em;
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
			overflow: visible;
			scroll-margin-block-start: var(---wallet-sticky-stack-block-end);

			> summary[data-sticky] {
				/* H4 consumes the complete visible stack directly; nested sticky
				 * depth must not reconstruct or add to this resolved endpoint. */
				--sticky-insetBlockStart: var(---wallet-sticky-stack-block-end);
			}

			&:not([open]) {
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
	 * recede, and H3 owns the next sticky layer. H2 headers share one native
	 * sticky treatment because these engines cannot detect the exact moment a
	 * sticky item becomes stuck.
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
			---wallet-fallback-attribute-heading-block-size: max(
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
			---wallet-fallback-attribute-sticky-block-size: calc(
				var(---wallet-fallback-attribute-heading-block-size)
					+ var(---wallet-summary-companions-row-block-size)
			);
		}

		:global(#layout:has(#wallet-page)) {
			/* Native sticky rows are the targets; prospective rows add no inset. */
			--scrollContainer-scrollPaddingBlockStart: var(---wallet-page-block-offset);
		}

		.attribute-target {
			scroll-margin-block-start: calc(
				var(---wallet-fallback-group-sticky-block-size)
					+ var(---wallet-fallback-attribute-heading-block-size)
			);
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

		.attribute > details[open] > summary {
			/* The active group must paint over an outgoing attribute as native
			 * sticky containment pushes that attribute through the group lane. */
			--sticky-insetBlockStart: var(---wallet-group-sticky-block-end);
			z-index: calc(var(---wallet-breadcrumb-layer-detail) + 1);
			position: sticky;
			min-block-size: var(---wallet-fallback-attribute-sticky-block-size);
			padding-block: var(---wallet-fallback-sticky-padding-block);
			background-color: var(---wallet-breadcrumb-surface-background);
			.attribute-heading-position h3 {
				font-size: var(---wallet-breadcrumb-attribute-font-size);
			}
		}

		.attribute-accordions details > summary[data-sticky] {
			--sticky-insetBlockStart: calc(
				var(---wallet-group-sticky-block-end)
					+ var(---wallet-fallback-attribute-sticky-block-size)
			);
		}

	}

	:global(#layout:has(#wallet-page):has(.wallet-variant-picker-position)) {
		@media (min-width: 1025px) {
			.container {
				---wallet-breadcrumb-trailing-control-inline-clearance: calc(
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
	[data-sticky-breadcrumb~='position']
		> [data-sticky-breadcrumb~='item']:is(:hover, :focus-visible)::before,
	.attribute-heading-position
		> [data-sticky-breadcrumb~='item']
		> a:is(:hover, :focus-visible)::before,
	.attribute-accordions
		details
		> summary:is(:hover, :focus-visible)
		> h4[data-sticky-breadcrumb~='item']::before {
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
						var(---wallet-name-flow-font-size)
							* var(---wallet-line-height)
							- var(---wallet-variant-sticky-size)
					) / 2
			);
			---wallet-variant-sticky-inline-start: calc(
				anchor(--wallet-breadcrumb-surface end)
					+ var(---wallet-content-inline-start)
					+ var(---wallet-breadcrumb-trailing-control-inline-clearance)
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
			inline-size: anchor-size(--wallet-variant-picker-position inline);
			block-size: var(---wallet-variant-sticky-size);
			overflow: clip;
			clip-path: inset(0 round var(---wallet-variant-flow-radius));
			animation:
				WalletVariantPickerAnimation linear both,
				WalletVariantPickerClipAnimation linear both,
				WalletVariantPickerInlineSizeAnimation linear both;

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
			inline-size: 100%;
			min-inline-size: 0;
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

		@keyframes WalletVariantPickerInlineSizeAnimation {
			to { inline-size: var(---wallet-variant-sticky-size); }
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
