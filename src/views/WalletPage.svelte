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

	function attachDetailsCommands(root: HTMLElement) {
		queueMicrotask(() => {
			for (const detail of root.querySelectorAll<HTMLDetailsElement>(':scope > article details'))
				detail.open = true
		})

		const detailsForCommand = (command: string) => {
			if (command === '--toggle-page-details')
				return root.querySelectorAll<HTMLDetailsElement>(':scope > article details')

			if (command !== '--toggle-group-details') return []

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
				?? root.querySelector('.attribute-group')
			)

			return currentGroup?.querySelectorAll<HTMLDetailsElement>('details') ?? []
		}

		const runCommand = (command?: string) => {
			if (!command) return

			const details = Array.from(detailsForCommand(command))
			const open = details.some(detail => !detail.open)

			for (const detail of details)
				detail.open = open
		}

		const handleCommand = (event: Event) => {
			runCommand((event as Event & { command?: string }).command)
		}

		root.addEventListener('command', handleCommand)

		const handleClick = (event: MouseEvent) => {
			const button = event.target instanceof Element
				? event.target.closest<HTMLButtonElement>('button[commandfor="wallet-page"]')
				: null

			if (!button) return

			/* An invoker cannot reliably target its own ancestor. Keep the native
			 * command markup as the baseline and own this irreducible case. */
			event.preventDefault()
			runCommand(button.getAttribute('command') ?? undefined)
		}

		root.addEventListener('click', handleClick)

		return () => {
			root.removeEventListener('command', handleCommand)

			root.removeEventListener('click', handleClick)
		}
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
	import ListCollapseIcon from 'lucide-static/icons/list-collapse.svg?raw'
	import Rows3Icon from 'lucide-static/icons/rows-3.svg?raw'
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
	{@attach attachDetailsCommands}
>
	<div class="wallet-icon-layer" aria-hidden="true">
		<img
			alt=""
			src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
		/>
	</div>

	<article
		data-column="gap-8"
	>
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

		<header
			id="top"
			data-column="gap-6"
			data-scroll-item="inline-detached padding-match-start"
		>
			<div data-row="wrap">
				<div data-row="wrap">
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

		<div class="details-controls-layer" data-sticky-container>
			<menu
				class="details-controls"
				data-sticky="block-start backdrop-before backdrop-stuck"
				data-row="gap-2"
				aria-label="Expand or collapse rating details"
			>
				<li>
					<button
						type="button"
						data-icon="circle"
						commandfor="wallet-page"
						command="--toggle-group-details"
						aria-label="Expand or collapse details in the current attribute group"
						title="Toggle current group details"
					>
						<span>{@html ListCollapseIcon}</span>
					</button>
				</li>

				<li>
					<button
						type="button"
						data-icon="circle"
						commandfor="wallet-page"
						command="--toggle-page-details"
						aria-label="Expand or collapse all details on this page"
						title="Toggle all page details"
					>
						<span>{@html Rows3Icon}</span>
					</button>
				</li>
			</menu>
		</div>
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

		<hr
			class="attribute-group-timeline"
			style:---pie-timeline={pieTimelineByHref.get(`#${slugifyCamelCase(attrGroup.id)}`)}
		/>

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
				<a
					data-link="camouflaged"
					href={`#${slugifyCamelCase(attrGroup.id)}`}
					interestfor={slugifyCamelCase(attrGroup.id)}
				>
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
		>
			<summary data-row>
				<header data-row="start gap-3">
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
						style:--slice-labelR={sliceStyle?.labelR}
					></span>

					<div data-row-item="flexible basis-2" data-column="gap-2">
						<div data-row="start gap-2 wrap">
							<a
								data-link="camouflaged"
								href={`#${slugifyCamelCase(attribute.id)}`}
								interestfor={slugifyCamelCase(attribute.id)}
							>
								<h3
									title={formatAttributeTitleText(evalAttr)}
								>
									{attribute.displayName}
								</h3>
							</a>

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
				</header>
			</summary>
			<div class="attribute-content">

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
				<details open data-card="padding-5 secondary radius-4" data-column="gap-0">
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

				<details open data-card="secondary padding-5 radius-4" data-column="gap-0">
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
					<details open data-card="secondary padding-5 radius-4" data-column="gap-0">
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
			</div>
		</details>
	</section>
{/snippet}


