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

	let highlightedAttributeId = $state<string | null>(
		null
	)

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
	import Pie, { PieLayout } from '@/components/Pie.svelte'
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
	class="container"
	data-sticky-container
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
				<div data-row="wrap">
					<a
						data-link="camouflaged"
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
									<WalletStageSummary {wallet} {ladders} {stage} {ladderEvaluation} />
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

			<section id="stages">
				<header
					data-sticky="block backdrop-before backdrop-stuck"
					data-row
					data-scroll-item="inline-detached"
				>
					<a data-link="camouflaged" href="#stages">
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
		<header
			data-sticky="block backdrop-self backdrop-always"
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
				items={tocNavigationItems}
				showSearch={false}
				defaultOpen
				ariaLabel="Table of contents"
				afterLabelSnippet={navigationBadgeSnippet}
			>
				{#snippet iconSnippet(item: NavigationItem, depth: number)}
					{#if item.icon}
						<span
							class="toc-icon"
							data-icon="circle filled wbicons emoji {item.icon}"
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

		<hr />

		<section
			class="attribute-group"
			id={slugifyCamelCase(attrGroup.id)}
			aria-label={attrGroup.displayName}
			data-score={scoreLevel}
			style:--accent={scoreColor}
		>
			<header
				data-sticky="block backdrop-before backdrop-stuck"
				data-row
				data-scroll-item="inline-detached"
			>
				<a data-link="camouflaged" href={`#${slugifyCamelCase(attrGroup.id)}`}>
					<h2 title={formatAttributeGroupTitleText(attrGroup, score, showScores)}>
						{attrGroup.displayName}
					</h2>
				</a>

				{#if showScores}
					<ScoreBadge {score} size="medium" />
				{/if}
			</header>

			<div
				data-scroll-item="inline-detached padding-match-end"
				data-column
			>
				{#if attrGroup.perWalletQuestion}
					<div class="section-caption">
						<Typography
							content={attrGroup.perWalletQuestion}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					</div>
				{/if}

				<div class="attributes-overview-container">
					<section
						class="attributes-overview"
						data-card="radius-8"
						data-row="wrap"
					>
						<div
							class="attributes-pie"
							data-row-item="wrap-center"
						>
							<span
								class="attributes-pie-icon"
								data-icon="wbicons emoji {attrGroup.icon}"
								aria-hidden="true"
							></span>

							<Pie
								title={formatAttributeGroupTitleText(attrGroup, score, showScores)}

								layout={PieLayout.FullTop}
								radius={120}
								padding={20}
								levels={[{
									outerRadiusFraction: 0.95,
									innerRadiusFraction: 0.125,
									gap: 8,
									angleGap: 0,
									outerCornerRadius: 24,
									innerCornerRadius: 24,
								}]}

								slices={
									attributes
										.map(({ attribute, evalAttr, weight }) => ({
											id: attribute.id,
											color: ratingToColor(evalAttr.evaluation.outcome.rating),
											weight,
											arcLabel: '',
											arcIconId: evalAttr.attribute.icon,
											titleText: formatAttributeTitleText(evalAttr),
											href: `#${slugifyCamelCase(attribute.id)}`,
										}))
								}
								highlightedSliceId={highlightedAttributeId}
								onSliceMouseEnter={id => {
									highlightedAttributeId = id
								}}
								onSliceMouseLeave={() => {
									highlightedAttributeId = null
								}}
							>
								{#snippet centerContentSnippet()}
									<span
										class="pie-center-dot pie-center-dot-large"
										style:--pie-center-color={scoreColor}
										title={showScores && score?.hasUnratedComponent ? '*contains unrated components' : undefined}
									></span>
								{/snippet}
							</Pie>
						</div>

						<div
							class="attributes-list"
							data-row-item="flexible"
							data-column="gap-3"
						>
							<h3>Attributes</h3>

							<ul data-column="gap-2">
								{#each attributes as { attribute, evalAttr }}
									{@const attributeUrl = `#${slugifyCamelCase(attribute.id)}`}
									<li>
										<a
											data-link="camouflaged"
											href={attributeUrl}
											style:--accent={ratingToColor(evalAttr.evaluation.outcome.rating)}
											data-card="secondary padding-3"
											data-row="gap-2"
											data-highlighted={highlightedAttributeId === attribute.id ? '' : undefined}
											onmouseenter={() => {
												highlightedAttributeId = attribute.id
											}}
											onmouseleave={() => {
												highlightedAttributeId = null
											}}
										>
											<span data-row-item="flexible">{attribute.displayName}</span>
											<data
												data-badge="small"
												value={evalAttr.evaluation.outcome.rating}
											>{evalAttr.evaluation.outcome.rating}</data>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					</section>
				</div>

				<div class="attributes" data-column>
					{#each attributes as { attribute, evalAttr }}
						{@render attributeSnippet({
							attrGroupId: attrGroup.id,
							attribute,
							evalAttr,
						})}
					{/each}
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
		data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
	>
		<details
			data-card="radius-8 padding-0 border-accent"
			data-column="gap-0"
		>
			<summary data-row>
				<header data-row="wrap">
					<div data-row-item="flexible basis-2">
						<div data-row="start gap-2 wrap">
							<a data-link="camouflaged" href={`#${slugifyCamelCase(attribute.id)}`}>
								<h3
									title={formatAttributeTitleText(evalAttr)}
								>
									<span class="attribute-icon" data-icon="circle filled wbicons emoji {attribute.icon}"></span>
									{attribute.displayName}
								</h3>
							</a>

							{#if true}
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

									{#if stage && ladderEvaluation}
										<Tooltip
											buttonTriggerPlacement="behind"
											style="--accent: var(--accent-color)"
										>
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

											{#snippet TooltipContent()}
												<WalletStageSummary
													{wallet}
													{ladders}
													stage={stage}
													{ladderEvaluation}
													showNextStageCriteria={false}
												/>
											{/snippet}
										</Tooltip>
									{:else if stage}
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
						</div>

					</div>

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
						data-row-item="wrap-end"
						data-badge="medium"
						value={evalAttr.evaluation.outcome.rating}
					>{evalAttr.evaluation.outcome.rating}</data>
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

			<div class="attribute-accordions" data-column>
				<details data-card="padding-2 secondary radius-4" data-column="gap-0">
					<summary>
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

				<details data-card="secondary padding-0 radius-4" data-column="gap-0">
					<summary>
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
					<details data-card="secondary padding-0 radius-4" data-column="gap-0">
						<summary>
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
		</details>
	</section>
{/snippet}


<style>
	.container {
		--wallet-icon-size: 3rem;
		--border-radius-lg: 1rem;
		--border-radius: 0.5rem;
		--border-radius-sm: 0.25rem;
		--nav-width: 20rem;

		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 54rem;
			--scrollItem-inlineDetached-paddingStart: 2rem;
			--scrollItem-inlineDetached-maxPaddingMatchStart: 5rem;
			--scrollItem-inlineDetached-paddingEnd: 2rem;
			--scrollItem-inlineDetached-maxPaddingMatchEnd: 5rem;
			--sticky-marginInlineEnd: var(--nav-width);
		}

		display: grid;
		grid-template:
			'Content Nav'
			/ minmax(max-content, 1fr) auto
		;
		@media (max-width: 1024px) {
			&[data-sticky-container] {
				--sticky-marginInlineStart: var(--nav-width);
				--sticky-marginInlineEnd: 0px;
			}

			grid-template:
				'Nav Content'
				/ auto minmax(max-content, 1fr)
			;
		}
		@media (max-width: 864px) {
			&[data-sticky-container] {
				--sticky-marginInlineStart: 0px;
			}

			grid-template:
				[Nav-start]
				'Content'
				[Nav-end]
				/ [Nav-start] minmax(max-content, 1fr) [Nav-end]
			;
		}

		line-height: 1.6;

		position: relative;

		article {
			grid-area: Content;

			scroll-padding-block-start: 5rem;
			scroll-padding-block-end: 1rem;
		}

		.page-navigation {
			/* Nested scroll root: don't inherit page content's TOC clearance as sticky insets. */
			--sticky-marginInlineStart: 0px;
			--sticky-marginInlineEnd: 0px;
			--sticky-marginBlockStart: 0px;
			--sticky-marginBlockEnd: 0px;
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

			grid-area: Nav;
			z-index: 2;

			position: sticky;
			top: 0;
			align-self: start;
			width: var(--nav-width);
			height: 100cqb;

			scroll-behavior: smooth;

			background-color: var(--background-secondary);
			box-shadow: 0 0 var(--separator-width) var(--border-color);

			> header {
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

			> nav {
				position: relative;
				z-index: 0;
				align-content: stretch;
				min-block-size: max-content;
				padding: 0.75rem;

				&[data-sticky-container] {
					--sticky-marginBlockStart: var(--pageNavigation-header-blockSize);
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

			:global(.toc-icon[data-icon~='filled']::before) {
				line-height: 1;
				filter: var(--icon-filter);
				transition-property: filter;
			}

			@media (max-width: 864px) {
				top: calc(var(--navigation-mobile-blockSize) + 4rem);
				max-height: calc(100dvh - var(--navigation-mobile-blockSize) - 4rem);
				transition: translate 0.3s var(--ease-out-expo);
				translate: -100% 0;

				&:focus-within {
					translate: 0 0;
				}
			}
		}
	}

	a:has(> :is(h1, h2, h3)) {
		display: flex;
		align-items: center;
	}

	@property --wallet-icon-size {
		syntax: "<length>";
		inherits: true;
		initial-value: 0;
	}

	@supports (animation-timeline: scroll()) {
		article {
			> header#top {
				view-timeline-name: --header-timeline;
				view-timeline-axis: block;

				.wallet-name {
					position: static;

					.wallet-icon {
						position: sticky;
						position: absolute;
						top: 0;
						z-index: 2;

						transition-property: opacity;
						opacity: 1;

						animation: WalletIconAnimation var(--transition-easeOutExpo) both;
						animation-timeline: --header-timeline;
						animation-range: exit 0% exit 120%;
					}

					&:hover h1 img {
						opacity: 0.75;
					}
				}
			}

			a:has(> h2) {
				view-timeline-name: --heading-timeline;
				view-timeline-axis: block;

				animation: SectionHeadingAnimation var(--transition-easeInOutExpo) both;
				animation-timeline: view();
				animation-range: entry calc(100vh - 6rem) entry calc(100vh - 3rem);

				&::before {
					animation: SectionHeadingArrowAnimation var(--transition-easeInOutExpo) forwards;
					animation-timeline: --heading-timeline;
					animation-range: entry calc(100vh - 6rem) entry calc(100vh - 3rem);
				}
			}
		}

		@keyframes WalletIconAnimation {
			from {
				position: static;
				--wallet-icon-size: 3rem;
			}
			79% {
				opacity: 1;
				position: static;
				scale: 1;
			}
			80% {
				position: absolute;
				top: -5rem;
				scale: 0.25;
			}
			to {
				top: 1rem;
				--wallet-icon-size: 2.25rem;
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

	.wallet-name {
		h1 {
			font-size: 2.25rem;
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
		&:has(.attribute:nth-of-type(1)) { --attributesCount: 1; }
		&:has(.attribute:nth-of-type(2)) { --attributesCount: 2; }
		&:has(.attribute:nth-of-type(3)) { --attributesCount: 3; }
		&:has(.attribute:nth-of-type(4)) { --attributesCount: 4; }
		&:has(.attribute:nth-of-type(5)) { --attributesCount: 5; }
		&:has(.attribute:nth-of-type(6)) { --attributesCount: 6; }
		&:has(.attribute:nth-of-type(7)) { --attributesCount: 7; }
		&:has(.attribute:nth-of-type(8)) { --attributesCount: 8; }
		&:has(.attribute:nth-of-type(9)) { --attributesCount: 9; }

		timeline-scope: --AttributesViewTimeline;

		scroll-margin-top: 3.5rem;

		> header {
			padding-block: 1rem;

			&[data-sticky]::before {
				content: '';
				inset: -0.5rem -6rem;
				mask-image: linear-gradient(to top, transparent, white 0.5rem);
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
			font-style: italic;
		}
	}

	.attributes-overview {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

		transition-property: background-color;

		@container not scroll-state(stuck: none) {
			background-color: transparent;
		}

		> .attributes-pie {
			font-size: 2.5em;
		}

		> .attributes-pie > .attributes-pie-icon {
			display: none;
		}

		> .attributes-list {
			transition-property: translate, scale, opacity;

			@container not scroll-state(stuck: none) {
				translate: 0 -2rem;
				scale: 0.95;
				opacity: 0;
				pointer-events: none;
			}

			h3 {
				font-size: 1rem;
				font-weight: 700;
				margin: 0 0 0.5rem 0;
			}

			ul {
				list-style: none;
				margin: 0;
				padding: 0;

				li {
					display: contents;
					&::before {
						content: none;
					}
				}

				a {
					padding: 0.5rem;
					font-size: 0.875rem;

					&:hover,
					&[data-highlighted] {
						background-color: var(--background-tertiary);
					}

					&::before {
						content: '';
						width: 1em;
						height: 1em;
						border-radius: 50%;
						border: 1px solid var(--border-color);
						flex-shrink: 0;
						background-color: var(--accent);
					}
				}
			}

			.no-attributes {
				color: var(--text-secondary);
				font-style: italic;
				font-size: 0.875rem;
				text-align: center;
				padding: 2rem 0;
			}
		}
	}

	.pie-center-dot {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background-color: var(--pie-center-color);
	}

	@container (min-width: 1140px) {
		.attributes-overview-container {
			@supports (container-type: scroll-state) {
				container-type: scroll-state;
				position: sticky;
				top: -1rem;
			}
		}

		.attributes-pie {
			background-image: radial-gradient(circle closest-side, var(--background-secondary) 90%, transparent 90%);
			position: relative;

			animation:
				AttributesPieAngleAnimation steps(var(--attributesCount), jump-end) forwards,
				AttributesPieTransformAnimation var(--transition-easeOutExpo) both
			;
			animation-range:
				entry 50% exit 50%,
				entry 0% exit 100%
			;
			animation-timeline: --AttributesViewTimeline;

			> .attributes-pie-icon {
				position: absolute;
				inset: 0;
				display: grid;
				place-items: center;
				font-size: 2.5em;
				pointer-events: none;
				opacity: calc(var(--isTranslated, 0) * 0.1);
				scale: calc(0.85 + 0.15 * var(--isTranslated));
				filter: contrast(0.5) brightness(3) drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.15));

				transition-property: opacity, scale;

				@container not scroll-state(stuck: none) {
					opacity: 0;
					scale: 0.95;
				}
			}

			:global {
				> .pie-container {
					transition-property: translate, scale, opacity;
					transition-duration: 0.5s;
					translate: var(--translate);
					scale: var(--scale);
					opacity: var(--opacity);

					.slice {
						--slice-opacity: calc(1 - clamp(0, abs(var(--pie-slice-highlightIndex) - var(--i)), 1) * 0.5 * var(--isTransformed));
					}
				}
			}
		}

		@keyframes AttributesPieAngleAnimation {
			from {
				--isTransformed: 1;
				--pie-slice-highlightIndex: 0;
				--pie-rotate: 0turn;
			}
			to {
				--isTransformed: 1;
				--pie-slice-highlightIndex: var(--attributesCount);
				--pie-rotate: 1turn;
			}
			100% {
				--isTransformed: 0;
				--pie-rotate: 1turn;
			}
		}

		@keyframes AttributesPieTransformAnimation {
			0% {
				--isTranslated: 0;
				--translate: 0px 0px;
			}
			15% {
				--isTranslated: 1;
				--translate: calc(-50% - 1rem) calc(50vh - 50%);
			}

			72.5% {
				--translate: calc(-50% - 1rem) calc(50vh - 50%);
				--scale: 1;
				--opacity: 1;
			}
			87.5% {
				--opacity: 0;
			}
			100% {
				--scale: 0;
				--translate: 0 0;
			}
		}
	}

	.attributes {
		view-timeline: --AttributesViewTimeline block;

		position: relative;

		.attributes-pie {
			position: sticky;
			left: 0;
			top: 50vh;
			width: max-content;
			height: 0;
			translate: -50% -50%;
		}
	}

	.attribute {
		position: relative;

		a:has(.attribute-icon) {
			--icon-filter: brightness(0) opacity(0.35);

			&:hover {
				--icon-filter: none;
			}

			h3 {
				display: inline-flex;
				align-items: center;
				gap: 0.5rem;
			}

			.attribute-icon {
				--icon-size: 2.2em;

				&::before {
					line-height: 1;
					filter: var(--icon-filter);
					transition-property: filter;
				}
			}
		}

		> details {
			display: grid;
			scroll-margin-top: 3.5rem;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
			transition:
				box-shadow 0.2s ease,
				transform 0.2s ease;

			&:hover {
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
				transform: translateY(-1px);
			}

			> summary {
				padding: 1.5rem;

				> header {
					flex-grow: 1;

					> div {
						display: grid;
						gap: 0.5rem;

						h3 {
							font-weight: 600;
						}
					}
				}
			}

			&::details-content {
				padding: 1.5rem;
				padding-top: 0;

				display: grid;
				gap: 1.5rem;
			}

			&:not([open])::details-content {
				padding-block: 0;
			}

			.subsection-caption {
				opacity: 0.8;
				color: var(--text-secondary);
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
		details {
			overflow: hidden;

			summary {
				padding: 1.25rem;

				h4 {
					max-width: 60ch;
					word-wrap: break-word;
					overflow-wrap: break-word;
				}
			}

			section {
				padding: 1.25rem;
				padding-top: 0.25rem;
				overflow: hidden;

				p {
					word-wrap: break-word;
					overflow-wrap: break-word;
				}
			}
		}
	}
</style>
