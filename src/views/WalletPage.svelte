<script
	lang="ts"
	generics="
	_AttributeGroupId extends string
"
>
	import '../components/pie-shape.css'
	import { attributeGroupFlowerGradient, sliceFill } from '@/components/pie-fill'

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
	import { hasSingleVariant, Variant } from '@/schema/variants'
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
	import { variants, variantToName, variantToRunsOn } from '@/constants/variants'
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

	type WalletPageWallet<_AttributeGroupId extends string> = Omit<
		RatedWallet<_AttributeGroupId>,
		'ladders'
	> &
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
		showStage?: boolean
		showScores?: boolean
	} = $props()

	// State
	import { onMount } from 'svelte'
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import { isLabeledUrl } from '@/schema/url'
	import { IncidentStatus } from '@/types/content/news'
	import { daysSince } from '@/types/date'
	import { getNewsForWallet } from '@/data/news'

	let queryParams = $state<URLSearchParams>()

	$effect(() => {
		const queryString = queryParams?.toString()

		if (queryString !== undefined && queryString !== globalThis.location.search.slice(1))
			globalThis.history.replaceState(
				null,
				'',
				`${globalThis.location.pathname}${queryString ? `?${queryString}` : ''}${globalThis.location.hash}`,
			)
	})

	function currentNavigationLink(control: HTMLButtonElement) {
		if (!globalThis.CSS.supports('selector(:target-current)')) return

		return control
			.closest('[data-sticky-breadcrumb~="root"]')
			?.querySelector<HTMLAnchorElement>('.pie-navigation a:target-current')
	}

	function navigateAdjacentSection(control: HTMLButtonElement, direction: -1 | 1) {
		const current = currentNavigationLink(control)
		if (!current) return

		const links = Array.from(
			current.closest('.navigation-items')?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ??
				[],
		)
		links[links.indexOf(current) + direction]?.click()
	}

	function toggleCurrentSectionDetails(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
		const current = currentNavigationLink(event.currentTarget)
		if (!current) return

		const target = globalThis.document.getElementById(decodeURIComponent(current.hash.slice(1)))
		const details = Array.from(
			target?.closest('.attribute-group')?.querySelectorAll('details') ?? [],
		)
		const open = details.some(detail => !detail.open)

		for (const detail of details) detail.open = open
	}

	// Resolve link identity once per rendered evaluation; CSS owns every presentation state.
	function shareLinkDestinations(container: HTMLElement) {
		const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href]'))
		const destinations = new Map<string, number>()
		const localLinks = links.filter(link => {
			try {
				const url = new URL(link.href)
				return (
					url.origin === location.origin &&
					url.pathname === location.pathname &&
					url.search === location.search &&
					url.hash.length > 1
				)
			} catch {
				return false
			}
		})
		const counts = new Map<string, number>()
		for (const link of localLinks) counts.set(link.href, (counts.get(link.href) ?? 0) + 1)
		for (const [href, count] of counts) if (count > 1) destinations.set(href, destinations.size)
		const states = ['hover', 'focus', 'current'] as const
		const names = (index: number) => states.map(state => `--link-${state}-${index}`)
		container.style.setProperty(
			'--link-timelines',
			[...destinations.values()].flatMap(names).join(', '),
		)
		const paintOwners = new Map<HTMLElement, string | null>()
		const originals = localLinks.map(link => {
			const original = link.getAttribute('data-link')
			const index = destinations.get(link.href)
			let target: HTMLElement | null = null
			try {
				target = document.getElementById(decodeURIComponent(link.hash.slice(1)))
			} catch {
				/* Invalid fragments have no target. */
			}
			const header = target?.matches('.attribute-group, .attribute')
				? target.querySelector<HTMLElement>('header > [data-row]')
				: null
			const navigationOwner = link.closest('.navigation-items')
				? (link.closest('summary')?.parentElement ?? link.parentElement)
				: null
			for (const owner of [header, navigationOwner]) {
				if (!owner || index === undefined) continue
				if (!paintOwners.has(owner)) paintOwners.set(owner, owner.getAttribute('data-link'))
				owner.setAttribute('data-link', 'state')
				for (const state of states)
					owner.style.setProperty(`--link-${state}`, `--link-${state}-${index}`)
			}
			const parent = target?.parentElement?.closest('.attribute-group')
			const parentIndex = parent
				? destinations.get(new URL(`#${parent.id}`, link.href).href)
				: undefined
			const sourceIndexes = [index, parentIndex].filter(
				(value): value is number => value !== undefined,
			)
			if (sourceIndexes.length > 0) {
				link.setAttribute('data-link', `${original ?? ''} shared`.trim())
				for (const state of states) {
					const ownIndex = index ?? parentIndex!
					link.style.setProperty(`--link-${state}`, `--link-${state}-${ownIndex}`)
					link.style.setProperty(
						`--link-${state}-sources`,
						sourceIndexes.map(value => `--link-${state}-${value}`).join(', '),
					)
				}
			}
			return { link, original }
		})
		return () => {
			container.style.removeProperty('--link-timelines')
			for (const [owner, original] of paintOwners) {
				if (original === null) owner.removeAttribute('data-link')
				else owner.setAttribute('data-link', original)
				for (const state of states) owner.style.removeProperty(`--link-${state}`)
			}
			for (const { link, original } of originals) {
				if (original === null) link.removeAttribute('data-link')
				else link.setAttribute('data-link', original)
				for (const state of states) {
					link.style.removeProperty(`--link-${state}`)
					link.style.removeProperty(`--link-${state}-sources`)
				}
			}
		}
	}

	function openHashDetails(event?: Event) {
		let id: string

		try {
			id = decodeURIComponent(globalThis.location.hash.slice(1))
		} catch {
			return
		}

		const target = id ? globalThis.document.getElementById(id) : null

		if (target instanceof HTMLDetailsElement) target.open = true

		let containingDetails = target?.parentElement?.closest('details')

		while (containingDetails) {
			containingDetails.open = true
			containingDetails = containingDetails.parentElement?.closest('details')
		}
		// Astro restores window coordinates; fragment history belongs to the nested scroll container.
		if (event?.type === 'popstate' && globalThis.history.scrollRestoration === 'manual')
			target?.scrollIntoView({ block: 'start', behavior: 'instant' })
	}

	$effect(() => {
		openHashDetails()
		globalThis.addEventListener('hashchange', openHashDetails)
		globalThis.addEventListener('popstate', openHashDetails)

		return () => {
			globalThis.removeEventListener('hashchange', openHashDetails)
			globalThis.removeEventListener('popstate', openHashDetails)
		}
	})

	// (Derived)
	const walletNews = $derived.by(() => getNewsForWallet(wallet.metadata.id))

	// News section behavior: determine prominence based on recency and resolution status
	const allNewsResolved = $derived(
		walletNews.length > 0 && walletNews.every(news => news.status === IncidentStatus.RESOLVED),
	)

	const latestNewsDate = $derived(
		walletNews.length > 0
			? walletNews.reduce(
					(latest, news) => (news.updatedAt > latest ? news.updatedAt : latest),
					walletNews[0].updatedAt,
				)
			: null,
	)

	const daysSinceLatestNews = $derived(latestNewsDate ? daysSince(latestNewsDate) : null)

	// Collapse by default if all resolved and >30 days old
	const newsIsStale = $derived(
		allNewsResolved && daysSinceLatestNews !== null && daysSinceLatestNews > 30,
	)

	// Move to bottom if all resolved and >1 year old
	const newsIsVeryStale = $derived(
		allNewsResolved && daysSinceLatestNews !== null && daysSinceLatestNews > 365,
	)

	// Expand by default unless news is stale
	const shouldExpandNews = $derived(!newsIsStale)

	let selectedVariant = $state<Variant>()

	$effect(() => {
		if (!hasSingleVariant(wallet.variants) && selectedVariant)
			queryParams?.set('variant', selectedVariant)
		else queryParams?.delete('variant')
	})

	let selectedModel = $state<string>()
	const brandModels = $derived(allHardwareModels.filter(m => m.brandId === wallet.metadata.id))

	onMount(() => {
		const params = new SvelteURLSearchParams(globalThis.location.search)
		const variant = params.get('variant') as Variant | null

		selectedVariant =
			variant && variant in wallet.variants && !hasSingleVariant(wallet.variants)
				? variant
				: undefined
		selectedModel = params.get('model') ?? undefined
		queryParams = params
	})

	$effect(() => {
		if (!selectedModel) queryParams?.delete('model')
		else queryParams?.set('model', selectedModel)
	})

	const evalTree = $derived(
		((selectedVariant && wallet.variants[selectedVariant]?.attributes) ||
			wallet.overall) satisfies EvaluationTree<_AttributeGroupId>,
	)

	const groupTargetId = (group: AttributeGroup<_AttributeGroupId>) =>
		`${slugifyCamelCase(group.id)}${group.attributes.some(({ attribute }) => attribute.id === group.id) ? '-overview' : ''}`

	const tocNavigationItems = $derived.by<NavigationItem[]>(() =>
		evalTree
			? Object.values(attributeTree).flatMap(attrGroup => {
					const evalGroup = evalTree[attrGroup.id]

					if (!evalGroup) return []

					return [
						{
							id: `toc-${attrGroup.id}`,
							title: attrGroup.displayName,
							icon: attrGroup.icon,
							iconVariant: 'emoji' as const,
							accentColor: scoreToColor(
								calculateAttributeGroupScore(attrGroup, evalGroup)?.score ?? null,
							),
							href: `#${groupTargetId(attrGroup)}`,
							children: attrGroup.attributes.flatMap(({ attribute }) => {
								const evalAttr = evalGroup[attribute.id]

								if (!evalAttr || evalAttr.evaluation.outcome.rating === Rating.EXEMPT) return []

								return [
									{
										id: `toc-${attrGroup.id}-${attribute.id}`,
										title: attribute.displayName,
										icon: attribute.icon,
										iconVariant: 'emoji' as const,
										accentColor: ratingToColor(evalAttr.evaluation.outcome.rating),
										href: `#${slugifyCamelCase(attribute.id)}`,
									},
								]
							}),
						},
					]
				})
			: [],
	)

	const pieNavigationItems = $derived.by(() => {
		const referenceSlices = tocNavigationItems.map<Slice>(group => {
			const sourceGroup = Object.values(attributeTree).find(
				candidate => `toc-${candidate.id}` === group.id,
			)

			return {
				id: group.id,
				color: group.accentColor ?? 'transparent',
				gradient: attributeGroupFlowerGradient,
				weight: 1,
				arcLabel: '',
				titleText: group.title,
				children: (group.children ?? []).map(attribute => ({
					id: attribute.id,
					color: attribute.accentColor ?? 'transparent',
					weight:
						sourceGroup?.attributes.find(
							({ attribute: sourceAttribute }) =>
								`#${slugifyCamelCase(sourceAttribute.id)}` === attribute.href,
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
				sliceStyle: computedGroup
					? { ...computedGroup.computed, fill: sliceFill(computedGroup) }
					: undefined,
				children: group.children?.map((attribute, attributeIndex) => ({
					...attribute,
					sliceStyle: computedGroup?.children?.[attributeIndex]?.computed,
				})),
			}
		})
	})

	const pieRotation = $derived.by(() => {
		const states: string[] = []
		const starts: string[] = []
		const ends: string[] = []
		const startAnchors: string[] = []
		const endAnchors: string[] = []
		const timelines: string[] = []
		let previousAngle = 0

		for (const group of pieNavigationItems) {
			for (const item of [group, ...(group.children ?? [])]) {
				if (!item.sliceStyle || !item.href?.startsWith('#')) continue
				const angle = -90 - item.sliceStyle.midAngle
				const step = states.length + 1
				const condition = `style(---pie-rotation-step: ${step})`
				const timeline = `--${item.href.slice(1)}-entry`
				states.push(`wallet-pie-step auto linear(${step}, ${step}) forwards`)
				starts.push(`${condition}: ${previousAngle}deg`)
				ends.push(`${condition}: ${angle}deg`)
				startAnchors.push(`${condition}: anchor(${timeline} top)`)
				endAnchors.push(`${condition}: anchor(--${item.href.slice(1)}-end-block top)`)
				timelines.push(timeline)
				previousAngle = angle
			}
		}

		return {
			states: states.join(', ') || 'none',
			from: starts.length ? `if(${starts.join('; ')}; else: 0deg)` : '0deg',
			to: ends.length ? `if(${ends.join('; ')}; else: 0deg)` : '0deg',
			start: startAnchors.length ? `if(${startAnchors.join('; ')}; else: 0px)` : '0px',
			end: endAnchors.length ? `if(${endAnchors.join('; ')}; else: 0px)` : '0px',
			timelines: timelines.join(', ') || undefined,
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
						if (map.has(evalAttrId)) map.get(evalAttrId)!.push(variant)
						else map.set(evalAttrId, [variant])
				}
			}
		}

		return map
	})

	const overallScore = $derived(calculateOverallScore(attributeTree, wallet.overall, () => true))

	// Components
	import { Github, Globe, ListTree, ListCollapse } from 'lucide-static'
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
</script>

<svelte:head>
	{@html '<script type="application/ld+json">' +
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: evalTree
				? Object.values(attributeTree).flatMap(attrGroup =>
						attrGroup.attributes
							.map(({ attribute }) => ({
								evalAttr: evalTree[attrGroup.id][attribute.id],
								attribute,
							}))
							.filter(
								({ evalAttr }) => evalAttr && evalAttr.evaluation.outcome.rating !== Rating.EXEMPT,
							)
							.map(({ attribute }) => ({
								'@type': 'Question',
								name: renderStrings(
									attribute.question.contentType === ContentType.MARKDOWN
										? attribute.question.markdown
										: attribute.question.contentType === ContentType.TEXT
											? attribute.question.text
											: attribute.displayName,
									{
										WALLET_NAME: wallet.metadata.displayName,
									},
								),
								acceptedAnswer: {
									'@type': 'Answer',
									text: renderStrings(
										attribute.why.contentType === ContentType.MARKDOWN
											? attribute.why.markdown
											: attribute.why.contentType === ContentType.TEXT
												? attribute.why.text
												: 'No explanation available',
										{
											WALLET_NAME: wallet.metadata.displayName,
										},
									),
								},
							})),
					)
				: [],
			about: {
				'@type': 'SoftwareApplication',
				name: wallet.metadata.displayName,
				url:
					typeof wallet.metadata.url === 'string' ? wallet.metadata.url : wallet.metadata.url?.url,
				applicationCategory: 'Cryptocurrency Wallet',
				operatingSystem: Object.keys(wallet.variants)
					.map(variant => variantToRunsOn(variant))
					.join(', '),
			},
		}) +
		'<\/script>'}