<style>
	.container {
		--wallet-icon-size: 3rem;
		---wallet-icon-sticky-block-start: 1rem;
		---wallet-icon-sticky-inline-start: max(
			var(--scrollItem-inlineDetached-paddingStart),
			(100% - var(--scrollItem-inlineDetached-maxSize)) / 2
		);
		---wallet-name-sticky-icon-size: 2rem;
		---wallet-name-sticky-font-size: 1.125rem;
		---wallet-breadcrumb-gap: 1.5rem;
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
			/ minmax(0, 1fr) auto
		;
		@media (max-width: 1024px) {
			&[data-sticky-container] {
				--sticky-marginInlineStart: var(--nav-width);
				--sticky-marginInlineEnd: 0px;
			}

			grid-template:
				'Nav Content'
				/ auto minmax(0, 1fr)
			;
		}
		@media (max-width: 864px) {
			---wallet-name-sticky-icon-size: 2.4rem;
			---wallet-name-sticky-font-size: 1.3rem;
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

		line-height: 1.6;

		position: relative;

		article {
			grid-area: Content;
			position: relative;

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
			anchor-name: --wallet-page-navigation;

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

			:global(.toc-icon::before) {
				line-height: 1;
				filter: var(--icon-filter);
				transition-property: filter;
			}

			@media (max-width: 864px) {
				display: contents;
				background: none;
				box-shadow: none;

				> header,
				> nav:not(.pie-navigation) {
					z-index: 6;
					position: fixed;
					inset-inline: 0 auto;
					inline-size: var(--nav-width);
					translate: -100% 0;
					transition: translate 0.3s var(--ease-out-expo);
					background-color: var(--background-secondary);
				}

				> header {
					inset-block: calc(var(--navigation-mobile-blockSize) + 4rem) auto;
				}

				> nav:not(.pie-navigation) {
					inset-block:
						calc(var(--navigation-mobile-blockSize) + 4rem + var(--pageNavigation-header-blockSize))
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
		---anchor-navigation-width: 20rem;
		---anchor-button-size: 2.5rem;

		scroll-marker-group: after;
	}

	:global(#layout:has(#wallet-page))::scroll-marker-group {
		z-index: 4;
		position: fixed;
		inset-block: auto 0.75rem;
		inset-inline: auto calc(var(---anchor-button-size) + 1.5rem);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		inline-size: calc(
			var(---anchor-navigation-width)
			- 2 * (var(---anchor-button-size) + 1.5rem)
		);
		block-size: calc(var(---anchor-button-size) + 1rem);
		padding: 0.5rem;
		overflow-x: auto;
		overflow-y: clip;
		scroll-snap-type: inline mandatory;
		scrollbar-width: none;
		border-radius: 100vmax;
		background-color: color-mix(
			in oklch,
			var(--background-primary) 82%,
			transparent
		);
		box-shadow: 0 0 var(--separator-width) var(--border-color);
		backdrop-filter: blur(1rem);
		transition: scroll-snap-type 0s 500ms allow-discrete;
	}

	:global(#layout:has(#wallet-page))::scroll-marker-group:is(
		:hover,
		:focus-within,
		:active
	) {
		scroll-snap-type: none;
		transition-delay: 0s;
	}

	:global(#layout:has(#wallet-page))::scroll-marker-group::-webkit-scrollbar {
		display: none;
	}

	:global(#wallet-page :is(.attribute-group, .attribute))::scroll-marker {
		content: '' / attr(aria-label);
		flex: 0 0 auto;
		box-sizing: border-box;
		inline-size: var(---anchor-button-size);
		block-size: var(---anchor-button-size);
		border: var(--separator-width) solid var(--border-color);
		border-radius: 50%;
		background-color: var(--background-secondary);
		transition-property: scale, background-color, border-color;
	}

	:global(#wallet-page :is(.attribute-group, .attribute))::scroll-marker:target-current {
		scroll-snap-align: center;
	}

	:global(#wallet-page :is(.attribute-group, .attribute))::scroll-marker:is(
		:hover,
		:focus-visible,
		:target-current
	) {
		background-color: var(--background-tertiary);
		border-color: var(--text-secondary);
		scale: 1.08;
	}

	:global(#layout:has(#wallet-page))::scroll-button(block-start),
	:global(#layout:has(#wallet-page))::scroll-button(block-end) {
		z-index: 5;
		position: fixed;
		inset-block: auto 1.25rem;
		box-sizing: border-box;
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
		&:is(:hover, :focus-visible) {
			background-color: var(--background-tertiary);
			border-color: var(--text-secondary);
			scale: 1.05;
		}

		&:disabled {
			opacity: 0.38;
		}
	}

	:global(#layout:has(#wallet-page))::scroll-button(block-start) {
		inset-inline: auto calc(
			var(---anchor-navigation-width)
			- var(---anchor-button-size)
			- 0.75rem
		);
		content: '↑' / 'Scroll toward the previous rating section';

	}

	:global(#layout:has(#wallet-page))::scroll-button(block-end) {
		inset-inline: auto 0.75rem;
		content: '↓' / 'Scroll toward the next rating section';

	}

	@media (max-width: 1024px) {
		:global(#layout:has(#wallet-page))::scroll-marker-group {
			inset-inline: calc(var(---anchor-button-size) + 1.5rem) auto;

		}

		:global(#layout:has(#wallet-page))::scroll-button(block-start) {
			inset-inline: 0.75rem auto;

		}

		:global(#layout:has(#wallet-page))::scroll-button(block-end) {
			inset-inline: calc(
				var(---anchor-navigation-width)
				- var(---anchor-button-size)
				- 0.75rem
			) auto;

		}
	}

	@media (max-width: 864px) {
		:global(#layout:has(#wallet-page)) {
			scroll-marker-group: none;
		}

		:global(#layout:has(#wallet-page))::scroll-button(block-start),
		:global(#layout:has(#wallet-page))::scroll-button(block-end) {
			content: none;
		}
	}

	.details-controls-layer {
		position: absolute;
		inset: 0;
		z-index: 4;
		pointer-events: none;
	}

	.details-controls {
		--icon-size: 2.75rem;
		--icon-navigation-borderColor: var(--border-color);
		--icon-navigation-color: var(--text-primary);
		--sticky-insetBlockStart: calc(100dvb - 4.75rem);
		--sticky-insetInlineEnd: 1rem;

		position: sticky;
		inset-inline: auto 1rem;
		inline-size: max-content;
		margin: 0;
		margin-inline-start: auto;
		padding: 0.5rem;
		border-radius: 100vmax;
		list-style: none;
		background-color: color-mix(
			in oklch,
			var(--background-primary) 82%,
			transparent
		);
		box-shadow: 0 0 var(--separator-width) var(--border-color);
		backdrop-filter: blur(1rem);
		pointer-events: auto;

		> li {
			display: contents;
		}

		button {
			background-color: var(--background-secondary);
			transition-property: color, background-color, border-color, scale;

			&:is(:hover, :focus-visible) {
				background-color: var(--background-tertiary);
				border-color: var(--text-secondary);
				scale: 1.05;
			}
		}

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

	.pie-navigation {
		display: none;
	}

	@supports (clip-path: shape(from 0 0, line to 1px 1px, close)) {
		:is(.toc-icon, .attribute-icon) {
			---slice-total-angle: calc(var(--slice-totalAngle) * 1deg);
			---slice-gap: var(--slice-gap);
			---slice-outer-r: var(--slice-outerR);
			---slice-inner-r: var(--slice-innerR);
			---slice-outer-corner-radius: var(--slice-outerCornerRadius, calc(var(--slice-gap) / 2));
			---slice-inner-corner-radius: var(--slice-innerCornerRadius, calc(var(--slice-gap) / 2));

			position: relative;
			isolation: isolate;
			border: 0;
			border-radius: 0;
			background: transparent;
			overflow: visible;

			&::before {
				position: relative;
				z-index: 1;
				font-size: calc(var(--icon-size) * 0.55);
			}

			&::after {
				content: '';
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
					var(--icon-size) * 0.55
					/ var(--slice-labelSize)
				);
				---slice-origin: calc(var(---slice-outer-r) * var(---slice-unit));
				---slice-scaled-label-r: calc(
					var(--slice-labelR)
					* var(---slice-unit)
				);
				---slice-scaled-offset: calc(
					var(--slice-offset)
					* var(---slice-unit)
				);

				display: block;
				position: absolute;
				inset-inline-start: calc(
					50%
					+ var(---slice-scaled-label-r)
					- var(---slice-origin)
				);
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
			---pie-size: var(--nav-width);

			box-sizing: border-box;
			--sticky0-insetBlockStart: calc(var(---pie-size) + 0.5rem);
			--sticky-insetBlockStart: var(--sticky0-insetBlockStart);
		}

		.container .page-navigation > .pie-navigation[data-sticky][data-sticky] {
			/* Match Pie's inline-configured view box, including its padding. */
			---pie-diameter: calc(2 * (var(--pie-maxR) + var(--pie-padding)));
			---pie-origin-x: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
			---pie-origin-y: calc((var(--pie-maxR) + var(--pie-padding)) * 1px);
			---pie-size: var(--nav-width);
			/* 20rem / (240px / 16px-per-rem). Length division is not yet in Firefox. */
			---pie-scale: calc(20 / (var(---pie-diameter) / 16));
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
			--sticky-backgroundColor: var(--background-secondary);
			--sticky-backdropFilter: blur(1rem);

			.pie-navigation-geometry {
				position: relative;
				inline-size: var(---pie-size);
				block-size: var(---pie-size);
				margin-inline: auto;
			}

			:global(.navigation-items) {
				position: absolute;
				inset: 50% auto auto 50%;
				inline-size: calc(var(---pie-diameter) * 1px);
				block-size: calc(var(---pie-diameter) * 1px);
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
				--slice-labelSize: 20;
				---slice-label-offset: calc(var(---slice-label-r) * 1px);
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
				---slice-label-offset: calc(var(---slice-label-r) * 1px);
				--slice-arcSize: small;
			}

			/* Firefox lacks typed length division/multiplication outside shape(). */
			@supports not (top: calc(sibling-index() * 1px)) {
				:global(.navigation-items summary > a) {
					---slice-label-offset: 39.4201px;
				}

				:global(.navigation-items menu[data-navigation-depth='1'] > li > a) {
					---slice-label-offset: 90.99px;
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
				transition-property: opacity, transform;
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
				filter: contrast(0.5) brightness(3) opacity(0.7)
					drop-shadow(1px 2px 3px rgb(0 0 0 / 0.15));
				transition-property: rotate, filter;
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
				---pie-size: 6rem;
				---pie-surface-size: 4.25rem;
				---pie-scale: calc(6 / (var(---pie-diameter) / 16));
				---pie-target-angle: 0.5turn;

				grid-area: Content;
				justify-self: stretch;
				inset-block-start: calc(var(--navigation-mobile-blockSize) + 0.125rem);
				overflow: clip;

				.pie-navigation-geometry {
					margin-inline: auto 1rem;
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

	@property --wallet-icon-size {
		syntax: "<length>";
		inherits: true;
		initial-value: 0;
	}

	.wallet-icon-layer {
		display: none;
	}

	article {
		display: grid;
		grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
		gap: 2rem 0.75rem;
		padding-block-start: 2rem;
		min-inline-size: 0;

		> :not(.wallet-name) {
			grid-column: 1 / -1;
			min-inline-size: 0;
		}

		> .wallet-name,
		> header#top {
			grid-row: 1;
		}

		> .wallet-name {
			z-index: 2;
			grid-column: 1;
			align-self: start;
			inline-size: max-content;
			margin-inline-start: var(--scrollItem-inlineDetached-paddingStart);
		}

		> header#top {
			display: grid;
			grid-template-columns: subgrid;

			> * {
				grid-column: 1 / -1;
			}

			> :first-child {
				grid-column: 2;
			}
		}
	}

	@media (max-width: 864px) {
		article {
			padding-block-start: calc(var(--navigation-mobile-blockSize) + 1rem);
		}
	}

	@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%)) {
		.attribute-group-timeline,
		.attribute > details > summary {
			view-timeline-name: var(---pie-timeline, none);
			view-timeline-axis: block;
		}

		.wallet-icon-layer {
			display: block;
			z-index: 2;
			grid-area: Content;
			pointer-events: none;

			animation: WalletPageIconLayerAnimation linear both;
			animation-timeline: --header-timeline;
			animation-range: exit 0% exit 120%;

			> img {
				display: block;
				position: sticky;
				inset-block-start: var(---wallet-icon-sticky-block-start);
				inline-size: 2.25rem;
				block-size: 2.25rem;
				margin-inline-start: var(---wallet-icon-sticky-inline-start);
			}
		}

		article {
			> header#top {
				view-timeline-name: --header-timeline;
				view-timeline-axis: block;
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
		article > .wallet-name {
			anchor-name: --wallet-name;
			font-size: 2.25rem;

			animation: WalletNameAnimation var(--transition-easeOutExpo) both;
			animation-timeline: --header-timeline;
			animation-range: exit 0% exit 120%;

			h1 {
				font-size: inherit;
			}
		}

		.wallet-icon-layer {
			display: none;
		}

		article section:has(> header[data-sticky]) {
			anchor-scope: --wallet-section-heading;
		}

		article section > header[data-sticky] {
			anchor-name: --wallet-section-heading;
			z-index: 4;
			view-timeline-name: --wallet-section-heading-timeline;
			view-timeline-axis: block;

			animation: AnchoredSectionHeaderAnimation step-start both;
			animation-timeline: --wallet-section-heading-timeline;
			animation-range: entry calc(100vh - 6rem) entry calc(100vh - 3rem);

			> a:has(> h2) {
				z-index: 6;

				animation: AnchoredSectionHeadingAnimation var(--transition-easeInOutExpo) both;
				animation-timeline: --wallet-section-heading-timeline;
				animation-range: entry calc(100vh - 6rem) entry calc(100vh - 3rem);

				&::before {
					content: '› ';
					opacity: 1;
					animation: none;
				}
			}
		}

		@keyframes AnchoredSectionHeaderAnimation {
			from {
				min-block-size: auto;
			}
			to {
				min-block-size: 4.25rem;
			}
		}

		@keyframes WalletNameAnimation {
			from {
				--wallet-icon-size: 3rem;
				z-index: 2;
				position: relative;
				inset: auto;
			}
			0.001% {
				z-index: 7;
				position: sticky;
				inset-block-start: var(---wallet-icon-sticky-block-start);
			}
			to {
				--wallet-icon-size: var(---wallet-name-sticky-icon-size);
				z-index: 7;
				position: sticky;
				inset-block-start: var(---wallet-icon-sticky-block-start);
				font-size: var(---wallet-name-sticky-font-size);
			}
		}

		@keyframes AnchoredSectionHeadingAnimation {
			from {
				position: static;
				position-anchor: auto;
				inset: auto;
				margin-inline-start: 0;
			}
			0.001% {
				position: fixed;
				position-anchor: --wallet-section-heading;
				inset-block-start: calc(anchor(top) + 1rem);
				inset-inline-start: anchor(start);
				margin-inline-start: 0;
			}
			to {
				position: fixed;
				position-anchor: --wallet-section-heading;
				inset-block-start: calc(anchor(top) + 1rem);
				inset-inline-start: anchor(--wallet-name end);
				margin-inline-start: var(---wallet-breadcrumb-gap);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			article > .wallet-name {
				animation: none;
			}

			article section > header[data-sticky],
			article section > header[data-sticky] > a:has(> h2) {
				animation: none;
			}
		}
	}

	@media (max-width: 1024px) {
		.container {
			---wallet-icon-sticky-block-start: calc(var(--navigation-mobile-blockSize) + 1rem);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.wallet-icon-layer,
		article a:has(> h2),
		article a:has(> h2)::before {
			animation: none;
		}

		.wallet-icon-layer {
			display: none;
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
		scroll-margin-top: 3.5rem;

		> header {
			padding-block: 1rem;

			> a:is(:hover, :focus-visible, :interest-source),
			.attribute-group:interest-target > & > a {
				color: var(--accent);
				text-decoration: none;
			}

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
				min-inline-size: 0;
				max-inline-size: 100%;

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

			> .attribute-content {
				display: grid;
				min-inline-size: 0;
				max-inline-size: 100%;
				gap: 1.5rem;
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
		details {
			overflow: hidden;

			summary {
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
