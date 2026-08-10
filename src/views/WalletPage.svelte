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

	$effect(() => {
		openHashDetails()
		globalThis.addEventListener('hashchange', openHashDetails)

		return () => {
			globalThis.removeEventListener('hashchange', openHashDetails)
		}
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
						iconVariant: 'emoji' as const,
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
								iconVariant: 'emoji' as const,
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
	const pieTimelineByHref = $derived(
		new Map(pieRotationSteps.map(step => [step.href, step.timeline]))
	)

	const attributeSliceStyles = $derived(
		new Map(
			pieNavigationItems.flatMap(group => (
				group.children?.map(attribute => [attribute.href, attribute.sliceStyle] as const) ?? []
			))
		)
	)
	const attributeGroupSliceStyles = $derived(
		new Map(
			pieNavigationItems.map(group => [group.href, group.sliceStyle] as const)
		)
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


	// Components
	import { Github, Globe } from 'lucide-static'
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
	import Typography from '@/components/Typography.svelte'
	import AccountRecoveryDetails from './attributes/security/AccountRecoveryDetails.svelte'
	import AccountUnruggabilityDetails from './attributes/self-sovereignty/AccountUnruggabilityDetails.svelte'
	import SecurityNews from '@/views/SecurityNews.svelte'
	import NavigationItems from '@/views/NavigationItems.svelte'
	import ScrollAngleSteps from '@/components/ScrollAngleSteps.svelte'
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
						<Select
							bind:value={selectedVariant}
							options={[
								{
									value: undefined,
									label: 'All versions',
								},
								...(
									Object.keys(wallet.variants)
										.map(v => ({
											value: v,
											label: variants[v].label,
											icon: variants[v].icon,
										}))
								),
							]}
						/>
					{/if}

					{#if 'hardware' in wallet.variants}
						{@const brandModels = allHardwareModels.filter(m => m.brandId === wallet.metadata.id)}
						{#if brandModels.length > 1}
							<Select
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
							<WalletStageBadge
								{stage}
								{ladderEvaluation}
								size="large"
							/>
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

				<div
					class="wallet-platforms"
					data-card="padding-5"
				>
					<p>
						<span class="platforms-label">Platforms: </span>
						{#each Object.keys(wallet.variants) as variant, i}
							{i > 0 ? ', ' : ''}<strong>{variantToRunsOn(variant)}</strong>
						{/each}.
					</p>

					{#if !hasSingleVariant(wallet.variants)}
						<p>
							The ratings below may vary depending on the version.
							{#if selectedVariant}
								You are currently viewing the ratings for the
								<strong>{variantToName(selectedVariant, false)}</strong> version.
							{:else}
								Select a version to see version-specific ratings.
							{/if}
						</p>
					{/if}

					{#if 'hardware' in wallet.variants}
						{@const brandModels = allHardwareModels.filter(m => m.brandId === wallet.metadata.id)}
						{#if brandModels.length > 1}
							<p>
								The ratings below may vary depending on the model.
								{#if selectedModel}
									You are currently viewing the ratings for the
									<strong>{brandModels.find(m => m.id.split('.')[1] === selectedModel)?.modelName}</strong> model.
								{:else}
									Select a model to see model-specific ratings.
								{/if}
							</p>
						{/if}
					{/if}
				</div>
			</section>
		</header>

		{#if walletNews.length > 0 && !newsIsVeryStale}
			<hr />
			<div data-scroll-item="inline-detached padding-match-end" data-column>
				<SecurityNews news={walletNews} {shouldExpandNews} {allNewsResolved} />
			</div>
		{/if}

		{#if showStage}
			{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}

			<section id="stages" data-sticky-breadcrumb="scope">
				<header
					data-sticky="block backdrop-none"
					data-sticky-breadcrumb="position"
					data-row
					data-scroll-item="inline-detached"
				>
					<a
						data-link="camouflaged"
						data-sticky-breadcrumb="item"
						href="#stages"
					>
						<h2 id="stages">Stage Progress</h2>
					</a>
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

	</article>

	<aside
		class="page-navigation"
		data-scroll-container="block"
		data-sticky-container
		data-column="gap-0"
	>
		<nav
			class="pie-navigation"
			data-sticky="block-start backdrop-before backdrop-always"
			aria-label="Attribute pie navigation"
			style={`---group-count: ${tocNavigationItems.length}; ---initial-slice-mid-angle: ${pieInitialSliceMidAngle}deg; --pie-radius: ${overallRatingPieRadius}; --pie-padding: ${overallRatingPiePadding}; --pie-maxR: ${overallRatingPieMaxRadius}`}
		>
			<div class="pie-navigation-geometry">
				<ScrollAngleSteps steps={pieRotationSteps}>
					<NavigationItems
						items={pieNavigationItems}
						showSearch={false}
						defaultOpen
						ariaLabel="Attribute pie navigation"
					>
						{#snippet iconSnippet(item: NavigationItem)}
							{#if item.icon}
								<span
									class="pie-navigation-icon"
									data-icon="wbicons emoji {item.icon}"
								></span>
							{/if}
						{/snippet}
					</NavigationItems>
				</ScrollAngleSteps>
			</div>
		</nav>

		<header
			data-sticky="block block-start backdrop-self backdrop-always"
			data-row
		>
			<h2>Table of contents</h2>
		</header>

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
						></span>
					{/if}
				{/snippet}
			</NavigationItems>
		</nav>

	</aside>
</div>


{#snippet navigationBadgeSnippet(item: NavigationItem, depth: number)}
	<WalletPageNavigationBadge
		{item}
		{depth}
		{attributeTree}
		{evalTree}
		{ladders}
		{wallet}
		{showScores}
		{showStage}
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
		{@const score = evalGroup ? calculateAttributeGroupScore(attrGroup, evalGroup) : null}
		{@const scoreLevel = score === null || score.score === null ? null : (score.score >= 0.7 ? 'high' : score.score >= 0.4 ? 'medium' : 'low')}
		{@const scoreColor = scoreToColor(score === null ? null : score.score)}
		{@const sliceStyle = attributeGroupSliceStyles.get(`#${slugifyCamelCase(attrGroup.id)}`)}

		<hr
			class="attribute-group-timeline"
			style:---pie-timeline={pieTimelineByHref.get(`#${slugifyCamelCase(attrGroup.id)}`)}
		/>

		<section
			class="attribute-group"
			id={slugifyCamelCase(attrGroup.id)}
			aria-label={attrGroup.displayName}
			data-sticky-breadcrumb="scope"
			data-score={scoreLevel}
			style:--accent={scoreColor}
		>
			<div
				class="attribute-group-stack"
				data-scroll-item="inline-detached padding-match-end"
			>
				<header
					data-row="start gap-4"
					data-scroll-item="inline-detached"
				>
					<span
						class="attribute-group-icon"
						data-icon="wbicons emoji {attrGroup.icon}"
						style:--slice-totalAngle={sliceStyle?.totalAngle}
						style:--slice-midAngle={sliceStyle?.midAngle}
						style:--slice-offset={sliceStyle?.offset}
						style:--slice-gap={sliceStyle?.gap}
						style:--slice-outerR={sliceStyle?.outerR}
						style:--slice-innerR={sliceStyle?.innerR}
						style:--slice-outerCornerRadius={sliceStyle?.outerCornerRadius}
						style:--slice-innerCornerRadius={sliceStyle?.innerCornerRadius}
						style:--slice-labelSize={sliceStyle?.labelSize}
						style:--slice-labelSizeScale={sliceStyle?.labelSizeScale}
						style:--slice-labelR={sliceStyle?.labelR}
					></span>

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
									href={`#${slugifyCamelCase(attrGroup.id)}`}
									interestfor={slugifyCamelCase(attrGroup.id)}
								>
									<h2>
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
	{@const sliceStyle = attributeSliceStyles.get(`#${slugifyCamelCase(attribute.id)}`)}

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
		id={slugifyCamelCase(attribute.id)}
		aria-label={attribute.displayName}
		style:--accent={ratingToColor(evalAttr.evaluation.outcome.rating)}
		style:---pie-timeline={pieTimelineByHref.get(`#${slugifyCamelCase(attribute.id)}`)}
		data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
	>
		<details
			open
			data-card="radius-8 padding-6 border-accent"
			data-column="gap-0"
			data-sticky-breadcrumb="scope"
		>
			<summary data-row>
				<header data-row-item="flexible" data-row="start gap-3">
					<span
						class="attribute-icon"
						data-icon="wbicons emoji {attribute.icon}"
						style:--slice-totalAngle={sliceStyle?.totalAngle}
						style:--slice-midAngle={sliceStyle?.midAngle}
						style:--slice-offset={sliceStyle?.offset}
						style:--slice-gap={sliceStyle?.gap}
						style:--slice-outerR={sliceStyle?.outerR}
						style:--slice-innerR={sliceStyle?.innerR}
						style:--slice-outerCornerRadius={sliceStyle?.outerCornerRadius}
						style:--slice-innerCornerRadius={sliceStyle?.innerCornerRadius}
						style:--slice-labelSize={sliceStyle?.labelSize}
						style:--slice-labelSizeScale={sliceStyle?.labelSizeScale}
						style:--slice-labelR={sliceStyle?.labelR}
					></span>

					<div
						class="attribute-summary-layout"
						data-row-item="flexible basis-2"
						data-row="start gap-2 wrap"
					>
						<div
							class="attribute-heading"
							data-row-item="flexible"
							data-column="gap-2"
						>
							<div
								class="attribute-heading-position"
								data-sticky-breadcrumb="position"
							>
								<a
									data-link="camouflaged"
									data-sticky-breadcrumb="item"
									href={`#${slugifyCamelCase(attribute.id)}`}
									interestfor={slugifyCamelCase(attribute.id)}
								>
									<h3>
										{attribute.displayName}
									</h3>
								</a>
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

						<div
							class="attribute-summary-companions-position"
							data-row-item="wrap-end"
						>
							<div
								class="attribute-summary-companions"
								data-row="gap-2 wrap"
							>
								{#if showStage}
								{@const { ladderEvaluation, ladderType } = getWalletStageAndLadder(wallet)}

								{@const attributeStages = getAttributeStagesForWallet(ladders, attribute, wallet)}

								{@const stageNumbers = (
									ladderType &&
										attributeStages
											.find(stage => stage.ladderType === ladderType)
											?.stageNumbers
									||
										[]
								)}

								{#if stageNumbers.length > 0}
									{@const stageNumber = stageNumbers[0]}
									{@const stage = ladderEvaluation?.ladder.stages[stageNumber]}

									{#if stage}
										<a
											href={`#${stage.id}`}
											data-link="camouflaged"
											title={`This attribute is required for stage${stageNumbers.length > 1 ? 's' : ''} ${stageNumbers.join(', ')}`}
										>
											<div
												data-badge="small"
												style:--accent="var(--accent-color)"
											>
												<small>Stage {stageNumbers.join(', ')}</small>
											</div>
										</a>
									{/if}
								{/if}
								{/if}

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

								{#if true}
								{@const verifiability = evalAttr.evaluation.outcome.verifiability}
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
								{/if}

								<data
									data-badge="medium"
									value={evalAttr.evaluation.outcome.rating}
								>{evalAttr.evaluation.outcome.rating}</data>
							</div>
						</div>
					</div>
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
				<details open data-card="padding-5 secondary radius-4" data-column="gap-0" data-sticky-container>
					<summary data-sticky="block block-start backdrop-self backdrop-always">
						<h4>
							{evalAttr.evaluation.outcome.rating === Rating.PASS || evalAttr.evaluation.outcome.rating === Rating.UNRATED ? 'Why does this matter?' : 'Why should I care?'}
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

				<details open data-card="secondary padding-5 radius-4" data-column="gap-0" data-sticky-container>
					<summary data-sticky="block block-start backdrop-self backdrop-always">
						<h4>
							{getHowIsEvaluatedHeading(attribute)}
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
					<details open data-card="secondary padding-5 radius-4" data-column="gap-0" data-sticky-container>
						<summary data-sticky="block block-start backdrop-self backdrop-always">
							<h4>
								{getHowToImproveHeading(attribute, wallet.metadata.displayName)}
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
		--wallet-icon-size: 3rem;
		---wallet-content-inline-padding: 2rem;
		---wallet-content-block-start: 2rem;
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
		---wallet-icon-sticky-inline-start: var(---wallet-content-inline-start);
		---wallet-name-sticky-icon-size: 2rem;
		---wallet-name-sticky-font-size: 1.8rem;
		---wallet-name-flow-icon-size: 3rem;
		---wallet-name-flow-font-size: 2.25rem;
		---wallet-name-flow-gap: 0.5em;
		---wallet-line-height: 1.6;
		---wallet-breadcrumb-attribute-font-size: 1.17rem;
		---wallet-breadcrumb-group-font-size: calc(
			(
				var(---wallet-breadcrumb-root-font-size)
				+ var(---wallet-breadcrumb-attribute-font-size)
			)
			/ 2
		);
		---wallet-breadcrumb-gap: 1.5rem;
		---wallet-breadcrumb-heading-icon-size: 1.5rem;
		---wallet-breadcrumb-heading-icon-gap: 0.5rem;
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
		---wallet-breadcrumb-companion-block-start: anchor(
			--wallet-breadcrumb-surface center
		);
		---wallet-breadcrumb-companion-inline-end-clearance: 0px;
		---wallet-breadcrumb-surface-background: light-dark(#F8EDFF, #130a2b);
		---wallet-breadcrumb-layer-root: 20;
		---wallet-breadcrumb-layer-group: 21;
		---wallet-breadcrumb-layer-attribute: 22;
		---wallet-attribute-heading-font-size: 1.17em;
		---wallet-breadcrumb-animation-range-start: entry calc(100dvb - 6rem);
		---wallet-breadcrumb-animation-range-end: entry calc(100dvb - 3rem);
		---wallet-name-animation-distance: 7.5rem;
		--border-radius-lg: 1rem;
		--border-radius: 0.5rem;
		--border-radius-sm: 0.25rem;

		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 54rem;
			--scrollItem-inlineDetached-paddingStart: var(---wallet-content-inline-padding);
			--scrollItem-inlineDetached-maxPaddingMatchStart: 5rem;
			--scrollItem-inlineDetached-paddingEnd: var(---wallet-content-inline-padding);
			--scrollItem-inlineDetached-maxPaddingMatchEnd: 5rem;
			--sticky-marginInlineEnd: var(---wallet-page-navigation-inline-size);
		}

		display: grid;
		grid-template:
			'Content Nav'
			/ minmax(0, 1fr) auto
		;
		@media (max-width: 1024px) {
			&[data-sticky-container] {
				--sticky-marginInlineStart: var(---wallet-page-navigation-inline-size);
				--sticky-marginInlineEnd: 0px;
			}

			grid-template:
				'Nav Content'
				/ auto minmax(0, 1fr)
			;
		}
		@media (max-width: 864px) {
			---wallet-mobile-pie-size-rem: 8;
			---wallet-mobile-pie-size: calc(
				var(---wallet-mobile-pie-size-rem)
				* 1rem
			);
			---wallet-breadcrumb-companion-inline-end-clearance: var(---wallet-mobile-pie-size);
			---wallet-name-sticky-icon-size: 2.4rem;
			---wallet-breadcrumb-gap: 1.25rem;
			&[data-sticky-container] {
				--sticky-marginInlineStart: 0px;
			}

			grid-template:
				[Nav-start]
				'Content'
				[Nav-end]
				/ [Nav-start] minmax(0, 1fr) [Nav-end]
			;
		}
		@media (min-width: 865px) and (max-width: 1280px) {
			---wallet-breadcrumb-gap: 1rem;
			---wallet-breadcrumb-heading-icon-size: 1.25rem;
			---wallet-breadcrumb-heading-icon-gap: 0.25rem;
		}

		line-height: var(---wallet-line-height);

		position: relative;

		article {
			grid-area: Content;
			position: relative;
		}

		.page-navigation {
			/* Nested scroll root: don't inherit page content's TOC clearance as sticky insets. */
			--sticky-marginInlineStart: 0px;
			--sticky-marginInlineEnd: 0px;
			--sticky-marginBlockStart: 0px;
			--sticky-marginBlockEnd: 0px;
			--sticky-paddingBlockStart: var(--pageNavigation-header-blockSize);
			--sticky0-insetInlineStart: 0px;
			--sticky0-insetInlineEnd: 0px;
			--sticky0-insetBlockStart: 0px;
			--sticky0-insetBlockEnd: 0px;
			--sticky-insetInlineStart: 0px;
			--sticky-insetInlineEnd: 0px;
			--sticky-insetBlockStart: 0px;
			--sticky-insetBlockEnd: 0px;

			--pageNavigation-header-blockSize: 3.5rem;
			--sticky-backgroundColor: var(--background-secondary);
			anchor-name: --wallet-page-navigation;

			grid-area: Nav;
			z-index: 2;

			position: sticky;
			inset-block-start: var(---wallet-page-block-offset);
			align-self: start;
			inline-size: var(---wallet-page-navigation-inline-size);
			block-size: calc(100cqb - var(---wallet-page-block-offset));

			scroll-behavior: smooth;
			background-color: var(--background-secondary);
			box-shadow: 0 0 var(--separator-width) var(--border-color);

			> header {
				--sticky-insetBlockStart: var(--sticky0-insetBlockStart);

				flex-shrink: 0;
				block-size: var(--pageNavigation-header-blockSize);
				box-shadow: inset 0 calc(-1 * var(--separator-width)) 0 var(--border-color);
				padding-inline: 1rem;

				font-size: 0.875rem;
				color: var(--text-secondary);
				text-transform: uppercase;
				letter-spacing: 0.05em;
				font-weight: 500;

				h2 {
					margin: 0;
					font: inherit;
					color: inherit;
				}
			}

			> nav:not(.pie-navigation) {
				position: relative;
				z-index: 0;
				align-content: stretch;
				min-block-size: max-content;
				padding: 0.75rem;

				&[data-sticky-container] {
					--sticky-marginBlockStart: 0px;
					--sticky-paddingBlockStart: 0.75rem;
					--sticky-paddingBlockEnd: 0.75rem;
				}
			}

			:global(a) {
				--icon-filter: brightness(0) opacity(0.35);

				&:hover {
					--icon-filter: none;
				}
			}

			:global(.toc-icon::before) {
				line-height: 1;
				filter: var(--icon-filter);
				transition-property: filter;
			}

			@media (max-width: 864px) {
				display: contents;
				z-index: auto;
				position: static;
				background: none;
				box-shadow: none;

				> header,
				> nav:not(.pie-navigation) {
					z-index: 6;
					position: fixed;
					inset-inline: 0 auto;
					inline-size: var(---wallet-page-navigation-inline-size);
					translate: -100% 0;
					transition: translate 0.3s var(--ease-out-expo);
					background-color: var(--background-secondary);
				}

				&::after {
					content: none;
				}

				> header {
					inset-block: calc(var(---wallet-page-block-offset) + 4rem) auto;
				}

				> nav:not(.pie-navigation) {
					inset-block:
						calc(var(---wallet-page-block-offset) + 4rem + var(--pageNavigation-header-blockSize))
						0;
					overflow-y: auto;
					min-block-size: 0;
					box-shadow: 0 0 var(--separator-width) var(--border-color);
				}

				&:focus-within > header,
				&:focus-within > nav:not(.pie-navigation) {
					translate: 0 0;
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
		---wallet-page-navigation-inline-size-rem: 20;
		---wallet-page-navigation-inline-size: calc(
			var(---wallet-page-navigation-inline-size-rem)
			* 1rem
		);
		---wallet-page-block-offset: 0px;
		---wallet-sticky-content-inset: 1rem;
		---wallet-breadcrumb-root-font-size: 1.8rem;
		---wallet-breadcrumb-block-size: calc(
			var(---wallet-breadcrumb-root-font-size)
			* 1.6
		);
		---wallet-breadcrumb-mobile-row-gap: 0.25rem;
		---wallet-breadcrumb-surface-fade: 0.5rem;
		/* Keep targeted content visibly separated from the soft backdrop edge. */
		---wallet-anchor-scroll-gap: 1rem;
		--scrollContainer-scrollPaddingBlockStart: calc(
			var(---wallet-page-block-offset)
			+ var(---wallet-sticky-content-inset)
			+ var(---wallet-breadcrumb-block-size)
			+ var(---wallet-breadcrumb-surface-fade)
			+ var(---wallet-anchor-scroll-gap)
		);

		scroll-snap-type: block proximity;

		@media (max-width: 1024px) {
			---wallet-page-block-offset: var(--navigation-mobile-blockSize);
		}

		@media (min-width: 865px) and (max-width: 1280px) {
			---wallet-page-navigation-inline-size-rem: 16;
			---wallet-breadcrumb-root-font-size: 1.5rem;
		}

		@media (max-width: 864px) {
			--scrollContainer-scrollPaddingBlockStart: calc(
				var(---wallet-page-block-offset)
				+ var(---wallet-sticky-content-inset)
				+ 2 * var(---wallet-breadcrumb-block-size)
				+ var(---wallet-breadcrumb-mobile-row-gap)
				+ var(---wallet-breadcrumb-surface-fade)
				+ var(---wallet-anchor-scroll-gap)
			);
		}
	}

	:global(#wallet-page [id]) {
		scroll-snap-align: start;
	}

	/*
	 * The mobile navigation depth effect normally promotes `#content` with an
	 * identity transform. That makes it the containing block for fixed
	 * descendants, so fixed anchor-positioned breadcrumbs move with this scroll
	 * root instead of the viewport. WalletPage's scroll-driven breadcrumbs need
	 * the viewport containing block at every breakpoint.
	 */
	:global(#layout:has(#wallet-page) > #content) {
		transform: none;
		transform-style: flat;
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

	@property ---pie-rotate {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0turn;
	}

	@property ---group-index {
		syntax: "<number>";
		inherits: true;
		initial-value: 1;
	}

	@property ---group-count {
		syntax: "<number>";
		inherits: true;
		initial-value: 1;
	}

	@property ---group-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 1turn;
	}

	@property ---group-start-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0turn;
	}

	@property ---attribute-index {
		syntax: "<number>";
		inherits: true;
		initial-value: 1;
	}

	@property ---attribute-count {
		syntax: "<number>";
		inherits: true;
		initial-value: 1;
	}

	@property ---attribute-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 1turn;
	}

	@property ---slice-total-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 1turn;
	}

	@property ---slice-mid-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0turn;
	}

	@property ---slice-scale {
		syntax: "<number>";
		inherits: true;
		initial-value: 1;
	}

	.pie-navigation {
		display: none;
	}

	@supports (clip-path: shape(from 0 0, line to 1px 1px, close)) {
		:is(.toc-icon, .attribute-group-icon, .attribute-icon) {
			---slice-total-angle: calc(var(--slice-totalAngle) * 1deg);
			---slice-gap: var(--slice-gap);
			---slice-outer-r: var(--slice-outerR);
			---slice-inner-r: var(--slice-innerR);
			---slice-outer-corner-radius: var(--slice-outerCornerRadius, calc(var(--slice-gap) / 2));
			---slice-inner-corner-radius: var(--slice-innerCornerRadius, calc(var(--slice-gap) / 2));
			---slice-half-angle: calc(abs(var(---slice-total-angle)) / 2);
			---slice-half-gap: calc(var(---slice-gap) / 2);
			---slice-outer-corner-r: max(
				0,
				min(
					var(---slice-outer-corner-radius),
					calc((var(---slice-outer-r) - var(---slice-inner-r)) / 2),
					calc(
						(
							sin(var(---slice-half-angle)) * var(---slice-outer-r)
							- var(---slice-half-gap)
						)
						/ (1 + sin(var(---slice-half-angle)))
					)
				)
			);
			---slice-inner-corner-r: max(
				0,
				min(
					var(---slice-inner-corner-radius),
					calc((var(---slice-outer-r) - var(---slice-inner-r)) / 2),
					calc(
						(
							sin(var(---slice-half-angle)) * var(---slice-inner-r)
							- var(---slice-half-gap)
						)
						/ max(0.000001, 1 - sin(var(---slice-half-angle)))
					)
				)
			);
			---slice-outer-corner-offset: calc(var(---slice-half-gap) + var(---slice-outer-corner-r));
			---slice-inner-corner-offset: calc(var(---slice-half-gap) + var(---slice-inner-corner-r));
			---slice-outer-corner-center-r: calc(var(---slice-outer-r) - var(---slice-outer-corner-r));
			---slice-inner-corner-center-r: calc(var(---slice-inner-r) + var(---slice-inner-corner-r));
			---slice-outer-angle-inset: asin(var(---slice-outer-corner-offset) / var(---slice-outer-corner-center-r));
			---slice-inner-angle-inset: asin(var(---slice-inner-corner-offset) / var(---slice-inner-corner-center-r));
			---slice-outer-side-r: sqrt(pow(var(---slice-outer-corner-center-r), 2) - pow(var(---slice-outer-corner-offset), 2));
			---slice-inner-side-r: sqrt(pow(var(---slice-inner-corner-center-r), 2) - pow(var(---slice-inner-corner-offset), 2));
			---slice-angle-outer-start: calc(var(---slice-outer-angle-inset) - var(---slice-half-angle));
			---slice-angle-outer-end: calc(var(---slice-half-angle) - var(---slice-outer-angle-inset));
			---slice-angle-inner-end: calc(var(---slice-half-angle) - var(---slice-inner-angle-inset));
			---slice-angle-inner-start: calc(var(---slice-inner-angle-inset) - var(---slice-half-angle));
			---slice-unit: calc(
				var(--icon-size) * 0.55 * var(--slice-labelSizeScale, 1)
				/ var(--slice-labelSize)
			);
			---slice-origin: calc(var(---slice-outer-r) * var(---slice-unit));
			---slice-scaled-offset: calc(
				var(--slice-offset)
				* var(---slice-unit)
			);
			---slice-outer-arc-block-half: calc(
				sin(clamp(0deg, var(---slice-angle-outer-end), 90deg))
				* var(---slice-outer-r)
			);
			---slice-inner-arc-block-half: calc(
				sin(clamp(0deg, var(---slice-angle-inner-end), 90deg))
				* var(---slice-inner-r)
			);
			---slice-outer-corner-arc-block-half: calc(
				sin(clamp(0deg, var(---slice-angle-outer-end), 90deg))
				* var(---slice-outer-corner-center-r)
				+ var(---slice-outer-corner-r)
			);
			---slice-inner-corner-arc-block-half: calc(
				sin(clamp(0deg, var(---slice-angle-inner-end), 90deg))
				* var(---slice-inner-corner-center-r)
				+ var(---slice-inner-corner-r)
			);
			---slice-block-half: max(
				0,
				var(---slice-outer-arc-block-half),
				var(---slice-outer-corner-arc-block-half),
				calc(
					sin(var(---slice-half-angle)) * var(---slice-outer-side-r)
					- cos(var(---slice-half-angle)) * var(---slice-half-gap)
				),
				calc(
					sin(var(---slice-half-angle)) * var(---slice-inner-side-r)
					- cos(var(---slice-half-angle)) * var(---slice-half-gap)
				),
				var(---slice-inner-corner-arc-block-half),
				var(---slice-inner-arc-block-half)
			);

			position: relative;
			isolation: isolate;
			contain: content;
			inline-size: calc(
				(var(---slice-outer-r) - var(---slice-inner-r))
				* var(---slice-unit)
			);
			block-size: calc(2 * var(---slice-block-half) * var(---slice-unit));
			border: 0;
			border-radius: 0;
			background: transparent;

			&::before {
				position: absolute;
				inset:
					50% auto auto
					calc(
						(
							var(---slice-outer-r) - var(--slice-labelR)
						)
						/ (
							var(---slice-outer-r) - var(---slice-inner-r)
						)
						* 100%
					);
				z-index: 1;
				font-size: calc(
					var(--icon-size) * 0.55
					* var(--slice-labelSizeScale, 1)
				);
				translate: -50% -50%;
			}

			&::after {
				content: '';

				display: block;
				position: absolute;
				inset-inline-start: 0;
				inset-block-start: calc(50% - var(---slice-origin));
				inline-size: calc(2 * var(---slice-origin));
				block-size: calc(2 * var(---slice-origin));
				background: var(--accent, var(--background-tertiary));
				clip-path: shape(
					from
						calc(
							var(---slice-origin)
							+ sin(var(---slice-angle-outer-start)) * var(---slice-outer-r) * var(---slice-unit)
						)
						calc(
							var(---slice-origin)
							- cos(var(---slice-angle-outer-start)) * var(---slice-outer-r) * var(---slice-unit)
						),
					arc to
						calc(
							var(---slice-origin)
							+ sin(var(---slice-angle-outer-end)) * var(---slice-outer-r) * var(---slice-unit)
						)
						calc(
							var(---slice-origin)
							- cos(var(---slice-angle-outer-end)) * var(---slice-outer-r) * var(---slice-unit)
						)
						of calc(var(---slice-outer-r) * var(---slice-unit)) cw small,
					arc to
						calc(var(---slice-origin) + (sin(var(---slice-half-angle)) * var(---slice-outer-side-r) - cos(var(---slice-half-angle)) * var(---slice-half-gap)) * var(---slice-unit))
						calc(var(---slice-origin) - (cos(var(---slice-half-angle)) * var(---slice-outer-side-r) + sin(var(---slice-half-angle)) * var(---slice-half-gap)) * var(---slice-unit))
						of calc(var(---slice-outer-corner-r) * var(---slice-unit)) cw small,
					line to
						calc(var(---slice-origin) + (sin(var(---slice-half-angle)) * var(---slice-inner-side-r) - cos(var(---slice-half-angle)) * var(---slice-half-gap)) * var(---slice-unit))
						calc(var(---slice-origin) - (cos(var(---slice-half-angle)) * var(---slice-inner-side-r) + sin(var(---slice-half-angle)) * var(---slice-half-gap)) * var(---slice-unit)),
					arc to
						calc(var(---slice-origin) + sin(var(---slice-angle-inner-end)) * var(---slice-inner-r) * var(---slice-unit))
						calc(var(---slice-origin) - cos(var(---slice-angle-inner-end)) * var(---slice-inner-r) * var(---slice-unit))
						of calc(var(---slice-inner-corner-r) * var(---slice-unit)) cw small,
					arc to
						calc(var(---slice-origin) + sin(var(---slice-angle-inner-start)) * var(---slice-inner-r) * var(---slice-unit))
						calc(var(---slice-origin) - cos(var(---slice-angle-inner-start)) * var(---slice-inner-r) * var(---slice-unit))
						of calc(var(---slice-inner-r) * var(---slice-unit)) ccw small,
					arc to
						calc(var(---slice-origin) + (cos(var(---slice-half-angle)) * var(---slice-half-gap) - sin(var(---slice-half-angle)) * var(---slice-inner-side-r)) * var(---slice-unit))
						calc(var(---slice-origin) - (cos(var(---slice-half-angle)) * var(---slice-inner-side-r) + sin(var(---slice-half-angle)) * var(---slice-half-gap)) * var(---slice-unit))
						of calc(var(---slice-inner-corner-r) * var(---slice-unit)) cw small,
					line to
						calc(var(---slice-origin) + (cos(var(---slice-half-angle)) * var(---slice-half-gap) - sin(var(---slice-half-angle)) * var(---slice-outer-side-r)) * var(---slice-unit))
						calc(var(---slice-origin) - (cos(var(---slice-half-angle)) * var(---slice-outer-side-r) + sin(var(---slice-half-angle)) * var(---slice-half-gap)) * var(---slice-unit)),
					arc to
						calc(var(---slice-origin) + sin(var(---slice-angle-outer-start)) * var(---slice-outer-r) * var(---slice-unit))
						calc(var(---slice-origin) - cos(var(---slice-angle-outer-start)) * var(---slice-outer-r) * var(---slice-unit))
						of calc(var(---slice-outer-corner-r) * var(---slice-unit)) cw small,
					close
				);
				pointer-events: none;
				transform-origin:
					var(---slice-origin)
					var(---slice-origin);
				transform:
					translateX(var(---slice-scaled-offset))
					rotate(-0.25turn)
					translateY(calc(-1 * var(---slice-scaled-offset)));
				z-index: 0;
			}
		}

		.container .page-navigation {
			---pie-size-rem: var(---wallet-page-navigation-inline-size-rem);
			---pie-size: calc(var(---pie-size-rem) * 1rem);

			box-sizing: border-box;
			--sticky0-insetBlockStart: calc(var(---pie-size) + 0.5rem);
			--sticky-insetBlockStart: var(--sticky0-insetBlockStart);
		}

		.container .page-navigation > .pie-navigation[data-sticky][data-sticky] {
			/* Match Pie's inline-configured view box, including its padding. */
			---pie-diameter: calc(2 * (var(--pie-maxR) + var(--pie-padding)));
			---pie-origin-x: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
			---pie-origin-y: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
			/*
			 * Unitless rem/pixel counts preserve Firefox's fallback without
			 * duplicating the configured pie size.
			 */
			---pie-scale: calc(var(---pie-size-rem) / (var(---pie-diameter) / 16));
			---pie-target-angle: 0.625turn;
			---pie-rotate: calc(
				var(---pie-target-angle)
				- var(
					---initial-slice-mid-angle,
					calc(0.5turn / var(---group-count))
				)
			);
			--sticky-insetBlockStart: 0px;

			display: block;
			z-index: 3;
			position: sticky;
			align-self: start;
			flex-shrink: 0;
			justify-self: stretch;
			inset-block-start: 0;
			inset-inline: 0;
			inline-size: 100%;
			block-size: var(---pie-surface-size, var(---pie-size));
			max-inline-size: none;
			max-block-size: none;
			pointer-events: none;
			border-radius: 0;
			contain: layout style;
			--sticky-backgroundColor: var(--background-secondary);
			--sticky-backdropFilter: blur(1rem);

			.pie-navigation-geometry {
				position: relative;
				inline-size: var(---pie-size);
				block-size: var(---pie-size);
				margin-inline: auto;
				contain: strict;
			}

			:global(.navigation-items) {
				position: absolute;
				inset: 50% auto auto 50%;
				inline-size: calc(var(---pie-diameter) * 1px);
				block-size: calc(var(---pie-diameter) * 1px);
				contain: strict;
				translate: -50% -50%;
				scale: var(---pie-scale);
				transform: rotate(var(---pie-rotate)) translateZ(0);
				transform-origin: center;
				clip-path: circle(50%);
				pointer-events: none;
				isolation: isolate;
				transition-property: transform;
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
			}

			:global(.navigation-items menu[data-navigation-depth='0'] > li) {
				---group-angle: calc(1turn / var(---group-count));
				---group-start-angle: calc(
					(var(---group-index) - 1) * var(---group-angle)
				);
			}

			:global(.navigation-items menu[data-navigation-depth='1'] > li) {
				---attribute-angle: calc(
					var(---group-angle) / var(---attribute-count)
				);
			}

			@supports (top: calc(sibling-index() * 1px)) {
				:global(.navigation-items menu[data-navigation-depth='0'] > li) {
					---group-index: sibling-index();
					---group-count: sibling-count();
				}

				:global(.navigation-items menu[data-navigation-depth='1'] > li) {
					---attribute-index: sibling-index();
					---attribute-count: sibling-count();
				}
			}

			:global(.navigation-items summary) {
				display: contents;
			}

			:global(.navigation-items summary > a) {
				--slice-totalAngle: calc((1turn - 5deg * var(---group-count)) / var(---group-count));
				--slice-midAngle: calc((1 - var(---group-index)) * 1turn / var(---group-count));
				--slice-offset: 3;
				--slice-outerR: 80;
				--slice-innerR: 12;
				--slice-gap: 4;
				--slice-outerCornerRadius: 28;
				--slice-innerCornerRadius: 16;
				--slice-labelSize: 25;
				--slice-labelSizeScale: 1.25;
				---slice-label-offset: calc(
					var(---slice-label-r) * 1px
				);
			}

			:global(.navigation-items menu[data-navigation-depth='1'] > li > a) {
				--slice-totalAngle: var(---attribute-angle);
				--slice-midAngle: calc(
					var(
						---attribute-start-angle,
						calc(
							var(---group-start-angle)
							+ (var(---attribute-index) - 1) * var(---attribute-angle)
						)
					)
					+ var(---attribute-angle) / 2
				);
				--slice-offset: 80;
				--slice-outerR: 36;
				--slice-innerR: 8;
				--slice-gap: 0;
				--slice-outerCornerRadius: 8;
				--slice-innerCornerRadius: 8;
				--slice-labelSize: 9;
				--slice-labelSizeScale: 1;
				---slice-label-offset: calc(
					var(---slice-label-r) * 1px
				);
				--slice-arcSize: small;
			}

			/* Firefox lacks typed length division/multiplication outside shape(). */
			@supports not (top: calc(sibling-index() * 1px)) {
				:global(.navigation-items summary > a) {
					---slice-label-offset: 52.313px;
				}

				:global(.navigation-items menu[data-navigation-depth='1'] > li > a) {
					---slice-label-offset: 10.99px;
				}
			}

			:global(.navigation-items summary > a),
			:global(.navigation-items menu[data-navigation-depth='1'] > li > a) {
				---slice-total-angle: calc(var(--slice-totalAngle) * 1deg);
				---slice-mid-angle: calc(
					var(--slice-midAngle) * 1deg
					+ var(---pie-start-angle, 0deg)
				);
				---slice-offset: var(--slice-offset);
				---slice-gap: var(--slice-gap);
				---slice-outer-r: var(--slice-outerR);
				---slice-inner-r: var(--slice-innerR);
				---slice-outer-corner-radius: var(--slice-outerCornerRadius);
				---slice-inner-corner-radius: var(--slice-innerCornerRadius);
				---slice-label-size: var(--slice-labelSize);
				---slice-arc-size: var(--slice-arcSize, small);
				---slice-scale: 1;
				---slice-label-radius: calc(var(---slice-label-size) / 2);
				---slice-label-r: clamp(
					pow(
						(
							(var(---slice-outer-r) - var(---slice-label-radius))
							* (var(---slice-inner-r) + var(---slice-label-radius))
						),
						0.5
					),
					(
						2 / 3
						* (
							(
								pow(var(---slice-outer-r), 3)
								- pow(var(---slice-inner-r), 3)
							)
							/ (
								pow(var(---slice-outer-r), 2)
								- pow(var(---slice-inner-r), 2)
							)
						)
						* (
							sin(abs(var(---slice-total-angle)) / 2)
							/ (abs(var(---slice-total-angle)) / 2rad)
						)
					),
					var(---slice-outer-r) - var(---slice-label-radius)
				);

				---slice-half-angle: calc(abs(var(---slice-total-angle)) / 2);
				---slice-half-gap: calc(var(---slice-gap) / 2);
				---slice-outer-corner-r: max(
					0,
					min(
						var(---slice-outer-corner-radius),
						calc((var(---slice-outer-r) - var(---slice-inner-r)) / 2),
						max(
							0,
							(
								(
									sin(var(---slice-half-angle)) * var(---slice-outer-r)
									- var(---slice-half-gap)
								)
								/ (1 + sin(var(---slice-half-angle)))
							)
						)
					)
				);
				---slice-inner-corner-r: max(
					0,
					min(
						var(---slice-inner-corner-radius),
						calc((var(---slice-outer-r) - var(---slice-inner-r)) / 2),
						max(
							0,
							(
								(
									sin(var(---slice-half-angle)) * var(---slice-inner-r)
									- var(---slice-half-gap)
								)
								/ max(0.000001, 1 - sin(var(---slice-half-angle)))
							)
						)
					)
				);
				---slice-outer-corner-offset: calc(
					var(---slice-half-gap) + var(---slice-outer-corner-r)
				);
				---slice-inner-corner-offset: calc(
					var(---slice-half-gap) + var(---slice-inner-corner-r)
				);
				---slice-outer-corner-center-r: calc(
					var(---slice-outer-r) - var(---slice-outer-corner-r)
				);
				---slice-inner-corner-center-r: calc(
					var(---slice-inner-r) + var(---slice-inner-corner-r)
				);
				---slice-outer-angle-inset: asin(
					var(---slice-outer-corner-offset) / var(---slice-outer-corner-center-r)
				);
				---slice-inner-angle-inset: asin(
					var(---slice-inner-corner-offset) / var(---slice-inner-corner-center-r)
				);
				---slice-outer-side-r: sqrt(
					pow(var(---slice-outer-corner-center-r), 2)
					- pow(var(---slice-outer-corner-offset), 2)
				);
				---slice-inner-side-r: sqrt(
					pow(var(---slice-inner-corner-center-r), 2)
					- pow(var(---slice-inner-corner-offset), 2)
				);
				---slice-angle-outer-start: calc(
					var(---slice-outer-angle-inset) - var(---slice-half-angle)
				);
				---slice-angle-outer-end: calc(
					var(---slice-half-angle) - var(---slice-outer-angle-inset)
				);
				---slice-angle-inner-end: calc(
					var(---slice-half-angle) - var(---slice-inner-angle-inset)
				);
				---slice-angle-inner-start: calc(
					var(---slice-inner-angle-inset) - var(---slice-half-angle)
				);
				---slice-outer-start-x: calc(
					var(---pie-origin-x)
					+ sin(var(---slice-angle-outer-start)) * var(---slice-outer-r) * var(---slice-unit, 1px)
				);
				---slice-outer-start-y: calc(
					var(---pie-origin-y)
					- cos(var(---slice-angle-outer-start)) * var(---slice-outer-r) * var(---slice-unit, 1px)
				);

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
				transform-origin: var(---pie-origin-x) var(---pie-origin-y);
				transform:
					rotate(var(---slice-mid-angle))
					scale(var(---slice-scale))
					translateY(calc(var(---slice-offset) * -1px));
				clip-path: shape(
					from var(---slice-outer-start-x) var(---slice-outer-start-y),
					arc to
						calc(
							var(---pie-origin-x)
							+ sin(var(---slice-angle-outer-end)) * var(---slice-outer-r) * var(---slice-unit, 1px)
						)
						calc(
							var(---pie-origin-y)
							- cos(var(---slice-angle-outer-end)) * var(---slice-outer-r) * var(---slice-unit, 1px)
						)
						of calc(var(---slice-outer-r) * var(---slice-unit, 1px)) cw var(---slice-arc-size, small),
					arc to
						calc(
							var(---pie-origin-x)
							+ (
								sin(var(---slice-half-angle)) * var(---slice-outer-side-r)
								- cos(var(---slice-half-angle)) * var(---slice-half-gap)
							) * var(---slice-unit, 1px)
						)
						calc(
							var(---pie-origin-y)
							- (
								cos(var(---slice-half-angle)) * var(---slice-outer-side-r)
								+ sin(var(---slice-half-angle)) * var(---slice-half-gap)
							) * var(---slice-unit, 1px)
						)
						of calc(var(---slice-outer-corner-r) * var(---slice-unit, 1px)) cw small,
					line to
						calc(
							var(---pie-origin-x)
							+ (
								sin(var(---slice-half-angle)) * var(---slice-inner-side-r)
								- cos(var(---slice-half-angle)) * var(---slice-half-gap)
							) * var(---slice-unit, 1px)
						)
						calc(
							var(---pie-origin-y)
							- (
								cos(var(---slice-half-angle)) * var(---slice-inner-side-r)
								+ sin(var(---slice-half-angle)) * var(---slice-half-gap)
							) * var(---slice-unit, 1px)
						),
					arc to
						calc(
							var(---pie-origin-x)
							+ sin(var(---slice-angle-inner-end)) * var(---slice-inner-r) * var(---slice-unit, 1px)
						)
						calc(
							var(---pie-origin-y)
							- cos(var(---slice-angle-inner-end)) * var(---slice-inner-r) * var(---slice-unit, 1px)
						)
						of calc(var(---slice-inner-corner-r) * var(---slice-unit, 1px)) cw small,
					arc to
						calc(
							var(---pie-origin-x)
							+ sin(var(---slice-angle-inner-start)) * var(---slice-inner-r) * var(---slice-unit, 1px)
						)
						calc(
							var(---pie-origin-y)
							- cos(var(---slice-angle-inner-start)) * var(---slice-inner-r) * var(---slice-unit, 1px)
						)
						of calc(var(---slice-inner-r) * var(---slice-unit, 1px)) ccw var(---slice-arc-size, small),
					arc to
						calc(
							var(---pie-origin-x)
							+ (
								cos(var(---slice-half-angle)) * var(---slice-half-gap)
								- sin(var(---slice-half-angle)) * var(---slice-inner-side-r)
							) * var(---slice-unit, 1px)
						)
						calc(
							var(---pie-origin-y)
							- (
								cos(var(---slice-half-angle)) * var(---slice-inner-side-r)
								+ sin(var(---slice-half-angle)) * var(---slice-half-gap)
							) * var(---slice-unit, 1px)
						)
						of calc(var(---slice-inner-corner-r) * var(---slice-unit, 1px)) cw small,
					line to
						calc(
							var(---pie-origin-x)
							+ (
								cos(var(---slice-half-angle)) * var(---slice-half-gap)
								- sin(var(---slice-half-angle)) * var(---slice-outer-side-r)
							) * var(---slice-unit, 1px)
						)
						calc(
							var(---pie-origin-y)
							- (
								cos(var(---slice-half-angle)) * var(---slice-outer-side-r)
								+ sin(var(---slice-half-angle)) * var(---slice-half-gap)
							) * var(---slice-unit, 1px)
						),
					arc to var(---slice-outer-start-x) var(---slice-outer-start-y)
						of calc(var(---slice-outer-corner-r) * var(---slice-unit, 1px)) cw small,
					close
				);
				transition-property: opacity, ---slice-scale;
			}

			:global(.navigation-items a:is(:hover, :focus-visible, :interest-source, :target-current)),
			:global(.navigation-items summary:has(~ menu a:target-current) > a) {
				---slice-scale: 1.045;
				opacity: 1;
				outline: none;
			}

			:global(.navigation-items menu[data-navigation-depth='1'] > li > a) {
				z-index: 1;
			}

			:global(.navigation-items a > span[data-row-item]) {
				position: absolute;
				inline-size: 1px;
				block-size: 1px;
				padding: 0;
				margin: -1px;
				overflow: hidden;
				clip-path: inset(50%);
				white-space: nowrap;
			}

			:global(.navigation-items a > .pie-navigation-icon) {
				--icon-size: calc(var(---slice-label-size) * 1px);

				position: absolute;
				inset: var(---pie-origin-y) auto auto var(---pie-origin-x);
				translate: -50% calc(-50% - var(---slice-label-offset));
				rotate: calc(-1 * (var(---pie-rotate) + var(---slice-mid-angle)));
				filter: var(
					---linked-icon-filter,
					contrast(0.5) brightness(3) opacity(0.7)
						drop-shadow(1px 2px 3px rgb(0 0 0 / 0.15))
				);
				transition-property: filter;
			}

			:global(.navigation-items a:is(:hover, :focus-visible, :interest-source, :target-current) > .pie-navigation-icon) {
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

			> .pie-navigation-icon {
				filter: none;
			}
		}

		@media (max-width: 1024px) {
			.container .page-navigation > .pie-navigation[data-sticky][data-sticky] {
				---pie-target-angle: 0.375turn;
			}
		}

		@media (max-width: 864px) {
			.container .page-navigation {
				padding-block-start: 0;
				--sticky0-insetBlockStart: 0px;
				--sticky-insetBlockStart: 0px;
			}

			.container .page-navigation > .pie-navigation[data-sticky][data-sticky] {
				---pie-size-rem: var(---wallet-mobile-pie-size-rem);
				---pie-size: var(---wallet-mobile-pie-size);
				---pie-surface-size: 4.25rem;
				---pie-target-angle: 0.5turn;

				z-index: calc(var(---wallet-breadcrumb-layer-attribute) + 1);
				grid-area: Content;
				justify-self: end;
				inset-block-start: calc(var(---wallet-page-block-offset) + 0.125rem);
				inset-inline: auto 0;
				inline-size: var(---pie-size);

				&::before {
					content: none;
				}

				.pie-navigation-geometry {
					margin: 0;
					translate: 0 calc(var(---pie-surface-size) - var(---pie-size));
				}
			}
		}
	}

	a:has(> :is(h1, h2, h3)) {
		display: flex;
		align-items: center;

		&::before {
			content: '# ';
			display: inline-flex;
			justify-content: end;
			text-align: end;
			width: 0;
			padding-inline-end: 0.66rem;
			margin-inline-start: -0.66rem;
			font-size: 1.25rem;
			line-height: calc(1 / 0.7);

			transition-property: opacity;
		}

		&:not(:hover)::before {
			opacity: 0;
		}
	}

	/*
	 * Interest invokers expose state on their target, but not on the target's
	 * other invokers. CSS cannot compare arbitrary attribute values, so these
	 * target ↔ href pairs are the irreducible CSS-only bridge between both
	 * NavigationItems trees and the matching in-page link.
	 */
	.container:has(#security:interest-target) :global(:is(a[href='#security'], summary:has(> a[href='#security']))),
	.container:has(#security-audits:interest-target) :global(:is(a[href='#security-audits'], summary:has(> a[href='#security-audits']))),
	.container:has(#scam-prevention:interest-target) :global(:is(a[href='#scam-prevention'], summary:has(> a[href='#scam-prevention']))),
	.container:has(#chain-verification:interest-target) :global(:is(a[href='#chain-verification'], summary:has(> a[href='#chain-verification']))),
	.container:has(#transaction-legibility:interest-target) :global(:is(a[href='#transaction-legibility'], summary:has(> a[href='#transaction-legibility']))),
	.container:has(#hardware-wallet-support:interest-target) :global(:is(a[href='#hardware-wallet-support'], summary:has(> a[href='#hardware-wallet-support']))),
	.container:has(#security-best-practices:interest-target) :global(:is(a[href='#security-best-practices'], summary:has(> a[href='#security-best-practices']))),
	.container:has(#account-recovery:interest-target) :global(:is(a[href='#account-recovery'], summary:has(> a[href='#account-recovery']))),
	.container:has(#duress-resistance:interest-target) :global(:is(a[href='#duress-resistance'], summary:has(> a[href='#duress-resistance']))),
	.container:has(#bug-bounty-program:interest-target) :global(:is(a[href='#bug-bounty-program'], summary:has(> a[href='#bug-bounty-program']))),
	.container:has(#supply-chain-factory:interest-target) :global(:is(a[href='#supply-chain-factory'], summary:has(> a[href='#supply-chain-factory']))),
	.container:has(#firmware:interest-target) :global(:is(a[href='#firmware'], summary:has(> a[href='#firmware']))),
	.container:has(#user-safety:interest-target) :global(:is(a[href='#user-safety'], summary:has(> a[href='#user-safety']))),
	.container:has(#privacy:interest-target) :global(:is(a[href='#privacy'], summary:has(> a[href='#privacy']))),
	.container:has(#address-correlation:interest-target) :global(:is(a[href='#address-correlation'], summary:has(> a[href='#address-correlation']))),
	.container:has(#multi-address-correlation:interest-target) :global(:is(a[href='#multi-address-correlation'], summary:has(> a[href='#multi-address-correlation']))),
	.container:has(#private-transfers:interest-target) :global(:is(a[href='#private-transfers'], summary:has(> a[href='#private-transfers']))),
	.container:has(#app-isolation:interest-target) :global(:is(a[href='#app-isolation'], summary:has(> a[href='#app-isolation']))),
	.container:has(#privacy-hygiene:interest-target) :global(:is(a[href='#privacy-hygiene'], summary:has(> a[href='#privacy-hygiene']))),
	.container:has(#hardware-privacy:interest-target) :global(:is(a[href='#hardware-privacy'], summary:has(> a[href='#hardware-privacy']))),
	.container:has(#self-sovereignty:interest-target) :global(:is(a[href='#self-sovereignty'], summary:has(> a[href='#self-sovereignty']))),
	.container:has(#l1-provider-independence:interest-target) :global(:is(a[href='#l1-provider-independence'], summary:has(> a[href='#l1-provider-independence']))),
	.container:has(#account-portability:interest-target) :global(:is(a[href='#account-portability'], summary:has(> a[href='#account-portability']))),
	.container:has(#transaction-inclusion:interest-target) :global(:is(a[href='#transaction-inclusion'], summary:has(> a[href='#transaction-inclusion']))),
	.container:has(#account-unruggability:interest-target) :global(:is(a[href='#account-unruggability'], summary:has(> a[href='#account-unruggability']))),
	.container:has(#permissions-management:interest-target) :global(:is(a[href='#permissions-management'], summary:has(> a[href='#permissions-management']))),
	.container:has(#transparency:interest-target) :global(:is(a[href='#transparency'], summary:has(> a[href='#transparency']))),
	.container:has(#open-source:interest-target) :global(:is(a[href='#open-source'], summary:has(> a[href='#open-source']))),
	.container:has(#source-visibility:interest-target) :global(:is(a[href='#source-visibility'], summary:has(> a[href='#source-visibility']))),
	.container:has(#funding:interest-target) :global(:is(a[href='#funding'], summary:has(> a[href='#funding']))),
	.container:has(#fee-transparency:interest-target) :global(:is(a[href='#fee-transparency'], summary:has(> a[href='#fee-transparency']))),
	.container:has(#release-process:interest-target) :global(:is(a[href='#release-process'], summary:has(> a[href='#release-process']))),
	.container:has(#reputation:interest-target) :global(:is(a[href='#reputation'], summary:has(> a[href='#reputation']))),
	.container:has(#ecosystem:interest-target) :global(:is(a[href='#ecosystem'], summary:has(> a[href='#ecosystem']))),
	.container:has(#account-abstraction:interest-target) :global(:is(a[href='#account-abstraction'], summary:has(> a[href='#account-abstraction']))),
	.container:has(#address-resolution:interest-target) :global(:is(a[href='#address-resolution'], summary:has(> a[href='#address-resolution']))),
	.container:has(#browser-integration:interest-target) :global(:is(a[href='#browser-integration'], summary:has(> a[href='#browser-integration']))),
	.container:has(#chain-abstraction:interest-target) :global(:is(a[href='#chain-abstraction'], summary:has(> a[href='#chain-abstraction']))),
	.container:has(#transaction-batching:interest-target) :global(:is(a[href='#transaction-batching'], summary:has(> a[href='#transaction-batching']))),
	.container:has(#hardware-wallet-interoperability:interest-target) :global(:is(a[href='#hardware-wallet-interoperability'], summary:has(> a[href='#hardware-wallet-interoperability']))),
	.container:has(#interoperability:interest-target) :global(:is(a[href='#interoperability'], summary:has(> a[href='#interoperability']))),
	.container:has(#app-connection-support:interest-target) :global(:is(a[href='#app-connection-support'], summary:has(> a[href='#app-connection-support']))),
	.container:has(#maintenance:interest-target) :global(:is(a[href='#maintenance'], summary:has(> a[href='#maintenance']))) {
		---backgroundColor: var(--navItem-hover-backgroundColor);
		---color: var(--accent);
		---linked-icon-filter: none;
		---slice-scale: 1.045;
		--icon-filter: none;

		color: var(--accent);
		opacity: 1;
		text-decoration: none;
	}

	@property --wallet-icon-size {
		syntax: "<length>";
		inherits: true;
		initial-value: 0;
	}

	@property --wallet-breadcrumb-surface-opacity {
		syntax: "<number>";
		inherits: true;
		initial-value: 0;
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
		}

		.wallet-title-row {
			anchor-name: --wallet-title-flow-position;
			min-block-size: max(
				var(--wallet-icon-size),
				calc(
					var(---wallet-name-flow-font-size)
					* var(---wallet-line-height)
				)
			);
		}

		@media (max-width: 864px) {
			.wallet-summary-badges {
				flex-basis: 100%;
				justify-content: end;
			}
		}
	}

	@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%)) {
		.attribute-group-timeline,
		.attribute > details > summary {
			view-timeline-name: var(---pie-timeline, none);
			view-timeline-axis: block;
		}

		article {
			a:has(> h2):not([data-sticky-breadcrumb~='item']) {
				view-timeline-name: --heading-timeline;
				view-timeline-axis: block;

				animation: SectionHeadingAnimation var(--transition-easeInOutExpo) both;
				animation-timeline: view();
				animation-range:
					var(---wallet-breadcrumb-animation-range-start)
					var(---wallet-breadcrumb-animation-range-end);

				&::before {
					animation: SectionHeadingArrowAnimation var(--transition-easeInOutExpo) forwards;
					animation-timeline: --heading-timeline;
					animation-range:
						var(---wallet-breadcrumb-animation-range-start)
						var(---wallet-breadcrumb-animation-range-end);
				}
			}
		}

		@keyframes SectionHeadingAnimation {
			to {
				margin-left: calc(var(--wallet-icon-size) + 1.25rem);
			}
		}

		@keyframes SectionHeadingArrowAnimation {
			from {
				opacity: 0;
			}
			to {
				content: '› ';
				opacity: 1;
			}
		}
	}

	@supports (
		((animation-timeline: scroll()) and (animation-range: 0% 100%)) and
		(container-type: scroll-state) and
		(position-anchor: --wallet-name) and
		(inset-inline-start: anchor(--wallet-name end))
	) {
		.container {
			--stickyBreadcrumb-gap: var(---wallet-breadcrumb-gap);
			--stickyBreadcrumb-item-insetBlockStart: var(---wallet-icon-sticky-block-start);
			--stickyBreadcrumb-item-blockSize: var(---wallet-breadcrumb-block-size);
			--stickyBreadcrumb-trackBlockEnd: calc(
				var(---wallet-icon-sticky-block-start)
				+ var(---wallet-breadcrumb-block-size)
				+ var(---wallet-breadcrumb-surface-fade)
			);
			--stickyBreadcrumb-animationRangeStart: var(---wallet-breadcrumb-animation-range-start);
			--stickyBreadcrumb-animationRangeEnd: var(---wallet-breadcrumb-animation-range-end);
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
				+ var(---wallet-name-flow-gap)
			);

			visibility: hidden;
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
		}

		[data-sticky-breadcrumb~='item']:not([data-sticky-breadcrumb~='root']) {
			&::before {
				position: absolute;
				inset-block-start: 0;
				inset-inline-start: calc(-1 * var(--stickyBreadcrumb-gap));
				display: grid;
				place-items: center;
				inline-size: var(--stickyBreadcrumb-gap);
				block-size: var(--stickyBreadcrumb-item-blockSize);
				margin: 0;
				line-height: 1;
				text-box: trim-both cap alphabetic;
				pointer-events: none;
			}
		}

		article > header#top .wallet-name {
			z-index: var(---wallet-breadcrumb-layer-root);
			font-size: var(---wallet-name-flow-font-size);

			animation: WalletNameAnimation var(--transition-easeOutExpo) both;
			animation-timeline: --wallet-page-scroll-timeline;
			animation-range: 0px var(---wallet-name-animation-distance);

			&::after {
				content: '';
				z-index: -1;
				pointer-events: none;
				anchor-name: --wallet-breadcrumb-surface;

				position: fixed;
				inset-block-start: calc(
					var(---wallet-page-block-offset)
					- var(---wallet-breadcrumb-surface-fade)
				);
				inset-inline-start: 0;
				inline-size: calc(
					100vi
					- var(---wallet-page-navigation-inline-size)
				);
				block-size: calc(
					2 * var(---wallet-sticky-content-inset)
					+ var(---wallet-breadcrumb-block-size)
					+ 2 * var(---wallet-breadcrumb-surface-fade)
				);

				background-color: var(---wallet-breadcrumb-surface-background);
				backdrop-filter: blur(20px);
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
				opacity: var(--wallet-breadcrumb-surface-opacity);

				@media (max-width: 1024px) {
					inset-inline-start: var(---wallet-page-navigation-inline-size);
				}

				@media (max-width: 864px) {
					inset-inline-start: 0;
					inline-size: 100vi;
				}

				@media (prefers-reduced-transparency: reduce) {
					backdrop-filter: none;
				}
			}

			h1 {
				font-size: inherit;
			}
		}

		#stages > header[data-sticky-breadcrumb~='position'] {
			--stickyBreadcrumb-position-minBlockSize: 4.25rem;
			--stickyBreadcrumb-position-insetBlockStart: 1rem;
			--stickyBreadcrumb-position-insetInlineStart: max(
				var(--scrollItem-inlineDetached-paddingStart),
				(
					anchor-size(--sticky-breadcrumb-position inline)
					- var(--scrollItem-inlineDetached-maxSize)
				)
				/ 2
			);

			z-index: var(---wallet-breadcrumb-layer-group);

			> [data-sticky-breadcrumb~='item'] {
				z-index: var(---wallet-breadcrumb-layer-group);

				&::before {
					animation: SectionHeadingArrowAnimation var(--transition-easeInOutExpo) forwards;
					animation-timeline: --sticky-breadcrumb-timeline;
					animation-range:
						var(---wallet-breadcrumb-animation-range-start)
						var(---wallet-breadcrumb-animation-range-end);
				}
			}
		}

		.attribute-group-heading-position[data-sticky-breadcrumb~='position'] {
			--stickyBreadcrumb-position-minBlockSize: 2.875rem;
			--stickyBreadcrumb-position-insetInlineStart: 0px;

			> [data-sticky-breadcrumb~='item'] {
				z-index: var(---wallet-breadcrumb-layer-group);
				position-visibility: always;

				h2 {
					animation: AttributeGroupBreadcrumbHeadingAnimation var(--transition-easeInOutExpo) both;
					animation-timeline: --sticky-breadcrumb-timeline;
					animation-range:
						var(---wallet-breadcrumb-animation-range-start)
						var(---wallet-breadcrumb-animation-range-end);
				}

				&::before {
					animation: SectionHeadingArrowAnimation var(--transition-easeInOutExpo) forwards;
					animation-timeline: --sticky-breadcrumb-timeline;
					animation-range:
						var(---wallet-breadcrumb-animation-range-start)
						var(---wallet-breadcrumb-animation-range-end);
				}
			}
		}

		.attribute-group-stack > header {
			.section-caption,
			.section-controls {
				animation: AttributeGroupHeadingCompanionAnimation var(--transition-easeInOutExpo) both;
				animation-timeline: --sticky-breadcrumb-timeline;
				animation-range:
					var(---wallet-breadcrumb-animation-range-start)
					var(---wallet-breadcrumb-animation-range-end);
			}
		}

		@keyframes AttributeGroupHeadingCompanionAnimation {
			to {
				visibility: hidden;
				opacity: 0;
			}
		}

		.attribute-heading-position[data-sticky-breadcrumb~='position'] {
			--stickyBreadcrumb-position-minBlockSize: 1.875rem;
			--stickyBreadcrumb-position-insetInlineStart: 0px;
			--stickyBreadcrumb-item-insetInlineEnd: calc(
				anchor(--wallet-breadcrumb-surface end)
					+ var(---wallet-content-inline-start)
					+ anchor-size(--sticky-breadcrumb-extra-position inline)
					+ var(---wallet-breadcrumb-gap)
					+ var(---wallet-breadcrumb-companion-inline-end-clearance)
			);

			@media (max-width: 864px) {
				--stickyBreadcrumb-item-blockOffset: calc(
					var(---wallet-breadcrumb-block-size)
					+ var(---wallet-breadcrumb-mobile-row-gap)
				);
				--stickyBreadcrumb-item-insetInlineStart: calc(
					anchor(--wallet-breadcrumb-surface start)
					+ var(---wallet-content-inline-start)
				);
				--stickyBreadcrumb-gap: 0px;
			}

			> [data-sticky-breadcrumb~='item'] {
				z-index: var(---wallet-breadcrumb-layer-attribute);
				min-inline-size: 0;

				h3 {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;

					animation:
						BreadcrumbHeadingIconSpaceAnimation var(--transition-easeInOutExpo) both;
					animation-timeline: --sticky-breadcrumb-timeline;
					animation-range:
						var(---wallet-breadcrumb-animation-range-start)
						var(---wallet-breadcrumb-animation-range-end);
				}

				&::before {
					animation:
						SectionHeadingArrowAnimation var(--transition-easeInOutExpo) forwards;
					animation-timeline: --sticky-breadcrumb-timeline;
					animation-range:
						var(---wallet-breadcrumb-animation-range-start)
						var(---wallet-breadcrumb-animation-range-end);
				}
			}
		}

		.attribute > details {
			.attribute-summary-companions-position {
				anchor-name: --sticky-breadcrumb-extra-position;
				inline-size: max-content;

				> .attribute-summary-companions {
					z-index: var(---wallet-breadcrumb-layer-attribute);
				}
			}

			&[open] .attribute-summary-companions {
				animation:
					AttributeBreadcrumbCompanionsAnimation var(--transition-easeInOutExpo) forwards,
					AttributeBreadcrumbCompanionsOutAnimation linear forwards;
				animation-timeline:
					--sticky-breadcrumb-timeline,
					--sticky-breadcrumb-scope-timeline;
				animation-range:
					var(---wallet-breadcrumb-animation-range-start)
					var(---wallet-breadcrumb-animation-range-end),
					var(---stickyBreadcrumb-exitAnimationRangeStart)
					var(---stickyBreadcrumb-exitAnimationRangeEnd);
			}

			&:not([open]) {
				.attribute-heading-position > [data-sticky-breadcrumb~='item'],
				.attribute-heading-position > [data-sticky-breadcrumb~='item']::before,
				.attribute-heading-position h3,
				.attribute-summary-companions,
				.attribute-icon,
				.attribute-icon::before,
				.attribute-icon::after {
					animation: none;
				}
			}
		}

		@keyframes AttributeBreadcrumbCompanionsAnimation {
			from {
				position: fixed;
				position-anchor: --sticky-breadcrumb-extra-position;
				inset-block-start: anchor(--sticky-breadcrumb-extra-position top);
				inset-inline: anchor(--sticky-breadcrumb-extra-position start) auto;
				translate: none;
			}
			to {
				position: fixed;
				position-anchor: --wallet-breadcrumb-surface;
				inset-block-start: var(---wallet-breadcrumb-companion-block-start);
				inset-inline:
					auto
					calc(
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
				position: fixed;
				opacity: 1;
			}
			99.999% {
				position: fixed;
			}
			to {
				visibility: hidden;
				position: static;
				opacity: 0;
				translate: none;
			}
		}

		@keyframes AttributeBreadcrumbOutAnimation {
			to {
				visibility: hidden;
				opacity: 0;
			}
		}

		:is(.attribute-group-icon, .attribute-icon) {
			---breadcrumb-slice-label-size: calc(
				anchor-size(--breadcrumb-slice-icon-position inline)
				* var(--slice-labelSize)
				/ (
					var(---slice-outer-r)
					- var(---slice-inner-r)
				)
			);

			anchor-name: --breadcrumb-slice-icon-position;
			anchor-scope: --breadcrumb-slice-icon-position;
			contain: style;

			&::before {
				z-index: inherit;
				display: inline-grid;
				place-items: center;
				line-height: 1;

				animation: BreadcrumbSliceIconAnimation var(--transition-easeInOutExpo) both;
				animation-timeline: --sticky-breadcrumb-timeline;
				animation-range:
					var(---wallet-breadcrumb-animation-range-start)
					var(---wallet-breadcrumb-animation-range-end);
			}

			&::after {
				animation: BreadcrumbSliceShapeAnimation var(--transition-easeInOutExpo) both;
				animation-timeline: --sticky-breadcrumb-timeline;
				animation-range:
					var(---wallet-breadcrumb-animation-range-start)
					var(---wallet-breadcrumb-animation-range-end);
			}
		}

		.attribute-group-icon {
			z-index: var(---wallet-breadcrumb-layer-group);
			---wallet-breadcrumb-icon-inline-start: calc(
				anchor(--wallet-breadcrumb-root end)
				+ var(---wallet-breadcrumb-gap)
			);
		}

		.attribute-icon {
			z-index: var(---wallet-breadcrumb-layer-attribute);
			---wallet-breadcrumb-icon-inline-start: calc(
				anchor(--wallet-breadcrumb-group end)
				+ var(---wallet-breadcrumb-gap)
			);
			animation: AttributeBreadcrumbOutAnimation linear both;
			animation-timeline: --sticky-breadcrumb-scope-timeline;
			animation-range:
				var(---stickyBreadcrumb-exitAnimationRangeStart)
				var(---stickyBreadcrumb-exitAnimationRangeEnd);
		}

		@keyframes BreadcrumbSliceIconAnimation {
			from {
				position: fixed;
				position-anchor: --breadcrumb-slice-icon-position;
				inset-block-start: calc(
					anchor(--breadcrumb-slice-icon-position top)
					+ (
						anchor-size(--breadcrumb-slice-icon-position block)
						/ 2
					)
					- (
						var(---breadcrumb-slice-label-size)
						/ 2
					)
				);
				inset-inline-start: calc(
					anchor(--breadcrumb-slice-icon-position start)
					+ (
						anchor-size(--breadcrumb-slice-icon-position inline)
						* (
							var(---slice-outer-r)
							- var(--slice-labelR)
						)
						/ (
							var(---slice-outer-r)
							- var(---slice-inner-r)
						)
					)
					- (
						var(---breadcrumb-slice-label-size)
						/ 2
					)
				);
				inline-size: var(---breadcrumb-slice-label-size);
				block-size: var(---breadcrumb-slice-label-size);
				translate: none;
			}
			to {
				position: fixed;
				position-anchor: --sticky-breadcrumb-scope;
				inset-block-start: var(---wallet-breadcrumb-icon-block-start);
				inset-inline-start: var(---wallet-breadcrumb-icon-inline-start);
				inline-size: var(---wallet-breadcrumb-heading-icon-size);
				block-size: var(---wallet-breadcrumb-heading-icon-size);
				font-size: var(---wallet-breadcrumb-heading-icon-size);
				filter: none;
				translate: none;
			}
		}

		@keyframes BreadcrumbSliceShapeAnimation {
			to {
				opacity: 0;
			}
		}

		@keyframes BreadcrumbHeadingIconSpaceAnimation {
			to {
				font-size: var(---wallet-breadcrumb-attribute-font-size);
				margin-inline-start: calc(
					var(---wallet-breadcrumb-heading-icon-size)
					+ var(---wallet-breadcrumb-heading-icon-gap)
				);
			}
		}

		@keyframes AttributeGroupBreadcrumbHeadingAnimation {
			to {
				font-size: var(---wallet-breadcrumb-group-font-size);
				margin-inline-start: calc(
					var(---wallet-breadcrumb-heading-icon-size)
					+ var(---wallet-breadcrumb-heading-icon-gap)
				);
			}
		}

		@keyframes WalletNameAnimation {
			from {
				--wallet-icon-size: var(---wallet-name-flow-icon-size);
				--wallet-breadcrumb-surface-opacity: 0;
				position: fixed;
				inset-block-start: anchor(--wallet-title-flow-position top);
				inset-inline-start: anchor(--wallet-title-flow-position start);
				margin-inline-start: 0;
				font-size: var(---wallet-name-flow-font-size);
			}
			to {
				--wallet-icon-size: var(---wallet-name-sticky-icon-size);
				--wallet-breadcrumb-surface-opacity: 1;
				position: fixed;
				inset-block-start: var(---wallet-icon-sticky-block-start);
				inset-inline-start: calc(
					var(--sticky-insetInlineStart)
						+ var(---wallet-content-inline-start)
				);
				margin-inline-start: 0;
				font-size: var(---wallet-breadcrumb-root-font-size);
			}
		}

		@media (max-width: 864px) {
			.container {
				--stickyBreadcrumb-trackBlockEnd: calc(
					var(---wallet-icon-sticky-block-start)
					+ 2 * var(---wallet-breadcrumb-block-size)
					+ var(---wallet-breadcrumb-mobile-row-gap)
					+ var(---wallet-breadcrumb-surface-fade)
				);
				---wallet-breadcrumb-companion-block-start: calc(
					anchor(--wallet-breadcrumb-surface top)
					+ var(---wallet-breadcrumb-block-size)
					+ var(---wallet-breadcrumb-mobile-row-gap)
					+ var(---wallet-breadcrumb-block-size) / 2
				);
			}

			article > header#top .wallet-name::after {
				block-size: calc(
					2 * var(---wallet-sticky-content-inset)
					+ 2 * var(---wallet-breadcrumb-block-size)
					+ var(---wallet-breadcrumb-mobile-row-gap)
					+ 2 * var(---wallet-breadcrumb-surface-fade)
				);
			}

			.attribute-icon {
				---wallet-breadcrumb-icon-block-start: calc(
					anchor(--sticky-breadcrumb-scope top)
					+ var(---wallet-breadcrumb-block-size)
					+ var(---wallet-breadcrumb-mobile-row-gap)
					+ (
						var(---wallet-breadcrumb-block-size)
						- var(---wallet-breadcrumb-heading-icon-size)
					)
					/ 2
				);
				---wallet-breadcrumb-icon-inline-start: calc(
					anchor(--wallet-breadcrumb-surface start)
					+ var(---wallet-content-inline-start)
				);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			article > header#top .wallet-name {
				animation: none;
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		article a:has(> h2),
		article a:has(> h2)::before {
			animation: none;
		}
	}

	.wallet-name {
		h1 {
			font-size: var(---wallet-name-flow-font-size);
		}
	}

	.wallet-icon {
		width: var(--wallet-icon-size);
		height: var(--wallet-icon-size);
		filter: drop-shadow(0 0 0.5rem rgba(255, 255, 255, 0.1));
	}

	.wallet-overview {
		font-size: 0.9rem;
	}

	.platforms-label {
		color: var(--accent);
	}

	#news {
		> header {
			padding-block: 1.2rem;
		}
	}

	#stages {
		> header {
			padding-block: 1.2rem;
		}
	}

	.attribute-group {
		> .attribute-group-stack[data-scroll-item] {
			/*
			 * `inline-detached` uses sticky positioning for horizontal
			 * alignment by default. This wrapper scrolls normally so its
			 * fixed breadcrumb descendants can participate in the page-level
			 * root/group/attribute stacking order.
			 */
			position: relative;
			inset-inline: auto;
		}

		> .attribute-group-stack[data-scroll-item] > header[data-scroll-item] {
			--icon-filter: brightness(0) opacity(0.35);
			position: relative;
			inset-inline: auto;
			min-inline-size: 0;
			padding-block: 1rem;

			&:has(a:is(:hover, :focus-visible, :interest-source)),
			.attribute-group:interest-target > & {
				--icon-filter: none;
			}

			.attribute-group-summary-layout a:is(:hover, :focus-visible, :interest-source),
			.attribute-group:interest-target > & .attribute-group-summary-layout a {
				color: var(--accent);
				text-decoration: none;
			}

			> .attribute-group-icon {
				--icon-size: 4.125em;
				flex: none;

				&::before {
					line-height: 1;
					filter: var(--icon-filter);
					transition-property: filter;
				}
			}

			> .attribute-group-summary-layout {
				min-inline-size: 0;
				gap: 0.5rem;

				> .attribute-group-heading {
					flex: 1 1 16rem;
					min-inline-size: 0;
				}

				> :not(.attribute-group-heading) {
					flex: none;
				}
			}

			h2 {
				font-size: 1.8rem;
				font-weight: 700;
			}

			.section-controls {
				display: flex;
				align-items: center;
				gap: 1rem;

				.section-score {
					display: flex;
					align-items: center;
					gap: 0.25rem;
					padding: 0.5rem 1.15rem;
					border-radius: var(--border-radius);
					font-weight: 500;
					color: white;
					font-size: 0.9rem;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
					background-color: var(--accent, transparent);

					.unrated-hint {
						cursor: help;
					}
				}
			}
		}

		.section-caption {
			opacity: 0.8;
			color: var(--text-secondary);
			text-wrap: pretty;

			:global(p) {
				margin: 0;
			}
		}
	}

	.attribute {
		position: relative;

		> details > summary > header {
			--icon-filter: brightness(0) opacity(0.35);
			min-inline-size: 0;

			&:has(a:is(:hover, :focus-visible, :interest-source)),
			.attribute:interest-target & {
				--icon-filter: none;
			}

			a:is(:hover, :focus-visible, :interest-source),
			.attribute:interest-target & a:has(h3) {
				color: var(--accent);
				text-decoration: none;
			}

			> [data-row-item~='flexible'] {
				min-inline-size: 0;
			}

			.attribute-icon {
				--icon-size: 3.3em;
				flex: none;

				&::before {
					line-height: 1;
					filter: var(--icon-filter);
					transition-property: filter;
				}
			}
		}

		> details {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			min-inline-size: 0;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
			contain: style;

			> summary {
				min-inline-size: 0;
				max-inline-size: 100%;

				> header {
					> .attribute-summary-layout {
						min-inline-size: 0;
						gap: 0.5rem;

						> .attribute-heading {
							min-inline-size: 0;

							h3 {
								font-size: var(---wallet-attribute-heading-font-size);
								font-weight: 600;
							}
						}

						> :not(.attribute-heading) {
							flex: none;
						}
					}
				}
			}

			.subsection-caption {
				opacity: 0.8;
				color: var(--text-secondary);
				text-wrap: pretty;

				:global(p) {
					margin: 0;
				}
			}

			.attribute-rating-details {
				&:is(ul) {
					--list-markerGap: 1em;
				}

				background-color: color-mix(in srgb, var(--accent) 5%, var(--background-secondary));
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

				color: var(--text-secondary);
				font-weight: 500;

				&[data-rating='exempt'] {
					opacity: 0.7;
				}
			}

			.variant-caption {
				color: var(--text-secondary);
				font-style: italic;
				font-size: 0.9rem;
				opacity: 0.7;
			}

			.impact {
				color: var(--text-secondary);
			}
		}
	}

	.not-implemented {
		opacity: 0.7;
	}

	.attribute-rating-methodology {
		h5 {
			font-size: 1rem;
			font-weight: 600;
		}
	}

	.attribute-accordions {
		---attribute-accordion-sticky-inset: calc(
			var(---wallet-page-block-offset)
			+ var(---wallet-sticky-content-inset)
			+ var(---wallet-breadcrumb-block-size)
			+ var(---wallet-breadcrumb-surface-fade)
		);
		@media (min-width: 865px) {
			---attribute-accordion-sticky-inset: calc(
				var(---wallet-page-block-offset)
				+ 2 * var(---wallet-sticky-content-inset)
				+ var(---wallet-breadcrumb-block-size)
				+ var(---wallet-breadcrumb-surface-fade)
			);
		}

		details {
			--sticky-marginBlockStart: var(---attribute-accordion-sticky-inset);

			overflow: visible;

			summary {
				--sticky-backgroundColor: var(--background-secondary);

				h4 {
					max-width: 60ch;
					word-wrap: break-word;
					overflow-wrap: break-word;
				}
			}

			section {
				overflow: hidden;

				p {
					word-wrap: break-word;
					overflow-wrap: break-word;
				}
			}
		}
	}
</style>