</svelte:head>

<div
	id="top"
	style:---pie-rotation-timelines={pieRotation.timelines}
	style:---pie-rotation-states={pieRotation.states}
	data-sticky-breadcrumb="scope root"
	style:--stickyBreadcrumb-itemTimelines="--wallet-item-inline, --wallet-item-block"
	style:--stickyBreadcrumb-endTimelines="--wallet-end-inline, --wallet-end-block"
	style:--stickyBreadcrumb-entryTimeline="--wallet-entry"
	class="container"
	data-sticky-container
	{@attach container => {
		$effect(() => {
			// Rebind semantic destinations after selection changes replace the rendered links.
			void evalTree
			void queryParams?.toString()
			return shareLinkDestinations(container)
		})
	}}
>
	<header
		data-sticky-breadcrumb="position"
		data-sticky="block block-start backdrop-after backdrop-stuck"
		data-column="gap-6"
		data-scroll-item="inline-detached padding-match-start"
	>
		<div data-row="wrap">
			<div class="wallet-title-row" data-row="start wrap">
				<h1 data-sticky-breadcrumb="source">
					<a
						data-link="camouflaged"
						class="wallet-name"
						href="#top"
						data-sticky-breadcrumb="item"
						data-row="gap-2"
					>
						<img
							class="wallet-icon"
							alt={wallet.metadata.displayName}
							src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
						/>
						<span>{wallet.metadata.displayName}</span>
					</a>
				</h1>
				{#if queryParams && (Object.keys(wallet.variants).length > 1 || (Variant.HARDWARE in wallet.variants && brandModels.length > 1))}
					<div data-sticky-breadcrumb="end" data-row="gap-2">
						{#if Object.keys(wallet.variants).length > 1}
							<Select
								bind:value={selectedVariant}
								aria-label="Wallet version"
								style="--select-compact-progress: var(---breadcrumb-entry, 0)"
								data-icon="circle"
								options={[
									{
										value: undefined,
										label: 'All versions',
									},
									...Object.keys(wallet.variants).map(v => ({
										value: v,
										label: variants[v].label,
										icon: variants[v].icon,
									})),
								]}
							/>
						{/if}

						{#if Variant.HARDWARE in wallet.variants}
							{#if brandModels.length > 1}
								<Select
									bind:value={selectedModel}
									aria-label="Wallet model"
									style="--select-compact-progress: var(---breadcrumb-entry, 0)"
									data-icon="circle"
									options={[
										{ value: undefined, label: 'All models' },
										...brandModels.map(m => ({
											value: m.modelId,
											label: `${m.modelName}`,
											icon: m.iconUrl,
										})),
									]}
								/>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
			<div data-sticky-breadcrumb="support" data-row-item="wrap-end" data-row="gap-2">
				{#if showStage}
					{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}

					{#if stage !== null && ladderEvaluation !== null}
						<WalletStageBadge {stage} {ladderEvaluation} size="large" />
					{/if}
				{/if}

				{#if showScores}
					<ScoreBadge score={overallScore} size="large" />
				{/if}
			</div>
		</div>

		<section class="wallet-overview" data-sticky-breadcrumb="support" data-row="wrap align-start">
			<nav data-row="gap-2 start wrap" data-row-item="wrap-end">
				<a
					href={isLabeledUrl(wallet.metadata.urls?.websites[0])
						? wallet.metadata.urls.websites[0].url
						: wallet.metadata.urls.websites[0]}
					data-badge="medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					{@html Globe}
					Website
				</a>

				{#if wallet.metadata.urls?.repositories?.[0] !== undefined}
					<a
						href={isLabeledUrl(wallet.metadata.urls.repositories[0])
							? wallet.metadata.urls.repositories[0].url
							: wallet.metadata.urls.repositories[0]}
						data-badge="medium"
						target="_blank"
						rel="noopener noreferrer"
					>
						{@html Github}
						Source Code
					</a>
				{/if}
			</nav>
		</section>
	</header>

	<aside
		class="page-navigation"
		data-scroll-container="block"
		data-sticky-container
		data-column="gap-0"
	>
		<header data-row="end">
			<button
				type="button"
				data-icon="circle"
				popovertarget="wallet-toc"
				aria-label="Table of contents"
				title="Table of contents"
			>
				{@html ListTree}
			</button>
		</header>
		<nav
			class="pie-navigation"
			style:---pie-rotation-from={pieRotation.from}
			style:---pie-rotation-to={pieRotation.to}
			data-sticky="block-start backdrop-before backdrop-always"
			aria-label="Attribute pie navigation"
			style={`--pie-radius: ${overallRatingPieRadius}; --pie-padding: ${overallRatingPiePadding}; --pie-maxR: ${overallRatingPieMaxRadius}`}
		>
			<div class="pie-navigation-geometry">
				<NavigationItems
					items={pieNavigationItems}
					showSearch={false}
					defaultOpen
					ariaLabel="Attribute pie navigation"
				>
					{#snippet iconSnippet(item: NavigationItem)}
						{#if item.icon}
							<span class="pie-navigation-icon" data-icon="wbicons emoji monochrome {item.icon}"
							></span>
						{/if}
					{/snippet}
				</NavigationItems>
			</div>
		</nav>

		<nav
			id="wallet-toc"
			popover="auto"
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
						<span data-icon="wbicons emoji monochrome accent {item.icon}"></span>
					{/if}
				{/snippet}
			</NavigationItems>
		</nav>
	</aside>

	<article data-column="gap-8">
		{#if walletNews.length > 0 && !newsIsVeryStale}
			<hr />
			<div data-scroll-item="inline-detached padding-match-end" data-column>
				<SecurityNews news={walletNews} {shouldExpandNews} {allNewsResolved} />
			</div>
		{/if}

		{#if showStage}
			{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)}

			<section
				id="stages"
				data-sticky-breadcrumb="scope"
				data-scroll-item="inline-detached padding-match-end flow"
				style:--stickyBreadcrumb-itemTimelines="--stages-item-inline, --stages-item-block"
				style:--stickyBreadcrumb-endTimelines="--stages-end-inline, --stages-end-block"
				style:--stickyBreadcrumb-entryTimeline="--stages-entry"
			>
				<header
					data-sticky-breadcrumb="position"
					data-sticky="block block-start backdrop-after backdrop-stuck"
					data-column="span-start"
					style:--column-sizeTimelines="--stages-row-inline, --stages-row-block"
					data-scroll-item="inline-detached"
				>
					<div data-row="start">
						<h2 data-sticky-breadcrumb="source">
							<a
								data-row="start"
								data-sticky-breadcrumb="item"
								data-link="camouflaged"
								href="#stages"
							>
								Stage Progress
							</a>
						</h2>
					</div>
				</header>

				<WalletStageOverview {wallet} {stage} {ladderEvaluation} />
				<span data-sticky-breadcrumb="flow" aria-hidden="true"></span>
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

		{#if queryParams && tocNavigationItems.length}
			<button
				type="button"
				data-icon="circle"
				data-sticky="block block-end backdrop-none"
				aria-label="Expand or collapse all details in the current section"
				title="Expand or collapse all details in the current section"
				onclick={toggleCurrentSectionDetails}
				><span aria-hidden="true">{@html ListCollapse}</span></button
			>
		{/if}
	</article>
	{#if queryParams && tocNavigationItems.length}
		<footer data-row="end gap-2" data-sticky="block block-end backdrop-none">
			<button
				type="button"
				data-icon="circle"
				aria-label="Previous rating section or attribute"
				title="Previous rating section or attribute"
				onclick={event => navigateAdjacentSection(event.currentTarget, -1)}
				><span aria-hidden="true">↑</span></button
			>
			<button
				type="button"
				data-icon="circle"
				aria-label="Next rating section or attribute"
				title="Next rating section or attribute"
				onclick={event => navigateAdjacentSection(event.currentTarget, 1)}
				><span aria-hidden="true">↓</span></button
			>
		</footer>
	{/if}
	<span data-sticky-breadcrumb="flow" aria-hidden="true"></span>
	<span
		class="pie-rotation-clock"
		style:---pie-rotation-start={pieRotation.start}
		style:---pie-rotation-end={pieRotation.end}
		aria-hidden="true"
	></span>
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
		showStage={false}
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
		{@const scoreLevel =
			score === null || score.score === null
				? null
				: score.score >= 0.7
					? 'high'
					: score.score >= 0.4
						? 'medium'
						: 'low'}
		{@const scoreColor = scoreToColor(score === null ? null : score.score)}

		<hr />

		<section
			class="attribute-group"
			id={groupTargetId(attrGroup)}
			aria-label={attrGroup.displayName}
			data-score={scoreLevel}
			style:--accent={scoreColor}
			data-sticky-breadcrumb="scope"
			style:--stickyBreadcrumb-itemTimelines={`--${groupTargetId(attrGroup)}-item-inline, --${groupTargetId(attrGroup)}-item-block`}
			style:--stickyBreadcrumb-endTimelines={`--${groupTargetId(attrGroup)}-end-inline, --${groupTargetId(attrGroup)}-end-block`}
			style:--stickyBreadcrumb-entryTimeline={`--${groupTargetId(attrGroup)}-entry`}
			data-scroll-item="inline-detached padding-match-end flow"
		>
			<header
				data-column="span-start"
				data-sticky-breadcrumb="position"
				data-sticky="block block-start backdrop-after backdrop-stuck"
				style:--column-sizeTimelines={`--${groupTargetId(attrGroup)}-row-inline, --${groupTargetId(attrGroup)}-row-block`}
				data-scroll-item="inline-detached"
			>
				<div data-row="start wrap">
					<div data-sticky-breadcrumb="source" data-row-item="flexible">
						<a
							data-row="start"
							data-sticky-breadcrumb="item"
							data-link="camouflaged"
							href={`#${groupTargetId(attrGroup)}`}
							interestfor={groupTargetId(attrGroup)}
						>
							<span
								aria-hidden="true"
								data-icon="wbicons emoji monochrome accent {attrGroup.icon}"
							></span>
							<h2>
								{attrGroup.displayName}
							</h2>
						</a>
					</div>

					{#if showScores}
						<ScoreBadge
							{score}
							size="medium"
							data-sticky-breadcrumb="end"
							data-row-item="wrap-end"
						/>
					{/if}
				</div>
				{#if attrGroup.perWalletQuestion}
					<div class="section-caption">
						<Typography
							content={attrGroup.perWalletQuestion}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					</div>
				{/if}
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
			<span data-sticky-breadcrumb="flow" aria-hidden="true"></span>
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
	{@const verifiability = evalAttr.evaluation.outcome.verifiability}

	{@const override = getAttributeOverride(wallet, attrGroupId, attribute.id)}

	{@const howToImprove =
		override?.howToImprove !== undefined ? override.howToImprove : evalAttr.evaluation.howToImprove}

	{@const variantSpecificCaption = (() => {
		const thisVariantSpecificity =
			relevantVariants.length === 0
				? VariantSpecificity.ALL_SAME
				: relevantVariants.length === 1
					? VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT
					: VariantSpecificity.NOT_UNIVERSAL

		switch (thisVariantSpecificity) {
			case VariantSpecificity.ALL_SAME:
				return null
			case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
				return selectedVariant
					? `This rating is only relevant for the ${variantToName(selectedVariant, false)} version.`
					: null
			default:
				return selectedVariant
					? `This rating is specific to the ${variantToName(selectedVariant, false)} version.`
					: 'This rating differs across versions. Select a specific version for details.'
		}
	})()}

	<section
		class="attribute"
		data-card="radius-8 padding-6 border-accent"
		data-sticky-breadcrumb="scope"
		style:--stickyBreadcrumb-itemTimelines={`--${slugifyCamelCase(attribute.id)}-item-inline, --${slugifyCamelCase(attribute.id)}-item-block`}
		style:--stickyBreadcrumb-endTimelines={`--${slugifyCamelCase(attribute.id)}-end-inline, --${slugifyCamelCase(attribute.id)}-end-block`}
		style:--stickyBreadcrumb-entryTimeline={`--${slugifyCamelCase(attribute.id)}-entry`}
		id={slugifyCamelCase(attribute.id)}
		aria-label={attribute.displayName}
		style:--accent={ratingToColor(evalAttr.evaluation.outcome.rating)}
		data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
	>
		<details open data-column="gap-0">
			<summary
				data-row
				data-sticky-breadcrumb="position"
				data-sticky="block block-start backdrop-before backdrop-stuck"
				style:--column-sizeTimelines={`--${slugifyCamelCase(attribute.id)}-row-inline, --${slugifyCamelCase(attribute.id)}-row-block`}
			>
				<header data-row-item="flexible" data-column="span-start">
					<div data-row="start wrap">
						<div data-sticky-breadcrumb="source" data-row-item="flexible">
							<h3 data-sticky-breadcrumb="item" data-row="start gap-2 wrap">
								<a
									data-row="start"
									data-link="camouflaged"
									href={`#${slugifyCamelCase(attribute.id)}`}
									interestfor={slugifyCamelCase(attribute.id)}
								>
									<span
										aria-hidden="true"
										data-icon="wbicons emoji monochrome accent {attribute.icon}"
									></span>
									<span>{attribute.displayName}</span>
								</a>
								{#if showStage}
									{@const { ladderEvaluation, ladderType } = getWalletStageAndLadder(wallet)}

									{@const attributeStages = getAttributeStagesForWallet(ladders, attribute, wallet)}

									{@const stageNumbers =
										(ladderType &&
											attributeStages.find(stage => stage.ladderType === ladderType)
												?.stageNumbers) ||
										[]}

									{#if stageNumbers.length > 0}
										{@const stageNumber = stageNumbers[0]}
										{@const stage = ladderEvaluation?.ladder.stages[stageNumber]}
										{@const stageLabels = ladderEvaluation
											? stageNumbers
													.map(n => ladderEvaluation.ladder.stages[n])
													.filter(s => s !== undefined)
													.map(s => s.label.replace(/^Stage /, ''))
											: []}

										{#if stage}
											<a
												href={`#${stage.id}`}
												data-link="camouflaged"
												title={`This attribute is required for stage${stageLabels.length > 1 ? 's' : ''} ${stageLabels.join(', ')}`}
											>
												<span data-badge="small" style:--accent="var(--accent-color)">
													<small>Stage {stageLabels.join(', ')}</small>
												</span>
											</a>
										{/if}
									{/if}
								{/if}
							</h3>
						</div>
						<div
							class="attribute-summary-companions"
							data-sticky-breadcrumb="end"
							data-row-item="wrap-end"
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
									style:--accent="var(--accent-color)">Unverifiable</data
								>
							{:else if verifiability === Verifiability.INDEPENDENTLY_AUDITED}
								<data
									data-row-item="wrap-end"
									data-badge="medium"
									value={verifiability}
									style:--accent="var(--accent-color)">Unverifiable but audited</data
								>
							{/if}

							<data data-badge="medium" value={evalAttr.evaluation.outcome.rating}
								>{evalAttr.evaluation.outcome.rating}</data
							>
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
							{@const references =
								evalAttr.evaluation.references && toFullyQualified(evalAttr.evaluation.references)}

							<div data-column>
								{#if componentName === 'AddressCorrelationDetails'}
									<AddressCorrelationDetails
										{...componentProps as AddressCorrelationDetailsProps}
										{wallet}
									/>
								{:else if componentName === 'PrivateTransfersDetails'}
									<PrivateTransfersDetails
										{...componentProps as PrivateTransfersDetailsProps}
										{wallet}
									/>
								{:else if componentName === 'ChainVerificationDetails'}
									<ChainVerificationDetails
										{...componentProps as ChainVerificationDetailsProps}
										{wallet}
										refs={references}
									/>
								{:else if componentName === 'ScamAlertDetails'}
									<ScamAlertDetails
										{...componentProps as ScamAlertDetailsProps}
										{wallet}
										{outcome}
									/>
								{:else if componentName === 'SecurityAuditsDetails'}
									<SecurityAuditsDetails
										{...componentProps as SecurityAuditsDetailsProps}
										{wallet}
										metadata={outcome.metadata!}
									/>
								{:else if componentName === 'TransactionInclusionDetails'}
									<TransactionInclusionDetails
										{...componentProps as TransactionInclusionDetailsProps}
										{wallet}
									/>
								{:else if componentName === 'FundingDetails'}
									<FundingDetails {...componentProps as FundingDetailsProps} {wallet} />
								{:else if componentName === 'AccountRecoveryDetails'}
									<AccountRecoveryDetails
										{...componentProps as AccountRecoveryDetailsProps}
										{wallet}
										metadata={outcome.metadata!}
									/>
								{:else if componentName === 'AccountUnruggabilityDetails'}
									<AccountUnruggabilityDetails
										{...componentProps as AccountUnruggabilityDetailsProps}
										{wallet}
										metadata={outcome.metadata!}
									/>
								{:else if componentName === 'UnratedAttribute'}
									<UnratedAttribute
										{...componentProps as UnratedAttributeProps<OutcomeMetadata>}
										{wallet}
									/>
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
					<div class="impact" data-column="gap-6">
						<Typography
							content={evalAttr.evaluation.impact}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					</div>
				{/if}

				{#if evalAttr.evaluation.references?.length && (isTypographicContent(evalAttr.evaluation.details) || !(// Custom components that render their own reference links
							['ChainVerificationDetails', 'FundingDetails', 'ScamAlertDetails', 'SecurityAuditsDetails'].includes(evalAttr.evaluation.details.component.component)))}
					<ReferenceLinks
						references={toFullyQualified(evalAttr.evaluation.references)}
						cardBackground="secondary"
					/>
				{/if}

				{#if attribute.id === 'hardwareWalletSupport' && evalAttr.evaluation.outcome && typeof evalAttr.evaluation.outcome === 'object' && 'supportedHardwareWallets' in evalAttr.evaluation.outcome && Array.isArray(evalAttr.evaluation.outcome.supportedHardwareWallets) && evalAttr.evaluation.outcome.supportedHardwareWallets.length > 0}
					{@const supportedBrands = evalAttr.evaluation.outcome.supportedHardwareWallets}

					{@const supportedModels = allHardwareModels.filter(m =>
						supportedBrands.includes(m.brandId.toUpperCase()),
					)}

					<div class="supported-hardware-wallets" data-card="secondary padding-6">
						<h4>Supported hardware wallets:</h4>
						<div data-row="gap-2 wrap start">
							{#each supportedModels.filter(m => !selectedModel || m.modelId === selectedModel) as model}
								<a href={`/${model.brandId}/?model=${model.modelId}`} data-badge="medium">
									<img src={model.iconUrl} alt={model.brandName} />
									{model.modelName}
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<div class="attribute-accordions" data-column="gap-3">
					<details
						id={`${slugifyCamelCase(attribute.id)}-why`}
						open
						data-card="padding-5 secondary radius-4"
						data-column="gap-0"
						data-sticky-container
					>
						<summary data-sticky="block block-start backdrop-before backdrop-stuck">
							<h4>
								<a data-link="camouflaged" href={`#${slugifyCamelCase(attribute.id)}-why`}>
									{evalAttr.evaluation.outcome.rating === Rating.PASS ||
									evalAttr.evaluation.outcome.rating === Rating.UNRATED
										? 'Why does this matter?'
										: 'Why should I care?'}
								</a>
							</h4>
						</summary>

						<section data-column="gap-6">
							{#if attribute.why}
								<Typography content={attribute.why} />
							{:else}
								<p>No explanation available.</p>
							{/if}
						</section>
					</details>

					<details
						id={`${slugifyCamelCase(attribute.id)}-methodology`}
						open
						data-card="secondary padding-5 radius-4"
						data-column="gap-0"
						data-sticky-container
					>
						<summary data-sticky="block block-start backdrop-before backdrop-stuck">
							<h4>
								<a data-link="camouflaged" href={`#${slugifyCamelCase(attribute.id)}-methodology`}>
									{getHowIsEvaluatedHeading(attribute)}
								</a>
							</h4>
						</summary>

						<section class="attribute-rating-methodology" data-column="gap-6">
							{#if attribute.methodology}
								<Typography content={attribute.methodology} />
							{:else}
								<p>No methodology information available.</p>
							{/if}

							{#if attribute.ratingScale}
								{#if attribute.ratingScale.display === 'simple'}
									<aside data-card="radius-4">
										<Typography content={attribute.ratingScale.content} />
									</aside>
								{:else}
									<aside data-card="radius-4" data-column="gap-5">
										{#if attribute.ratingScale.exhaustive}
											<h5>A few examples:</h5>
										{/if}

										<ul data-list="gap-4">
											{#each [{ rating: Rating.PASS, label: 'passing', exampleRatings: attribute.ratingScale.pass }, { rating: Rating.PARTIAL, label: 'partial', exampleRatings: attribute.ratingScale.partial }, { rating: Rating.FAIL, label: 'failing', exampleRatings: attribute.ratingScale.fail }]
												.filter(({ exampleRatings }) => !!exampleRatings)
												.map( ({ rating, label, exampleRatings }) => ({ rating, label, exampleRatings: normalizeExampleRatings(exampleRatings) }) )
												.filter((item): item is typeof item & { exampleRatings: NonEmptyArray<ExampleRating<OutcomeMetadata>> } => item.exampleRatings.length > 0) as { rating, label, exampleRatings }}
												<li data-list-item="gap-3" data-list-item-marker={ratingIcons[rating]}>
													<p>A wallet would get a <strong>{label}</strong> rating if...</p>

													<ul>
														{#each exampleRatings as exampleRating}
															<li>
																{#if exampleRating.description.contentType === ContentType.MARKDOWN}
																	<Typography content={exampleRating.description} />
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
							id={`${slugifyCamelCase(attribute.id)}-improvement`}
							open
							data-card="secondary padding-5 radius-4"
							data-column="gap-0"
							data-sticky-container
						>
							<summary data-sticky="block block-start backdrop-before backdrop-stuck">
								<h4>
									<a
										data-link="camouflaged"
										href={`#${slugifyCamelCase(attribute.id)}-improvement`}
									>
										{getHowToImproveHeading(attribute, wallet.metadata.displayName)}
									</a>
								</h4>
							</summary>

							<section data-column>
								<Typography content={howToImprove} strings={getWalletEvalStrings(wallet)} />

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
		<span data-sticky-breadcrumb="flow" aria-hidden="true"></span>
	</section>
{/snippet}

<style>
	.container {
		overflow-wrap: anywhere;
		--wallet-icon-size: 3rem;
		---wallet-content-inline-padding: 2rem;
		---wallet-group-heading-font-size: 1.8rem;
		---wallet-compact-icon-size: 32px;
		---pie-compactSize: 100px;
		---pie-clearanceSize: calc(var(---pie-compactSize) + var(--stickyBreadcrumb-gap, 1rem) / 2);
		---wallet-compact-h3: 1rem;
		&[data-sticky-breadcrumb] {
			--stickyBreadcrumb-iconRatio: calc(var(---wallet-compact-icon-size) / var(---wallet-compact-h1));
		}
		---wallet-line-height: 1.6;
		---wallet-attribute-heading-font-size: 1.17rem;

		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 54rem;
			--scrollItem-inlineDetached-paddingStart: var(---wallet-content-inline-padding);
			--scrollItem-inlineDetached-maxPaddingMatchStart: 5rem;
			--scrollItem-inlineDetached-paddingEnd: var(---wallet-content-inline-padding);
			--scrollItem-inlineDetached-maxPaddingMatchEnd: 5rem;
			--sticky-marginInlineEnd: var(---wallet-page-navigation-inline-size);
			isolation: auto;
		}

		display: grid;
		grid-template: 'Header Nav' auto 'Content Nav' 1fr / minmax(0, 1fr) auto;

		line-height: var(---wallet-line-height);

		position: relative;

		article {
			grid-area: Content;
			position: relative;
		}

		.page-navigation {
			> header {
				display: none;
			}
			/* Nested scroll root: don't inherit page content's TOC clearance as sticky insets. */
			--sticky-marginInlineStart: 0px;
			--sticky-marginInlineEnd: 0px;
			--sticky-marginBlockStart: 0px;
			--sticky-marginBlockEnd: 0px;
			--sticky-paddingBlockStart: 0px;
			--sticky0-insetInlineStart: 0px;
			--sticky0-insetInlineEnd: 0px;
			--sticky0-insetBlockStart: 0px;
			--sticky0-insetBlockEnd: 0px;
			--sticky-insetInlineStart: 0px;
			--sticky-insetInlineEnd: 0px;
			--sticky-insetBlockStart: 0px;
			--sticky-insetBlockEnd: 0px;

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

			> nav:not(.pie-navigation) {
				/* The desktop rail owns scrolling; the native popover does only on mobile. */
				overflow: visible;
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

				display: flex;

				margin: 0;

				border: 0;

				color: inherit;
			}

			@media (width <= 1024px) {
				display: flex;
				z-index: auto;
				position: static;
				background: none;
				box-shadow: none;

				inline-size: auto;

				block-size: auto;

				> header {
					display: flex;
					position: fixed;
					inset-inline-end: var(--navigation-controlInsetInline);
					inset-block-start: calc((var(--navigation-mobile-blockSize) - 2rem) / 2);
					z-index: 4;

					& button {
						--icon-size: 2rem;
					}
				}
				> #wallet-toc {
					position: fixed;
					inset: var(--navigation-mobile-blockSize) 0 0;
					inline-size: auto;
					block-size: auto;
					min-block-size: 0;
					overflow-y: auto;
					background: var(--background-primary);
					transition-property: filter, opacity, translate, display, overlay;
					transition-behavior: allow-discrete;
					filter: blur(0);
					opacity: 1;
					translate: 0 0 0;
					&:not(:popover-open) {
						display: none;
						filter: blur(0.375rem);
						opacity: 0;
						translate: 0 -0.75rem 1.25rem;
					}
					@starting-style {
						&:popover-open {
							filter: blur(0.375rem);
							opacity: 0;
							translate: 0 -0.75rem 1.25rem;
						}
					}
					@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and
						(width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) {
						/* The independent pie stays outside the popover's paint and hit region. */
						clip-path: polygon(
							0 0,
							calc(100% - var(---pie-clearanceSize)) 0,
							calc(100% - var(---pie-clearanceSize)) var(---pie-clearanceSize),
							100% var(---pie-clearanceSize),
							100% 100%,
							0 100%
						);
						&:dir(rtl) {
							clip-path: polygon(
								var(---pie-clearanceSize) 0,
								100% 0,
								100% 100%,
								0 100%,
								0 var(---pie-clearanceSize),
								var(---pie-clearanceSize) var(---pie-clearanceSize)
							);
						}
						@supports (clip-path: shape(from 0 0, line to 1px 1px)) {
							&,
							&:dir(rtl) {
								clip-path: shape(
									evenodd from 0 0,
									line to 100% 0,
									line to 100% 100%,
									line to 0 100%,
									close,
									move to calc(
										(1 + var(---inlineDirection)) / 2 * (100% - var(---pie-compactSize)) +
										var(---pie-compactSize) - var(---pie-clearanceSize)
									) calc(var(---pie-compactSize) / 2),
									arc by calc(2 * var(---pie-clearanceSize) - var(---pie-compactSize)) 0 of
										calc(var(---pie-clearanceSize) - var(---pie-compactSize) / 2) cw,
									arc by calc(var(---pie-compactSize) - 2 * var(---pie-clearanceSize)) 0 of
										calc(var(---pie-clearanceSize) - var(---pie-compactSize) / 2) cw,
									close
								);
							}
						}
						:global(.navigation-items :is(summary, li > a)) {
							---pie-inlineClearance: var(---pie-clearanceSize);
							timeline-scope: --pie-clearance;
							view-timeline: --pie-clearance block;
							view-timeline-inset: 0 calc(100% - var(---pie-clearanceSize));
						}
					}
				}
			}
			&:has(#wallet-toc:popover-open) > header {
				display: flex;
			}
			&[data-scroll-container] {
				--scrollContainer-perspective: none;
			}
			&[data-sticky-container] {
				isolation: auto;
			}
		}

		row-gap: 2rem;

		@media (width <= 1024px) {
			&[data-sticky-container] {
				--sticky-marginInlineStart: 0px;
				--sticky-marginInlineEnd: 0px;
			}
			grid-template: 'Header' 'Nav' 'Content' / minmax(0, 1fr);
		}

		> [data-sticky-breadcrumb~="position"] {
			grid-area: Header;
		}
	}

	:global(#layout:has([data-sticky-breadcrumb~="root"])) {
		/* Keep fixed controls attached to the viewport. */
		--scrollContainer-perspective: none;
		---wallet-page-navigation-inline-size: min(20rem, 320px);
		---wallet-page-block-offset: 0px;
		--scrollContainer-scrollPaddingBlockStart: 0px;

		scroll-snap-type: block proximity;

		@media (width <= 1024px) {
			---wallet-page-block-offset: var(--navigation-mobile-blockSize);
		}
	}

	/* Fixed Wallet controls share the root navigation stacking context. */
	:global(#layout:has([data-sticky-breadcrumb~="root"]) > #content > main) {
		isolation: auto;
	}

	:global(#layout:has([data-sticky-breadcrumb~="root"]) > #content) {
		scroll-snap-align: start;
		@media (width <= 1024px) {
			scroll-margin-block-start: var(--navigation-mobile-blockSize);
		}
		isolation: auto;
	}

	@property ---pie-rotation-step {
		syntax: '<integer>';
		inherits: true;
		initial-value: 0;
	}
	@keyframes -global-wallet-pie-step {
		from {
			---pie-rotation-step: 0;
		}
		to {
			---pie-rotation-step: 1;
		}
	}
	@keyframes -global-wallet-pie-rotation {
		from {
			rotate: calc(-1 * var(---slice-mid-angle) + var(---pie-rotationDirection, 1) * var(---pie-rotation-from));
		}
		to {
			rotate: calc(-1 * var(---slice-mid-angle) + var(---pie-rotationDirection, 1) * var(---pie-rotation-to));
		}
	}

	@property ---slice-mid-angle {
		syntax: '<angle>';
		inherits: true;
		initial-value: 0turn;
	}

	.container > article > button,
	[data-sticky-breadcrumb~="root"] > footer {
		display: none;

		@supports (scroll-target-group: auto) {
			@supports selector(:target-current) {
				display: flex;
			}
		}
	}

	[data-sticky-breadcrumb~="root"] > footer {
		grid-area: Nav;
		align-self: end;
		justify-self: end;
		margin-inline-end: var(--navigation-controlInsetInline);
		&[data-sticky] {
			z-index: 3;
			--sticky-insetBlockEnd: var(--navigation-controlInsetInline);
		}
		@media (width <= 1024px) {
			grid-area: Content;
		}
	}
	.container > article > button {
		margin-inline: var(--navigation-controlInsetInline);
		align-self: end;
		&[data-sticky] {
			--sticky-insetBlockEnd: var(--navigation-controlInsetInline);
		}
		@media (width <= 1024px) {
			align-self: start;
		}
	}

	.pie-navigation,
	.pie-rotation-clock {
		display: none;
	}

	@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and
		(animation-timing-function: linear(0, 2)) and (color: if(style(---pie-rotation-step: 0): red)) {
		/* A stable timeline survives resizing; existing snap markers own both endpoints. */
		.pie-rotation-clock {
			display: block;
			position: absolute;
			inset-block-start: var(---pie-rotation-start);
			inset-block-end: var(---pie-rotation-end);
			inline-size: 1px;
			pointer-events: none;
			animation: var(---pie-rotation-states);
			animation-timeline: var(---pie-rotation-timelines);
			animation-range: contain 0% contain 100%;
			view-timeline: --wallet-pie-arrival block;
			view-timeline-inset: 0 100%;
		}
		.pie-navigation {
			animation: var(---pie-rotation-states), breadcrumb-entry auto steps(1, end) both;
			animation-timeline: var(---pie-rotation-timelines, none), --wallet-entry;
			animation-range: contain 0% contain 100%;
		}
		.pie-navigation :global(.navigation-items),
		.pie-navigation :global(.pie-navigation-icon) {
			animation: wallet-pie-rotation auto var(--transition-easeOutExpo) both;
			animation-timeline: --wallet-pie-arrival;
			animation-range: contain 0% contain 100%;
			@media (prefers-reduced-motion: reduce) {
				animation-range: contain 100% contain 100%;
			}
		}
	}

	@supports (clip-path: shape(from 0 0, line to 1px 1px, close)) {
		.container .page-navigation {
			---pie-size: var(---wallet-page-navigation-inline-size);

			box-sizing: border-box;
			--sticky0-insetBlockStart: calc(var(---pie-size) + 0.5rem);
			--sticky-insetBlockStart: var(--sticky0-insetBlockStart);
		}

		.container .page-navigation > .pie-navigation[data-sticky][data-sticky] {
			--sticky-background: none;
			/* Match Pie's inline-configured view box, including its padding. */
			---pie-diameter: calc(2 * (var(--pie-maxR) + var(--pie-padding)));
			/* Scale the canonical pixel-space diameter to the actual CSS length. */
			---pie-scale: calc(var(---pie-size) / (var(---pie-diameter) * 1px));
			@supports not (scale: calc(1px / 1px)) {
				/* Same length ratio for engines without typed division. */
				---pie-scale: tan(atan2(var(---pie-size), calc(var(---pie-diameter) * 1px)));
			}
			--sticky-insetBlockStart: 0px;

			@media (width <= 1024px) {
				&::before {
					display: none;
				}
			}

			display: block;
			z-index: 3;
			position: sticky;
			align-self: start;
			flex-shrink: 0;
			justify-self: stretch;
			inset-block-start: 0;
			inset-inline: 0;
			inline-size: 100%;
			block-size: var(---pie-size);
			max-inline-size: none;
			max-block-size: none;
			pointer-events: none;
			border-radius: 0;

			.pie-navigation-geometry {
				position: relative;
				inline-size: var(---pie-size);
				block-size: var(---pie-size);
				margin-inline: auto;
			}

			:global(.navigation-items) {
				overflow: clip;
				position: absolute;
				inset: 50% auto auto 50%;
				inline-size: calc(var(---pie-diameter) * 1px);
				block-size: calc(var(---pie-diameter) * 1px);
				translate: -50% -50%;
				scale: var(---pie-scale);
				rotate: 0deg;
				transform-origin: center;
				pointer-events: none;
				transition-property: none;
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

			:global(.navigation-items details::details-content) {
				position: absolute;
				inset: 0;
				transform: none;
			}

			:global(.navigation-items details > menu) {
				opacity: if(style(---breadcrumb-entry: 0): 1; else: var(---link-active, 0));
				visibility: if(
					style(---breadcrumb-entry: 0) or style(---link-active: 1): visible; else: hidden
				);
				transition-property: opacity, visibility;
			}

			:global(.navigation-items menu::before),
			:global(.navigation-items summary::before),
			:global(.navigation-items summary::after),
			:global(.navigation-items summary::marker) {
				display: none;
				content: none;
			}

			:global(.navigation-items details),
			:global(.navigation-items li:has(> a)) {
				z-index: if(style(---link-interacting: 1): 2; style(---link-current: 1): 1; else: 0);
			}

			:global(.navigation-items summary),
			:global(.navigation-items menu[data-navigation-depth="1"] > li) {
				filter: if(style(---link-active: 1): var(---pie-highlightFilter) ; else: none);
				&:has(> a:is(:hover, :focus-visible, :interest-source)) {
					filter: var(---pie-highlightFilter);
				}
			}

			:global(.navigation-items summary > a),
			:global(.navigation-items menu[data-navigation-depth="1"] > li > a) {
				---slice-mid-angle: calc(var(--slice-midAngle) * 1deg);
				scale: calc(1 + var(---link-active, 0) * (var(--hover-scale) - 1));
				opacity: if(style(---link-interacting: 1): 1; style(---link-current: 1): 0.8; else: 1);

				display: block;
				position: absolute;
				inset: 0;
				inline-size: 100%;
				block-size: 100%;
				padding: 0;
				border-radius: 0;
				background: var(--slice-fill, var(--accent, var(--background-tertiary)));
				color: var(--text-primary);
				pointer-events: auto;
				transform-origin: var(--pie-originX) var(--pie-originY);
				transform: rotate(var(---slice-mid-angle)) translateY(calc(var(--slice-offset) * -1px));

				transition-property: scale, opacity;
				transition-timing-function: var(--transition-easeOutExpo);
				@media (prefers-reduced-motion: reduce) {
					transition-duration: 0s;
				}
			}

			:global(.navigation-items a:is(:hover, :focus-visible, :interest-source, :target-current)) {
				scale: var(--hover-scale);
				outline: none;
			}

			:global(.navigation-items menu[data-navigation-depth="1"] > li > a) {
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
				--icon-size: calc(var(--slice-labelSize) * 1px);

				position: absolute;
				inset: var(--pie-originY) auto auto var(--pie-originX);
				translate: -50% calc(-50% - var(--slice-labelR) * 1px);
				---pie-rotationDirection: -1;
				rotate: calc(-1 * var(---slice-mid-angle));
				transition-property: filter;
			}
		}

		:global([data-sticky-breadcrumb~="root"] .pie-navigation .navigation-items summary[data-sticky]) {
			display: block;
			position: absolute;
			inset: 0;
			inline-size: 100%;
			block-size: 100%;
			max-block-size: none;
			container-type: normal;
			pointer-events: none;
		}

		/*
					 * Chromium currently fails to invalidate :target-current when it is
					 * nested beneath the pie rule. Keep this state selector flat.
					 */
		:global([data-sticky-breadcrumb~="root"] .pie-navigation .navigation-items a:target-current) {
			scale: var(--hover-scale);
			outline: none;
		}

		@media (width <= 1024px) {
			.container .page-navigation {
				padding-block-start: 0;
				&[data-scroll-container] {
					overflow: visible;
				}
				--sticky0-insetBlockStart: 0px;
				--sticky-insetBlockStart: 0px;
			}

			.container .page-navigation > .pie-navigation[data-sticky][data-sticky] {
				position: relative;
				inset: auto;
				align-self: center;

				@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and
					(width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) {
					anchor-name: --wallet-pie-source;
					view-timeline-name: --wallet-pie-source;
					view-timeline-axis: block;
					view-timeline-inset: var(--navigation-mobile-blockSize) 0;

					&:has(+ #wallet-toc:popover-open) .pie-navigation-geometry,
					&:has(+ #wallet-toc:popover-open)::before {
						animation-name: none;
					}

					&::before {
						display: block;
						clip-path: circle(calc(var(---pie-size) / 2));
						block-size: var(---pie-size);
						---pie-backdropAnimation: breadcrumb-support-motion auto linear reverse both;
						pointer-events: none;
					}
					.pie-navigation-geometry,
					&::before {
						position: fixed;
						position-anchor: --navigation-row;
						position-visibility: always;
						translate: 0 0;
						/* A native TOC opening uses the same compact endpoint as scrolling. */
						transform: translateX(
								calc(
									var(---inlineDirection) * (100% - var(---pie-size)) / 2 *
										var(---pie-compactSize) / var(---pie-size)
								)
							)
							scale(calc(var(---pie-compactSize) / var(---pie-size)));
						animation:
							wallet-pie-source auto linear both,
							wallet-pie-compact auto linear both,
							var(---pie-backdropAnimation, none),
							wallet-terminal auto linear;
						@media (prefers-reduced-motion: reduce) {
							animation-timing-function: linear, steps(1, end), linear, linear;
						}
						animation-timeline:
							--wallet-pie-source, var(--stickyBreadcrumb-entryTimeline),
							var(--stickyBreadcrumb-entryTimeline), --wallet-terminal;
						animation-range:
							cover 0% exit-crossing 0%,
							contain 0% contain 100%,
							contain 0% contain 100%,
							calc(100% - var(--navigation-mobile-blockSize)) 100%;
						/* The first sticky row owns the compact pie’s block-start edge. */
						inset-block-start: anchor(end);
						inset-inline-start: anchor(--wallet-pie-source start);
						inline-size: anchor-size(--wallet-pie-source inline);
						margin: 0;
						transform-origin: 100% 0;
						&:dir(rtl) {
							transform-origin: 0 0;
						}
					}
				}
			}
		}
	}

	@supports selector(:target-current) {
		.pie-navigation :global(a:target-current) {
			---link-current-source: var(--link-current-sources);
		}
	}

	[data-sticky-breadcrumb~="root"] {
		timeline-scope:
			var(--link-timelines, --wallet-links), var(---pie-rotation-timelines, --wallet-links), --wallet-pie-arrival;
		@media (width > 1024px) {
			timeline-scope:
				var(--link-timelines, --wallet-links), var(---pie-rotation-timelines, --wallet-links), --wallet-pie-arrival,
				var(--stickyBreadcrumb-itemTimelines), var(--stickyBreadcrumb-entryTimeline);
		}
	}

	@property --wallet-icon-size {
		syntax: '<length>';
		inherits: true;
		initial-value: 0;
	}

	[data-sticky-breadcrumb~="root"] > [data-sticky-breadcrumb~="position"] {
		min-inline-size: 0;

		.wallet-name {
			overflow-wrap: break-word;
			z-index: 2;
			align-self: start;
			inline-size: max-content;
		}

		.wallet-title-row {
			flex-basis: max-content;
			min-block-size: max(
				var(--wallet-icon-size),
				calc(var(---wallet-name-flow-font-size) * var(---wallet-line-height))
			);
		}
	}

	[data-sticky-breadcrumb~="root"] > [data-sticky-breadcrumb~="position"] h1 {
		font-size: var(---wallet-name-flow-font-size);
	}

	.wallet-icon {
		width: var(--wallet-icon-size);
		height: var(--wallet-icon-size);
		filter: drop-shadow(0 0 0.5rem rgba(255, 255, 255, 0.1));
	}

	.wallet-overview {
		font-size: 0.9rem;
	}

	#stages {
		> header {
			padding-block: 1.2rem;
		}
	}

	.attribute-group {
		> header {
			min-inline-size: 0;
			padding-block: 1rem;
			font-size: var(---wallet-group-heading-font-size);

			h2 {
				font-size: 1em;
				font-weight: 700;
			}
		}
	}

	[data-column~="span-start"] {
		--column-supportLineHeight: calc(1rem * var(---wallet-line-height));

		a:is(:hover, :focus-visible, :interest-source) {
			color: var(--accent);
			text-decoration: none;
		}

		> [data-row] > [data-icon]::before {
			transition-property: filter;
		}

		> :is(.section-caption, .subsection-caption) {
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
			min-inline-size: 0;
			font-size: var(---wallet-attribute-heading-font-size);
			h3 {
				font-size: 1em;
				font-weight: 600;
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
			}

			.attribute-rating-details {
				&:is(ul) {
					--list-markerGap: 1em;
				}

				background-color: color-mix(in srgb, var(--accent) 5%, var(--background-secondary));
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

				color: var(--text-secondary);
				font-weight: 500;

				&[data-rating="exempt"] {
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

	.attribute-rating-methodology {
		h5 {
			font-size: 1rem;
			font-weight: 600;
		}
	}

	.attribute-accordions {
		details {
			overflow: visible;

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

	.pie-navigation-icon {
		color: rgb(255 255 255 / 0.7);
	}

	@property ---pie-inlineSpace {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}
	/* Chromium resolves var() easing in range keyframes to linear; match the global Expo curves. */
	@keyframes -global-pie-clearance {
		entry 0% {
			transform: translateX(0);
			animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
		}
		entry 100%,
		exit 0% {
			transform: translateX(calc(-1 * var(---inlineDirection) * var(---pie-inlineClearance)));
			animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0);
		}
		exit 100% {
			transform: translateX(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		/* Keyframe easing requires literal values; conditional values are not resolved here. */
		/* Chromium resolves var() easing in range keyframes to linear; match the global Expo curves. */
	@keyframes -global-pie-clearance {
			entry 0% {
				transform: translateX(0);
				animation-timing-function: steps(1, start);
			}
			entry 100%,
			exit 0% {
				transform: translateX(calc(-1 * var(---inlineDirection) * var(---pie-inlineClearance)));
				animation-timing-function: steps(1, end);
			}
			exit 100% {
				transform: translateX(0);
			}
		}
	}
	@keyframes -global-pie-inline {
		from {
			---pie-inlineSpace: calc(-1 * var(---pie-compactSize));
		}
		to {
			---pie-inlineSpace: calc(var(--scrollContainer-sizeInline) - var(---pie-compactSize));
		}
	}

	@keyframes -global-wallet-pie-compact {
		from {
			transform: translateX(0) scale(1);
		}
	}
	@keyframes -global-wallet-pie-source {
		from {
			translate: 0 calc(var(--scrollContainer-sizeBlock) - var(--navigation-mobile-blockSize));
		}
	}

	@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and
		(width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) {
		@media (width <= 1024px) {
			[data-sticky-breadcrumb~="root"]
				:global([data-sticky-breadcrumb~="scope"]:not([data-sticky-breadcrumb~="root"])) {
				&:dir(rtl) {
					animation-direction: normal, normal, normal, normal, reverse;
				}
				timeline-scope:
					var(--stickyBreadcrumb-sizeTimelines), var(--stickyBreadcrumb-entryTimeline), --pie-inline;
				animation-name: var(---breadcrumb-sizeAnimationNames), pie-inline;
				animation-timeline: var(--stickyBreadcrumb-sizeTimelines), --pie-inline;
				> :global(*) {
					--stickyBreadcrumb-availableInlineSize: calc(100cqi - var(---pie-clearanceSize));
				}
			}
			[data-sticky-breadcrumb~="root"]
				:global(:is(.attribute-group, .attribute)[data-sticky-breadcrumb~="scope"]) {
				timeline-scope: var(--stickyBreadcrumb-sizeTimelines), --pie-inline;
			}
			[data-sticky-breadcrumb~="root"]
				:global(
					article summary:has(> [data-column~="span-start"]):not([data-sticky-breadcrumb~="position"])
				) {
				timeline-scope: --pie-inline;
			}
			[data-sticky-breadcrumb~="root"]
				:global(
					article
						[data-column~="span-start"]:not(
							[data-sticky-breadcrumb~="position"],
							[data-sticky-breadcrumb~="position"] *
						)
				) {
				&:dir(rtl) {
					animation-direction: normal, normal, reverse;
				}
				animation-name: column-inline-size, column-block-size, pie-inline;
				animation-timeline: var(--column-sizeTimelines), --pie-inline;
			}
			[data-sticky-breadcrumb~="root"] :global(article [data-sticky-breadcrumb~="position"]) {
				---pie-inlineClearance: clamp(
					0px,
					calc(
						100vw * (1 / var(---column-inlineFraction) - 1) +
							var(--stickyBreadcrumb-sourcePaddingInline) - var(---pie-inlineSpace) +
						var(--stickyBreadcrumb-gap, 1rem) / 2
					),
					var(---pie-clearanceSize)
				);
			}
			[data-sticky-breadcrumb~="root"] :global(article [data-sticky-breadcrumb~="end"]),
			[data-sticky-breadcrumb~="root"] :global(#wallet-toc .navigation-item-after),
			[data-sticky-breadcrumb~="root"] :global(#wallet-toc summary::after) {
				/* Depart quickly and return late so both sides clear the pie. */
				animation: pie-clearance auto linear both;
				animation-timeline: --pie-clearance;
				animation-range: cover 0% cover 100%;
			}

			[data-sticky-breadcrumb~="root"] :global(article [data-sticky-breadcrumb~="end"]) {
				/* Native layout timing approximates transformed contact without resolving transformed anchors. */
				timeline-scope: --pie-clearance;
				view-timeline: --pie-clearance block;
				view-timeline-inset: var(--navigation-mobile-blockSize)
					calc(
						100vh - var(--navigation-mobile-blockSize) -
							var(---pie-compactSize)
					);
			}

			[data-sticky-breadcrumb~="root"]
				:global(article [data-column~="span-start"] > [data-row]::after) {
				content: '';
				position: absolute;
				visibility: hidden;
				pointer-events: none;
				inline-size: 0;
				block-size: 0;
				inset-block-start: 0;
				inset-inline-start: calc(
					anchor(--column-firstRow self-start) - var(--stickyBreadcrumb-sourcePaddingInline)
				);
				view-timeline: --pie-inline inline;
			}
		}
		@supports (appearance: base-select) {
			[data-sticky-breadcrumb~="root"]:has(
					> [data-sticky-breadcrumb~="position"] :global(select)
				)::after {
				inline-size: 2rem;
			}
			[data-sticky-breadcrumb~="root"]:has(
					> [data-sticky-breadcrumb~="position"] :global(select ~ select)
				)::after {
				inline-size: calc(4rem + 0.5rem);
			}
		}
		[data-sticky-breadcrumb~="root"] {
			--stickyBreadcrumb-scale: calc(var(---wallet-compact-h1) / var(---wallet-name-flow-font-size));
			--stickyBreadcrumb-insetBlockStart: var(--sticky-insetBlockStart);
			--stickyBreadcrumb-minBlockSize: var(---wallet-compact-icon-size);
			@media (width > 1024px) {
				--stickyBreadcrumb-minBlockSize: max(
					var(---wallet-compact-icon-size),
					calc(var(--navigation-mobile-blockSize) - 2 * var(--stickyBreadcrumb-paddingBlock, 0.5rem))
				);
			}
		}
		[data-sticky-breadcrumb~="root"] :global(article [data-sticky-breadcrumb~="source"]) {
			/* Reserve the pie cutout; row companions wrap before the title text. */
			max-inline-size: calc(100% - var(---pie-inlineClearance, 0px));
			margin-inline-end: var(---pie-inlineClearance, 0px);
		}
		:is(.attribute-group, .attribute)[data-sticky-breadcrumb~="scope"] {
			/* Arrival clocks are shared with the pie at their common wallet-page owner. */
			timeline-scope: var(--stickyBreadcrumb-sizeTimelines);
		}
		:is(#stages, .attribute-group) {
			--stickyBreadcrumb-scale: calc(
				sqrt(var(---wallet-compact-h3) / var(---wallet-compact-h1)) *
					var(---wallet-compact-h1) / var(---wallet-group-heading-font-size)
			);
			> header {
				--stickyBreadcrumb-sourcePaddingBlock: 1rem;
				--stickyBreadcrumb-sourcePaddingInline: 0px;
			}
			@media (width <= 1024px) {
				--stickyBreadcrumb-forceRow: 1;
			}
		}
		#stages > header {
			font-size: var(---wallet-group-heading-font-size);
			padding-block: 1rem;
			h2 {
				font-size: 1em;
			}
		}
		.attribute {
			--stickyBreadcrumb-scale: calc(
				var(---wallet-compact-h3) / var(---wallet-attribute-heading-font-size)
			);
		}
		[data-sticky-breadcrumb~="root"]
			> [data-sticky-breadcrumb~="position"]
			[data-sticky-breadcrumb~="source"] {
			---breadcrumb-iconCorrection: calc(
				var(---wallet-compact-icon-size) / var(--stickyBreadcrumb-scale) - var(--wallet-icon-size)
			);
		}
		[data-sticky-breadcrumb~="root"] > [data-sticky-breadcrumb~="position"] .wallet-icon {
			transform-origin: calc(50% - 50% * var(---inlineDirection)) 50%;
			--stickyBreadcrumb-iconScale: calc(
				var(---wallet-compact-icon-size) / var(--wallet-icon-size)
			);
		}
		[data-sticky-breadcrumb~="root"] > [data-sticky-breadcrumb~="position"] {
			--stickyBreadcrumb-sourcePaddingBlock: min(
				var(--scrollItem-paddingInlineMatch),
				var(--scrollItem-inlineDetached-maxPaddingMatchStart)
			);
			--stickyBreadcrumb-sourcePaddingInline: 0px;
			--column-sizeTimelines: --wallet-row-inline, --wallet-row-block;
			anchor-scope: --column-firstRow;
			&::before {
				content: '';
				position: fixed;
				inset: 0 auto auto 0;
				visibility: hidden;
				pointer-events: none;
				inline-size: anchor-size(--column-firstRow inline);
				block-size: anchor-size(--column-firstRow block);
				view-timeline-name: var(--column-sizeTimelines);
				view-timeline-axis: inline, block;
				view-timeline-inset: 0;
			}
			.wallet-title-row {
				anchor-name: --column-firstRow;
			}
			[data-sticky-breadcrumb~="end"] {
				margin-inline-start: auto;
			}
			@media (width <= 1024px) {
				opacity: 1;
				[data-sticky-breadcrumb~="end"] {
					translate: calc(
							var(---inlineDirection) * var(---breadcrumb-entry) *
								(
									100cqi - var(---breadcrumb-sourceRowWidth) - var(--scrollItem-paddingInlineStart) -
										var(--navigation-controlInsetInline) - 2rem -
										0.5rem
								)
						)
						calc(
							var(---breadcrumb-entry) *
								(
									var(--navigation-mobile-blockSize) / 2 - var(---breadcrumb-blockStart) -
										var(--stickyBreadcrumb-sourcePaddingBlock) -
										(1 + var(---breadcrumb-sourceEndWrap)) *
										(var(---breadcrumb-sourceRowHeight) - var(---breadcrumb-endHeight)) / 2 -
										var(---breadcrumb-endHeight) / 2
								) -
								var(---wallet-tocOpen) * var(---wallet-sourceOffset)
						);
				}
			}
		}
	}
</style>
