<script
	lang="ts"
	generics="
	_AttributeGroupId extends string
"
>
	import type { ImageMetadata } from 'astro'
	import type { Snippet } from 'svelte'
	import { knownSingleVariantIcons, type WBIconID } from '@/styles/wbicons'
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
		ratingToTextColor,
		Verifiability,
	} from '@/schema/attributes'
	import { hasSingleVariant, Variant } from '@/schema/variants'
	import { type RatedWallet, VariantSpecificity } from '@/schema/wallet'
	import type { Ladders } from '@/schema/ladders'
	import type { AttributeTree, EvaluationTree } from '@/schema/attribute-groups'
	import { ContentType, isTypographicContent } from '@/types/content'
	import { evaluationDetailRenderData } from '@/types/content/evaluation-details'
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
	import { mergeRefs, toFullyQualified } from '@/schema/reference'
	import { getAttributeOverride } from '@/schema/wallet'
	import { renderStrings, slugifyCamelCase } from '@/types/utils/text'
	import { setItems } from '@/types/utils/non-empty'
	import { getWalletStageAndLadder } from '@/utils/stage'
	import { getHowIsEvaluatedHeading, getHowToImproveHeading } from '@/utils/attribute-display'
	import { scoreToColor } from '@/utils/colors'
	import { getWalletEvalStrings } from '@/utils/evaluation-content'
	import { allCriteriaInStage, getAttributeStagesForWallet, getCriterionAttributeId } from '@/utils/stage-attributes'


	// Props
	const {
		ladders,
		attributeTree,
		walletIcon,
		wallet,
		showStage = true,
		showScores = false,
	}: {
		ladders: Ladders<_AttributeGroupId>
		attributeTree: AttributeTree<_AttributeGroupId>
		walletIcon: ImageMetadata
		wallet: RatedWallet<_AttributeGroupId>
		showStage?: boolean
		showScores?: boolean
	} = $props()

	// State
	import { onMount } from 'svelte'
	import '@/styles/wallet-toc-fallback.css'
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import { getUrl } from '@/schema/url'
	import { IncidentStatus } from '@/types/content/news'
	import { daysSince } from '@/types/date'
	import { getNewsForWallet } from '@/data/news'

	let tocClosing = $state<symbol | null>(null)
	let peerStateReady = $state(false)

	let tocStateOwners: Element[] = []

	function publishTocState(state: 'closed' | 'open' | 'closing') {
		for (const owner of tocStateOwners) owner.setAttribute('data-wallet-toc-state', state)
	}

	function prepareTocTransition(event: ToggleEvent & { currentTarget: HTMLElement }) {
		const previousClosing = tocClosing
		tocClosing = event.newState === 'closed' ? Symbol() : null
		const closing = tocClosing
		const panel = event.currentTarget
		publishTocState(event.newState === 'open' ? 'open' : 'closing')
		queueMicrotask(() => {
			if (event.defaultPrevented && tocClosing === closing) {
				tocClosing = previousClosing
				publishTocState(panel.matches(':popover-open') ? 'open' : previousClosing ? 'closing' : 'closed')
			}
		})
		if (event.newState === 'open') {
			event.currentTarget.style.setProperty(
				'---wallet-toc-entryDuration',
				getComputedStyle(event.currentTarget).transitionDuration.split(',')[0],
			)
		}
	}

	async function finishTocTransition(event: ToggleEvent & { currentTarget: HTMLElement }) {
		const closing = tocClosing
		if (closing === null) return
		const panel = event.currentTarget
		const animations = getComputedStyle(panel).display === 'none' ? [] : panel.getAnimations().filter(
			animation => animation.timeline instanceof DocumentTimeline && Number.isFinite(animation.effect?.getComputedTiming().endTime),
		)
		await Promise.allSettled(animations.map(animation => animation.finished))
		if (tocClosing === closing && !panel.matches(':popover-open')) {
			tocClosing = null
			publishTocState('closed')
		}
	}

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

	function localHashTarget(hash: string) {
		try {
			return hash.length > 1
				? globalThis.document.getElementById(decodeURIComponent(hash.slice(1)))
				: null
		} catch {
			return null
		}
	}

	function currentNavigationLink(control: HTMLButtonElement) {
		const root = control.closest('[data-sticky-breadcrumb~="root"]')
		const links = Array.from(
			root?.querySelectorAll<HTMLAnchorElement>('.pie-navigation a[href^="#"]') ?? [],
		)

		const owner = root?.querySelector<HTMLElement>('.page-navigation')
		const state = owner && globalThis.getComputedStyle(owner).getPropertyValue('---pie-currentIndex').trim()
		if (state) {
			const destination = pieRotation.states.find(destination => destination.index === Number(state))
			return destination ? links.find(link => localHashTarget(link.hash)?.id === destination.id) : undefined
		}

		const scrollContainer = root?.closest<HTMLElement>('[data-scroll-container]')
		const scrollStart = scrollContainer?.getBoundingClientRect().top ?? 0
		let current: HTMLAnchorElement | undefined

		for (const link of links) {
			const target = localHashTarget(link.hash)
			if (!target) continue

			const style = globalThis.getComputedStyle(target)
			const start =
				target.getBoundingClientRect().top - (Number.parseFloat(style.scrollMarginBlockStart) || 0)
			if (start > scrollStart + 1) break
			current = link
		}

		return current
	}

	let retainLanding = true

	function navigateAdjacentSection(control: HTMLButtonElement, direction: -1 | 1) {
		const current = currentNavigationLink(control)
		const links = Array.from(
			control.closest('[data-sticky-breadcrumb~="root"]')?.querySelectorAll<HTMLAnchorElement>('.pie-navigation a[href^="#"]') ?? [],
		)
		const next = links[(current ? links.indexOf(current) : -1) + direction]
		const target = next && localHashTarget(next.hash)
		if (!next || !target) return
		revealTargetDetails(target)
		globalThis.history.pushState(null, '', next.href)
		retainLanding = true
		target.scrollIntoView({ block: 'start' })
	}

	function toggleCurrentSectionDetails(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
		const current = currentNavigationLink(event.currentTarget)
		if (!current) return

		const target = localHashTarget(current.hash)
		const details = Array.from(
			target?.closest('.attribute-group')?.querySelectorAll('details') ?? [],
		)
		const open = details.some(detail => !detail.open)

		for (const detail of details) detail.open = open
	}

	// Resolve semantic destination membership once per rendered evaluation; CSS owns presentation and scroll state.
	function shareLinkDestinations(container: HTMLElement) {
		const links = Array.from(container.querySelectorAll<HTMLAnchorElement | SVGAElement>('a[href]')).flatMap(link => {
			try {
				const url = new URL(link.getAttribute('href') ?? '', link.baseURI)
				if (url.origin !== location.origin || url.pathname !== location.pathname ||
					url.search !== location.search || url.hash.length < 2) return []
				const target = localHashTarget(url.hash)
				return [{ link, target, identity: target ? `#${target.id}` : url.hash }]
			} catch { return [] }
		})
		const counts = new Map<string, number>()
		for (const { identity } of links) counts.set(identity, (counts.get(identity) ?? 0) + 1)
		type Destination = { identity: string; timeline: string }
		const destinations = new Map<string, Destination>([...attributeDestinations, ...[...counts].filter(([identity, count]) => count > 1 && !attributeDestinations.has(identity)).map(([identity]) => [identity, { identity, timeline: `--wallet-discovered-${Array.from(identity, character => character.codePointAt(0)!.toString(16)).join('-')}` }] as const)])
		const attributes = new Map<HTMLElement | SVGElement, Map<string, string | null>>()
		const inputs = new Map<HTMLElement | SVGElement, Map<string, { value: string; priority: string }>>()
		const attribute = (owner: HTMLElement | SVGElement, name: string, value: string | null) => {
			const original = attributes.get(owner) ?? new Map<string, string | null>()
			if (!original.has(name)) original.set(name, owner.getAttribute(name))
			attributes.set(owner, original)
			if (value === null) owner.removeAttribute(name)
			else owner.setAttribute(name, value)
		}
		const input = (owner: HTMLElement | SVGElement, name: string, value: string) => {
			const original = inputs.get(owner) ?? new Map<string, { value: string; priority: string }>()
			if (!original.has(name)) original.set(name, {
				value: owner.style.getPropertyValue(name),
				priority: owner.style.getPropertyPriority(name),
			})
			inputs.set(owner, original)
			owner.style.setProperty(name, value)
		}
		const bind = (owner: HTMLElement | SVGElement, identity: string, destination: Destination | undefined) => {
			attribute(owner, 'data-pressable-name', identity)
			input(owner, '--link-current', destination?.timeline ?? 'none')
		}
		input(container, '--wallet-discovered-timelines', [...destinations.values()].filter(destination => !attributeDestinations.has(destination.identity)).map(destination => destination.timeline).join(', ') || '--wallet-links')
		for (const { link, target, identity } of links) {
			if (link.hasAttribute('data-pressable-name')) continue
			const destination = destinations.get(identity)
			const parent = target?.parentElement?.closest<HTMLElement>('.attribute-group, .security-news')
			const parentDestination = parent ? destinations.get(`#${parent.id}`) : undefined
			const ownDestination = destination ?? parentDestination
			const sources = [...new Set([destination, parentDestination].filter((value): value is Destination => value !== undefined))]
			bind(link, identity, ownDestination)
			input(link, '--link-current-sources', sources.map(source => source.timeline).join(', ') || 'none')
			attribute(link, 'data-pressable-targets', [...new Set([identity, parent ? `#${parent.id}` : null].filter((value): value is string => value !== null))].join(' '))
			const header = target?.querySelector<HTMLElement>('[data-sticky-breadcrumb~="position"] [data-sticky-breadcrumb~="source"]')?.closest<HTMLElement>('[data-row]')
			const navigationOwner = link.closest('.navigation-items') ? (link.closest('summary')?.parentElement ?? link.parentElement) : null
			for (const owner of [header, navigationOwner]) if (owner && !owner.hasAttribute('data-pressable-name')) bind(owner, identity, ownDestination)
		}
		const peers = new Map<string, (HTMLElement | SVGElement)[]>()
		for (const owner of container.querySelectorAll<HTMLElement | SVGElement>('[data-pressable-name]')) {
			const identity = owner.getAttribute('data-pressable-name')!
			const owners = peers.get(identity) ?? []
			owners.push(owner)
			peers.set(identity, owners)
		}
		const groups = new Map(pieNavigationItems.map(group => [group.href!, [group, ...(group.children ?? [])].map(item => item.href!)]))
		const flower = container.querySelector<HTMLElement>('.pie-navigation-geometry')
		let published = new Map<HTMLElement | SVGElement, string>()
		let pending: ReturnType<typeof setTimeout> | undefined
		const publish = () => {
			const states = new Map<HTMLElement | SVGElement, Set<string>>()
			const mark = (owner: HTMLElement | SVGElement, state: string) => {
				const tokens = states.get(owner) ?? new Set<string>()
				tokens.add(state)
				states.set(owner, tokens)
			}
			for (const source of container.querySelectorAll<HTMLElement | SVGElement>('a[data-pressable-name]:is(:hover, :focus-visible, :active, :interest-source)')) {
				const targets = source.getAttribute('data-pressable-targets')?.split(/\s+/).filter(Boolean) ?? []
				if (source.matches(':is(:hover, :focus-visible, :active)')) {
					mark(source, 'interacting')
					for (const identity of targets) for (const owner of peers.get(identity) ?? []) {
						mark(owner, 'interacting')
						if (source.matches(':active')) mark(owner, 'pressed')
					}
				}
				for (const owner of peers.get(source.getAttribute('data-pressable-name')!) ?? []) {
					if (owner.matches('.pie-navigation :is(li, details)')) mark(owner, 'exact')
				}
				for (const identity of targets) {
					const related = groups.get(identity)
					if (!related) continue
					if (flower) mark(flower, 'related')
					for (const destination of related) for (const owner of peers.get(destination) ?? []) {
						if (owner.matches('.pie-navigation :is(li, details)')) mark(owner, 'related')
					}
				}
			}
			const next = new Map([...states].map(([owner, tokens]) => [owner, ['interacting', 'pressed', 'exact', 'related'].filter(token => tokens.has(token)).join(' ')]))
			for (const owner of new Set([...published.keys(), ...next.keys()])) {
				const value = next.get(owner)
				if (value !== published.get(owner)) attribute(owner, 'data-pressable-state', value ?? null)
			}
			published = next
		}
		// Interest state changes after its event's default action, beyond the microtask checkpoint.
		const schedule = (event: Event) => {
			if (published.size === 0 && event.target instanceof Node && !container.contains(event.target)) return
			if (pending !== undefined) return
			pending = setTimeout(() => { pending = undefined; publish() }, 0)
		}
		const events = ['pointerover', 'pointerout', 'pointerdown', 'pointerup', 'pointercancel', 'dragend', 'focusin', 'focusout', 'keydown', 'keyup', 'interest', 'loseinterest']
		for (const event of events) document.addEventListener(event, schedule, true)
		window.addEventListener('blur', schedule)
		publish()
		peerStateReady = true
		return () => {
			peerStateReady = false
			if (pending !== undefined) clearTimeout(pending)
			for (const event of events) document.removeEventListener(event, schedule, true)
			window.removeEventListener('blur', schedule)
			for (const [owner, originals] of attributes) for (const [name, original] of originals) {
				if (original === null) owner.removeAttribute(name)
				else owner.setAttribute(name, original)
			}
			for (const [owner, originals] of inputs) for (const [name, original] of originals) {
				if (original.value === '') owner.style.removeProperty(name)
				else owner.style.setProperty(name, original.value, original.priority)
			}
		}
	}

	function revealTargetDetails(target: HTMLElement | null) {
		let containingDetails = target instanceof HTMLDetailsElement ? target :
			target?.querySelector<HTMLDetailsElement>(':scope > details') ?? target?.closest('details')
		while (containingDetails) {
			containingDetails.open = true
			containingDetails = containingDetails.parentElement?.closest('details')
		}
	}

	$effect(() => {
		let landingFrame = 0
		let active = true
		const scrollInputs = ['wheel', 'touchmove', 'pointerdown', 'keydown']
		const restoreLanding = () => {
			const target = localHashTarget(globalThis.location.hash)
			if (!retainLanding || !target) return
			// Fragment history and responsive reflow share settled disclosure/font layout.
			void globalThis.document.fonts.ready.then(() => {
				if (!active || !retainLanding || target !== localHashTarget(globalThis.location.hash)) return
				globalThis.cancelAnimationFrame(landingFrame)
				landingFrame = globalThis.requestAnimationFrame(() => {
					landingFrame = globalThis.requestAnimationFrame(() => {
						landingFrame = 0
						if (active && retainLanding && target === localHashTarget(globalThis.location.hash)) {
							target.scrollIntoView({ block: 'start', behavior: 'instant' })
						}
					})
				})
			})
		}
		const openHashDetails = (event?: Event) => {
			retainLanding = true
			revealTargetDetails(localHashTarget(globalThis.location.hash))
			if (!event || event.type === 'popstate') restoreLanding()
		}
		const invalidateLanding = (event: Event) => {
			if (!event.isTrusted) return
			if (event instanceof KeyboardEvent &&
				!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return
			retainLanding = false
			globalThis.cancelAnimationFrame(landingFrame)
		}
		const activateLanding = (event: MouseEvent) => {
			if (!event.isTrusted || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
			const anchor = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null
			const href = anchor?.getAttribute('href')
			if (!anchor || !href || !anchor.closest('#top') || anchor.hasAttribute('download') ||
				(anchor.getAttribute('target') && anchor.getAttribute('target') !== '_self') || !localHashTarget(href)) return
			queueMicrotask(() => {
				if (active && !event.defaultPrevented) retainLanding = true
			})
		}
		openHashDetails()
		globalThis.addEventListener('hashchange', openHashDetails)
		globalThis.addEventListener('popstate', openHashDetails)
		globalThis.addEventListener('resize', restoreLanding)
		globalThis.addEventListener('click', activateLanding)
		for (const event of scrollInputs) {
			globalThis.addEventListener(event, invalidateLanding, { capture: true, passive: true })
		}

		return () => {
			active = false
			globalThis.cancelAnimationFrame(landingFrame)
			globalThis.removeEventListener('hashchange', openHashDetails)
			globalThis.removeEventListener('popstate', openHashDetails)
			globalThis.removeEventListener('resize', restoreLanding)
			globalThis.removeEventListener('click', activateLanding)
			for (const event of scrollInputs) {
				globalThis.removeEventListener(event, invalidateLanding, true)
			}
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

	// Move to bottom if all resolved and >1 year old
	const newsIsVeryStale = $derived(
		allNewsResolved && daysSinceLatestNews !== null && daysSinceLatestNews > 365,
	)


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
		const root = document.querySelector('#top')!
		const panel = root.querySelector('#wallet-toc')
		tocStateOwners = [root.closest('#layout'), root.querySelector('.page-navigation'), root.querySelector('.pie-navigation')].filter((owner): owner is Element => owner !== null)
		publishTocState(panel?.matches(':popover-open') ? 'open' : 'closed')
		const revealClosedDisclosure = (event: Event) => {
			const details = event.target
			if (!(details instanceof HTMLDetailsElement) || details.open) return
			const summary = details.querySelector(':scope > summary')
			if (document.activeElement !== summary) return
			const card = details.closest('[data-card]') ?? details
			card.scrollIntoView({ block: 'start' })
		}
		root.addEventListener('toggle', revealClosedDisclosure, true)
		return () => {
			root.removeEventListener('toggle', revealClosedDisclosure, true)
			tocClosing = null
			for (const owner of tocStateOwners) owner.removeAttribute('data-wallet-toc-state')
			tocStateOwners = []
		}
	})

	$effect(() => {
		if (!selectedModel) queryParams?.delete('model')
		else queryParams?.set('model', selectedModel)
	})

	const primaryStage = $derived(getWalletStageAndLadder(wallet))

	const evalTree = $derived(
		((selectedVariant && wallet.variants[selectedVariant]?.attributes) ||
			wallet.overall) satisfies EvaluationTree<_AttributeGroupId>,
	)

	const groupTargetId = (group: AttributeGroup<_AttributeGroupId>) =>
		`${slugifyCamelCase(group.id)}${group.attributes.some(({ attribute }) => attribute.id === group.id) ? '-overview' : ''}`

	const evaluatedAttributeGroups = $derived.by(() =>
		evalTree
			? Object.values(attributeTree).flatMap(attrGroup => {
					const evalGroup = evalTree[attrGroup.id]
					if (!evalGroup) return []
					const attributes = attrGroup.attributes.flatMap(({ attribute }) => {
						const evalAttr = evalGroup[attribute.id]
						return !evalAttr || evalAttr.evaluation.outcome.rating === Rating.EXEMPT
							? []
							: [{ attribute, evalAttr }]
					})
					return attributes.length ? [{ attrGroup, evalGroup, attributes }] : []
				})
			: [],
	)

	const attributeNavigationItems = $derived.by<NavigationItem[]>(() =>
		evaluatedAttributeGroups.map(({ attrGroup, evalGroup, attributes }) => ({
			id: `toc-${attrGroup.id}`,
			title: attrGroup.displayName,
			icon: attrGroup.icon,
			iconVariant: 'emoji' as const,
			accentColor: scoreToColor(calculateAttributeGroupScore(attrGroup, evalGroup)?.score ?? null),
			href: `#${groupTargetId(attrGroup)}`,
			children: attributes.map(({ attribute, evalAttr }) => ({
				id: `toc-${attrGroup.id}-${attribute.id}`,
				title: attribute.displayName,
				icon: attribute.icon,
				iconVariant: 'emoji' as const,
				accentColor: ratingToColor(evalAttr.evaluation.outcome.rating),
				href: `#${slugifyCamelCase(attribute.id)}`,
			})),
		})),
	)
	const attributeDestinations = $derived(new Map(attributeNavigationItems.flatMap(group =>
		[group, ...(group.children ?? [])].map(item => [item.href!, {
			identity: item.href!, timeline: `--wallet-destination-${item.href!.slice(1)}`,
			contactTimeline: `--wallet-contact-${item.href!.slice(1)}`,
			parent: item === group ? undefined : group.href,
		}] as const),
	)))
	function destinationState(href: string | undefined, link = false): Record<string, string> {
		const destination = href ? attributeDestinations.get(href) : undefined
		if (!destination) return {}
		const identities = [destination.identity, destination.parent].filter((id): id is string => id !== undefined)
		return {
			'data-pressable-name': destination.identity,
			...(link ? { 'data-pressable-targets': identities.join(' ') } : {}),
			style: `--link-current:${destination.timeline};${link ? `--link-current-sources:${identities.map(id => attributeDestinations.get(id)!.timeline).join(',')};` : ''}`,
		}
	}

	const pieNavigationItems = $derived.by(() => {
		const referenceSlices = attributeNavigationItems.map<Slice>(group => {
			const sourceGroup = Object.values(attributeTree).find(
				candidate => `toc-${candidate.id}` === group.id,
			)

			return {
				id: group.id,
				color: group.accentColor ?? 'transparent',
				gradient: attributeGroupFlowerGradient,
				weight: 1,
				arcLabel: '',
				ariaLabel: group.title,
				children: (group.children ?? []).map(attribute => ({
					id: attribute.id,
					color: attribute.accentColor ?? 'transparent',
					weight:
						sourceGroup?.attributes.find(
							({ attribute: sourceAttribute }) =>
								`#${slugifyCamelCase(sourceAttribute.id)}` === attribute.href,
						)?.weight ?? 1,
					arcLabel: '',
					ariaLabel: attribute.title,
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

		return attributeNavigationItems.map((group, groupIndex) => {
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
		const states: { id: string; index: number; animation: string; timeline: string }[] = []
		const styles: string[] = []
		const peerStyles: string[] = []
		const turns: { animation: string; timeline: string }[] = []
		const prefix = `wallet-pie-${wallet.metadata.id.replace(/[^a-z0-9-]/gi, '-')}`
		for (const group of pieNavigationItems) {
			const related = [group, ...(group.children ?? [])]
			const interacting = `#top:has(a[data-pressable-targets~="${group.href}"]:is(:hover, :focus-visible, :active, :interest-source))`
			peerStyles.push(`
				${interacting} .pie-navigation-geometry { ---pie-hasRelevant: 1; }
				${related.map(item => `${interacting} .pie-navigation :is(li, details)[data-pressable-name="${item.href}"]`).join(', ')} { ---pie-relevant: 1; }
			`)
			for (const item of related) {
				const destination = attributeDestinations.get(item.href ?? '')
				if (!destination) continue
				styles.push(`
					#${item.href!.slice(1)} [data-sticky-breadcrumb~="source"] a[data-pressable-name="${item.href}"] {
						view-timeline-name: var(---link-current-source, none), if(not style(---breadcrumb-entry: 0): ${destination.contactTimeline}; else: none);
					}
				`)
				peerStyles.push(`#top:has(a[data-pressable-name="${item.href}"]:is(:hover, :focus-visible, :active, :interest-source)) .pie-navigation :is(li, details)[data-pressable-name="${item.href}"] { ---pie-interacting: 1; }`)
			}
		}
		let previousAngle = 0
		let previousGroup: NavigationItem | undefined
		let previousItem: NavigationItem | undefined
		const stageDefinitions = showStage ? primaryStage.ladderEvaluation?.ladder.stages ?? [] : []
		const stageAttributes = stageDefinitions.map(stage =>
			new Set(allCriteriaInStage(stage).map(getCriterionAttributeId).filter(id => id !== null).map(id => `#${slugifyCamelCase(id)}`)),
		)
		const stageStates = stageDefinitions.length > 0
			? [
				{ attributes: new Set<string>() },
				...stageAttributes.map(attributes => ({ attributes })),
			]
			: []
		for (const [stageIndex, stage] of stageStates.entries()) {
			const index = -stageIndex - 1
			const name = `${prefix}-stage-${stageIndex}-current`
			const timeline = stageIndex === 0 ? '--stages-entry' : `--stage-${stageIndex - 1}-entry`
			const selected = pieNavigationItems.flatMap(group => {
				const attributes = (group.children ?? []).filter(item =>
					stage.attributes.has(item.href ?? ''),
				)
				return attributes.length > 0 ? [group, ...attributes] : []
			})
			styles.push(`
				@keyframes ${name} {
					from, to { ---pie-currentIndex: ${index}; }
				}
				@container style(---pie-currentIndex: ${index}) {
					.pie-navigation-geometry { ---pie-hasRelevant: ${selected.length > 0 ? 1 : 0}; }
					${selected.length > 0 ? `${selected.map(item => `#top .pie-navigation :is(li, details)[data-pressable-name="${item.href}"]`).join(', ')} {
						---pie-relevant: 1;
					}` : ''}
				}
			`)
			states.push({ id: stageIndex === 0 ? 'stages' : stageDefinitions[stageIndex - 1].id, index, animation: `${name} auto steps(1, end) forwards`, timeline })
		}

		for (const group of pieNavigationItems) {
			for (const item of [group, ...(group.children ?? [])]) {
				if (!item.sliceStyle || !item.href?.startsWith('#')) continue
				const angle = -90 - item.sliceStyle.midAngle
				const index = states.length + 1
				const name = `${prefix}-${index}`
				const timeline = `--${item.href.slice(1)}-entry`
				styles.push(`
					@keyframes ${name} {
						from { rotate: calc(-1 * var(---slice-mid-angle, 0deg) + var(---pie-rotationDirection, 1) * ${previousAngle}deg); }
						to { rotate: calc(-1 * var(---slice-mid-angle, 0deg) + var(---pie-rotationDirection, 1) * ${angle}deg); }
					}
					@keyframes ${name}-approach {
						from, to { ---pie-approachIndex: ${index}; }
					}
					@container style(---pie-approachIndex: ${index}) {
						.pie-navigation .navigation-items {
							---pie-turn: ${name};
							---pie-turn-timeline: --${item.href.slice(1)}-approach;
							---pie-opacityFrom: ${previousGroup ? 0.2 : 1};
							---pie-opacityTo: 0.2;
						}
						${previousGroup ? `#top .pie-navigation [data-pressable-name="${previousGroup.href}"] { ---pie-opacityFrom: 1; }` : ''}
						#top .pie-navigation [data-pressable-name="${group.href}"] { ---pie-opacityTo: 1; }
						${previousItem ? `#top .pie-navigation :is(li, details)[data-pressable-name="${previousItem.href}"] { ---pie-highlightFrom: 1; }` : ''}
						#top .pie-navigation :is(li, details)[data-pressable-name="${item.href}"] { ---pie-highlightTo: 1; }
					}
					@keyframes ${name}-current {
						from, to { ---pie-currentIndex: ${index}; }
					}
					@container style(---pie-currentIndex: ${index}) {
						.pie-navigation-geometry { ---pie-hasRelevant: 1; }
						${[group, ...(group.children ?? [])].map(related => `#top .pie-navigation :is(li, details)[data-pressable-name="${related.href}"]`).join(', ')} { ---pie-relevant: 1; }
						#top .pie-navigation :is(li, details)[data-pressable-name="${item.href}"] { --pie-contactTimeline: ${attributeDestinations.get(item.href)!.contactTimeline}; }
						.pie-navigation a[href="${item.href}"] {
							---link-current-source: var(--link-current-sources);
						}
						#wallet-toc ${item.children?.length ? `li:has(> details[data-pressable-name="${item.href}"])` : `li[data-pressable-name="${item.href}"]:not(details:not([open]) li)`} {
							${item.children?.length ? '---navigation-snapAlign' : 'scroll-snap-align'}: center;
						}
						${item === group ? '' : `#wallet-toc li:has(> details[data-pressable-name="${group.href}"]:not([open])) { ---navigation-snapAlign: center; }`}
					}
				`)
				states.push({ id: item.href.slice(1), index, animation: `${name}-current auto steps(1, end) forwards`, timeline })
				turns.push({ animation: `${name}-approach auto steps(1, end) forwards`, timeline: `--${item.href.slice(1)}-approach` })
				previousAngle = angle
				previousGroup = group
				previousItem = item
			}
		}

		return {
			states,
			turns: turns.map(turn => turn.animation).join(', ') || 'none',
			approachRanges: turns.map(() => 'exit-crossing -100% exit-crossing 0%').join(', ') || 'normal',
			approachTimelines: turns.map(turn => turn.timeline).join(', ') || undefined,
			animations: states.map(state => state.animation).join(', ') || 'none',
			styles: styles.join('\n'),
			peerStyles: peerStyles.join('\n'),
			timelines: states.map(state => state.timeline).join(', ') || undefined,
		}
	})

	const peerFallbackStyles = $derived.by(() => {
		const identities = new Set([...attributeDestinations.keys(), '#top', '#stages', '#security-news', ...(primaryStage.ladderEvaluation?.ladder.stages ?? []).map(stage => `#${stage.id}`)])
		const matching = (state: string, linksOnly = false) => [...identities].map(identity => `#top:has(a[data-pressable-targets~=${JSON.stringify(identity)}]:${state}) ${linksOnly ? 'a' : ''}[data-pressable-name=${JSON.stringify(identity)}]`).join(', ')
		return `${pieRotation.peerStyles}
			#top a[data-pressable-name]:is(:hover, :focus-visible, :active), ${matching('is(:hover, :focus-visible, :active)')} {
				---link-interacting: 1; ---link-active: 1;
				&:is(a):not([data-link~="camouflaged"]) { text-decoration: underline; }
			}
			${matching('active', true)} { transition-duration: var(--pressable-transitionInDuration); opacity: var(--pressable-pressed-opacity); scale: var(--pressable-pressed-scale); ---pie-opacityAnimation: none; }
		`
	})

	const attrToRelevantVariants = $derived.by(() => {
		const map = new Map<string, Variant[]>()

		for (const entry of Object.entries(wallet.variantSpecificity)) {
			if (!entry) continue

			const [variant, variantSpecificityMap] = entry

			if (!variantSpecificityMap) continue

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
	const allPageReferences = $derived(mergeRefs(...evaluatedAttributeGroups.flatMap(({ attributes }) =>
		attributes.flatMap(({ evalAttr }) => toFullyQualified(evalAttr.evaluation.references)),
	)))

	// Components
	import { ListTree, ListCollapse } from 'lucide-static'
	import Select from '@/components/Select.svelte'
	import AddressCorrelationDetails from '@/views/attributes/privacy/AddressCorrelationDetails.svelte'
	import PrivateTransfersDetails from '@/views/attributes/privacy/PrivateTransfersDetails.svelte'
	import ChainVerificationDetails from '@/views/attributes/security/ChainVerificationDetails.svelte'
	import ScamAlertDetails from '@/views/attributes/security/ScamAlertDetails.svelte'
	import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'
	import TransactionInclusionDetails from '@/views/attributes/self-sovereignty/TransactionInclusionDetails.svelte'
	import FundingDetails from '@/views/attributes/transparency/FundingDetails.svelte'
	import UnratedAttribute from '@/views/attributes/UnratedAttribute.svelte'
	import DataSourceCredits from '@/views/DataSourceCredits.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
	import ScoreBadge from '@/views/ScoreBadge.svelte'
	import WalletStageBadge from '@/views/WalletStageBadge.svelte'
	import WalletTags from '@/views/WalletTags.svelte'
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
					wallet.metadata.urls?.websites?.[0] !== undefined
						? getUrl(wallet.metadata.urls.websites[0])
						: undefined,
				applicationCategory: 'Cryptocurrency Wallet',
				operatingSystem: Object.keys(wallet.variants)
					.map(variant => variantToRunsOn(variant))
					.join(', '),
			},
		}) +
		'<\/script>'}
</svelte:head>


<svelte:element this={'style'}>{pieRotation.styles}</svelte:element>
<svelte:element this={'style'} data-wallet-peer-fallback>{peerStateReady ? '' : peerFallbackStyles}</svelte:element>

<div
	id="top"
	style:---pie-rotation-timelines={pieRotation.timelines}
	style:---pie-approach-timelines={pieRotation.approachTimelines}
	style:--link-timelines={[...attributeDestinations.values()].flatMap<string>(destination => [destination.timeline, destination.contactTimeline]).concat('var(--wallet-discovered-timelines, --wallet-links)').join(', ')}
	style:---pie-rotation-states={pieRotation.animations}
	data-sticky-breadcrumb="scope root"
	style:---pie-radiusRatio={overallRatingPieMaxRadius / (overallRatingPieMaxRadius + overallRatingPiePadding)}
	style:--stickyBreadcrumb-itemInlineTimeline="--wallet-item-inline"
	style:--stickyBreadcrumb-itemBlockTimeline="--wallet-item-block"
	style:--stickyBreadcrumb-endInlineTimeline="--wallet-end-inline"
	style:--stickyBreadcrumb-endBlockTimeline="--wallet-end-block"
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
		data-column
		data-scroll-item="inline-detached padding-match-start"
	>
		<div
			class="wallet-title-source"
			data-sticky-breadcrumb="source"
			style:--wallet-icon-aspectRatio={walletIcon.width / walletIcon.height}
		>
			<div
				class="wallet-title-row"
				data-sticky-breadcrumb="item"
				data-row="start gap-2"
				style="--select-compactTimeline: var(--stickyBreadcrumb-entryTimeline); --select-compactScale: var(--stickyBreadcrumb-scale, 1); --select-compactRange: var(--stickyBreadcrumb-entryRange); --select-compactEasing: var(---breadcrumb-inlineEasing)"
			>
			<h1>
				<a
					data-link="camouflaged"
					class="wallet-name"
					aria-label={wallet.metadata.displayName}
					href="#top"
					data-row="gap-2"
				>
					<img
						class="wallet-icon"
						alt=""
						src={walletIcon.src}
						width={walletIcon.width}
						height={walletIcon.height}
					/>
					<span>{wallet.metadata.displayName}</span>
				</a>
			</h1>
			{#if Object.keys(wallet.variants).length > 1 || (Variant.HARDWARE in wallet.variants && brandModels.length > 1)}
				<div class="wallet-device-controls" data-row="gap-2" inert={!queryParams}>
					{#if Object.keys(wallet.variants).length > 1}
						<Select
							bind:value={selectedVariant}
							aria-label="Wallet version"
							style="--select-natural-anchor: --wallet-version-natural; --select-visual-anchor: --wallet-version-visual"
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
								style="--select-natural-anchor: --wallet-model-natural; --select-visual-anchor: --wallet-model-visual"
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
		</div>
	</header>
	<div class="wallet-header-flow" data-row="wrap" data-scroll-item="inline-detached padding-match-start">
		<div data-sticky-breadcrumb="support" data-row-item="wrap-end" data-row="gap-2">
			{#if showStage}
				{#if setItems(wallet.types).length > 1}
					{#each setItems(wallet.types) as type}
						{@const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet, type)}
						<span data-row="gap-2">
							{type.toLowerCase()}
							<WalletStageBadge {stage} {ladderEvaluation} size="large" href={ladderEvaluation ? (stage && typeof stage === 'object' ? `#${stage.id}` : '#stages') : undefined} />
						</span>
					{/each}
				{:else if primaryStage.ladderEvaluation !== null}
					<WalletStageBadge stage={primaryStage.stage} ladderEvaluation={primaryStage.ladderEvaluation} size="large" href={primaryStage.stage && typeof primaryStage.stage === 'object' ? `#${primaryStage.stage.id}` : '#stages'} />
				{/if}
			{/if}

			{#if showScores}
				<ScoreBadge score={overallScore} size="large" />
			{/if}
		</div>

	<section class="wallet-overview" data-sticky-breadcrumb="support" data-row="wrap align-start">
		<div data-row-item="flexible" data-row="start gap-1 wrap">
			<WalletTags {wallet} {selectedVariant} />
		</div>
		<nav data-row="gap-2 start wrap" data-row-item="wrap-end">
			{#if wallet.metadata.urls?.websites?.[0] !== undefined}
				<a
					href={getUrl(wallet.metadata.urls.websites[0])}
					data-badge="medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					<span data-icon="wbicons-simple browser_integration"></span>
					Website
				</a>

			{/if}

			{#if wallet.metadata.urls?.repositories?.[0] !== undefined}
				<a
					href={getUrl(wallet.metadata.urls.repositories[0])}
					data-badge="medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					<span data-icon="wbicons-simple code_repository"></span>
					Source Code
				</a>
			{/if}
		</nav>
	</section>
	</div>

	<aside
		class="page-navigation"
		data-scroll-item="inline-detached"
		data-scroll-container="block"
		data-scroll-snap="block unless-hovered"
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
			style:---pie-approach-states={pieRotation.turns}
			style:---pie-approach-ranges={pieRotation.approachRanges}
			data-sticky="block-start backdrop-before backdrop-always"
			aria-label="Attribute pie navigation"
			style={`--pie-radius: ${overallRatingPieRadius}; --pie-padding: ${overallRatingPiePadding}; --pie-maxR: ${overallRatingPieMaxRadius}`}
		>
			<div class="pie-navigation-geometry">
				<NavigationItems
				{destinationState}
					items={pieNavigationItems}
					showLabels={false}
					showSearch={false}
					defaultOpen
				>
					{#snippet afterLinkSnippet(item: NavigationItem)}
						<span class="pie-navigation-highlight" aria-hidden="true" style:--accent={item.accentColor ?? undefined}><span></span></span>
					{/snippet}
					{#snippet iconSnippet(item: NavigationItem)}
						{#if item.icon}
							<span class="pie-navigation-icon" aria-hidden="true" data-icon="wbicons-simple {item.icon}"
							></span>
						{/if}
					{/snippet}
				</NavigationItems>
			</div>
		</nav>

		<nav
			id="wallet-toc"
			data-scroll-snap="block unless-hovered"
			data-closing={tocClosing !== null || undefined}
			inert={tocClosing !== null}
			onbeforetoggle={prepareTocTransition}
			ontoggle={finishTocTransition}
			aria-label="Table of contents"
			popover="auto"
			data-column
			data-column-item="flexible"
			data-sticky-container
		>
			<NavigationItems
				{destinationState}
				items={attributeNavigationItems}
				showSearch={false}
				defaultOpen
				afterLabelSnippet={navigationBadgeSnippet}
			>
				{#snippet iconSnippet(item: NavigationItem, depth: number)}
					{#if item.icon}
						<span data-icon="wbicons-simple accent {item.icon}" aria-hidden="true"></span>
					{/if}
				{/snippet}
			</NavigationItems>
		</nav>
	</aside>

	<article data-column="gap-8">
		{#if walletNews.length > 0 && !newsIsVeryStale}
			<hr />
			<SecurityNews news={walletNews} {allNewsResolved} heading={sectionHeader} />
		{/if}

		{#if showStage && primaryStage.ladderEvaluation !== null}
			<hr />
			{@const { stage, ladderEvaluation } = primaryStage}

			<section
				id="stages"
				data-sticky-breadcrumb="scope size"
				data-sticky-container
				data-scroll-item="inline-detached padding-match-end flow"
				style:--stickyBreadcrumb-entryTimeline="--stages-entry"
			>
				{@render sectionHeader('stages', 'Stage Progress', 'checklist')}

				<WalletStageOverview
					{wallet} {stage} {ladderEvaluation}
					isLocalAttribute={id => attributeNavigationItems.some(group =>
						group.children?.some(item => item.href === `#${slugifyCamelCase(id)}`))}
				/>
				<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
				<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
			</section>
		{/if}

		{#each evaluatedAttributeGroups as group (group.attrGroup.id)}
			{@render attributeGroupSnippet(group)}
		{/each}

		{#if allPageReferences.length > 0}
			<div data-scroll-item="inline-detached padding-match-end" data-column>
				<DataSourceCredits references={allPageReferences} />
			</div>
		{/if}

		{#if walletNews.length > 0 && newsIsVeryStale}
			<hr />
			<SecurityNews news={walletNews} {allNewsResolved} heading={sectionHeader} />
		{/if}

		{#if attributeNavigationItems.length}
			<button
				type="button"
				data-icon="circle"
				data-sticky="block block-end backdrop-none"
				inert={!queryParams}
				aria-label="Expand or collapse all details in the current section"
				title="Expand or collapse all details in the current section"
				onclick={toggleCurrentSectionDetails}
				><span aria-hidden="true">{@html ListCollapse}</span></button
			>
		{/if}
	</article>
	{#if attributeNavigationItems.length}
		<footer data-row="end gap-2" data-sticky="block block-end backdrop-none" inert={!queryParams}>
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
	<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span><span data-scroll-item="snap-block-start"></span></span>
	<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
</div>

{#snippet sectionHeader(id: string, label: string, icon: WBIconID, description?: Snippet, end?: Snippet)}
	<header data-column="span-start" data-icon-metrics={icon} data-sticky-breadcrumb="position" data-sticky="block block-start backdrop-after backdrop-stuck" data-scroll-item="inline-detached" style:--column-spanSize={description ? undefined : 'calc(1.5lh * 1.1)'}>
		<div data-sticky="block block-start backdrop-before backdrop-stuck">
			<div data-row="start wrap" {...destinationState(`#${id}`)}>
				<div data-sticky-breadcrumb="source" data-row-item="flexible">
					<a data-row="start" data-sticky-breadcrumb="item" data-link="camouflaged" href={`#${id}`} {...destinationState(`#${id}`, true)} interestfor={id}>
						<span aria-hidden="true" data-icon={`wbicons-${knownSingleVariantIcons[icon] ?? 'complex'} accent ${icon}`}></span>
						<h2>{label}</h2>
					</a>
					<span data-sticky-breadcrumb="size-export size-source" aria-hidden="true"></span>
				</div>
				<span data-sticky-breadcrumb="size-export size-row" aria-hidden="true"></span>
				{@render end?.()}
			</div>
		</div>
		{#if description}<div class="section-caption" data-sticky-breadcrumb="support fade">{@render description()}</div>{/if}
	</header>
{/snippet}

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
	attributes,
}: (typeof evaluatedAttributeGroups)[number])}
	{@const score = calculateAttributeGroupScore(attrGroup, evalGroup)}
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
		aria-label={`${attrGroup.displayName} attributes`}
		data-score={scoreLevel}
		style:--accent={scoreColor}
		data-sticky-breadcrumb="scope clearance size"
		data-sticky-container
		style:--stickyBreadcrumb-entryTimeline={`--${groupTargetId(attrGroup)}-entry`}
		style:--stickyBreadcrumb-approachTimeline={`--${groupTargetId(attrGroup)}-approach`}
		data-scroll-item="inline-detached padding-match-end flow"
	>
		{#snippet groupDescription()}
			{#if attrGroup.perWalletQuestion}
				<div data-scroll-item="snap-prose"><Typography content={attrGroup.perWalletQuestion} strings={{ WALLET_NAME: wallet.metadata.displayName }} /></div>
			{/if}
		{/snippet}
		{#snippet groupEnd()}<ScoreBadge
							{score}
							size="medium"
							data-sticky-breadcrumb="end"
							data-row-item="wrap-end"
						>
							<span data-sticky-breadcrumb="size-export size-end" aria-hidden="true"></span>
						</ScoreBadge>{/snippet}
		{@render sectionHeader(groupTargetId(attrGroup), attrGroup.displayName, attrGroup.icon, attrGroup.perWalletQuestion ? groupDescription : undefined, showScores ? groupEnd : undefined)}

		<div data-column>
			<div class="attributes" data-column="gap-7">
				{#each attributes as { attribute, evalAttr }}
					{@render attributeSnippet({
						attrGroupId: attrGroup.id,
						attribute,
						evalAttr,
					})}
				{/each}
			</div>
		</div>
		<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
		<span data-sticky-breadcrumb="approach" aria-hidden="true"></span>
		<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
	</section>
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
		data-sticky-breadcrumb="scope clearance size"
		data-sticky-container
		style:--stickyBreadcrumb-entryTimeline={`--${slugifyCamelCase(attribute.id)}-entry`}
		style:--stickyBreadcrumb-approachTimeline={`--${slugifyCamelCase(attribute.id)}-approach`}
		id={slugifyCamelCase(attribute.id)}
		aria-label={attribute.displayName}
		style:--accent={ratingToColor(evalAttr.evaluation.outcome.rating)}
		style:--accent-textColor={ratingToTextColor(evalAttr.evaluation.outcome.rating)}
		data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
	>
		<details open data-column="gap-0">
			<summary
				data-column="span-start"
				data-icon-metrics={attribute.icon}
				data-sticky-breadcrumb="position"
			>
				<header data-sticky="block block-start backdrop-before backdrop-stuck">
					<div data-row="start wrap" {...destinationState(`#${slugifyCamelCase(attribute.id)}`)}>
						<div data-sticky-breadcrumb="source" data-row-item="flexible">
							<h3 data-sticky-breadcrumb="item" data-row="start gap-2 wrap">
								<a
									data-row="start"
									data-link="camouflaged"
									href={`#${slugifyCamelCase(attribute.id)}`}
								{...destinationState(`#${slugifyCamelCase(attribute.id)}`, true)}
									interestfor={slugifyCamelCase(attribute.id)}
								>
									<span
										aria-hidden="true"
										data-icon="wbicons-complex accent {attribute.icon}"
									></span>
									<span>{attribute.displayName}</span>
								</a>
								{#if showStage}
									{@const { ladderEvaluation, ladderType } = primaryStage}

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
							<span data-sticky-breadcrumb="size-export size-source" aria-hidden="true"></span>
						</div>
						<div
							class="attribute-summary-companions"
							data-sticky-breadcrumb="end contents"
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
							<span data-collapsible-marker aria-hidden="true"></span>
							<span data-sticky-breadcrumb="size-export size-end" aria-hidden="true"></span>
						</div>
						<span data-sticky-breadcrumb="size-export size-row" aria-hidden="true"></span>
					</div>
				</header>
					{#if attribute.question}
						<div class="subsection-caption" data-sticky-breadcrumb="support fade">
							<div data-scroll-item="snap-prose">
								<Typography
									content={attribute.question}
									strings={{ WALLET_NAME: wallet.metadata.displayName }}
								/>
							</div>
						</div>
					{/if}
			</summary>
			<div class="attribute-content" data-column="gap-6">
				<ul
					class="attribute-rating-details"
					data-rating={evalAttr.evaluation.outcome.rating.toLowerCase()}
					data-card="padding-5"
				>
					<li
						data-list-item="gap-3"
						data-scroll-item="snap-prose"
						data-list-item-marker={ratingIcons[evalAttr.evaluation.outcome.rating as Rating]}
					>
						{#if isTypographicContent(evalAttr.evaluation.details)}
							<Typography
								content={evalAttr.evaluation.details}
								strings={{ WALLET_NAME: wallet.metadata.displayName }}
							/>
						{:else if evalAttr.evaluation.details}
						{@const outcome = evalAttr.evaluation.outcome}
						{@const renderData = evaluationDetailRenderData(evalAttr.evaluation.details.component, outcome)}
						{@const references = evalAttr.evaluation.references && toFullyQualified(evalAttr.evaluation.references)}

						<div data-column data-scroll-item="snap-prose">
							{#if renderData.component === 'AddressCorrelationDetails'}
								<AddressCorrelationDetails {...renderData.componentProps} {wallet} />
							{:else if renderData.component === 'PrivateTransfersDetails'}
								<PrivateTransfersDetails {...renderData.componentProps} {wallet} />
							{:else if renderData.component === 'ChainVerificationDetails'}
								<ChainVerificationDetails {...renderData.componentProps} {wallet} refs={references} />
							{:else if renderData.component === 'ScamAlertDetails'}
								<ScamAlertDetails {...renderData.componentProps} {wallet} outcome={renderData.outcome} />
							{:else if renderData.component === 'SecurityAuditsDetails'}
								<SecurityAuditsDetails {...renderData.componentProps} {wallet} metadata={renderData.outcome.metadata} />
							{:else if renderData.component === 'TransactionInclusionDetails'}
								<TransactionInclusionDetails {...renderData.componentProps} {wallet} />
							{:else if renderData.component === 'FundingDetails'}
								<FundingDetails {...renderData.componentProps} {wallet} />
							{:else if renderData.component === 'AccountRecoveryDetails'}
								<AccountRecoveryDetails {...renderData.componentProps} {wallet} metadata={renderData.outcome.metadata} />
							{:else if renderData.component === 'AccountUnruggabilityDetails'}
								<AccountUnruggabilityDetails {...renderData.componentProps} {wallet} metadata={renderData.outcome.metadata} />
							{:else if renderData.component === 'UnratedAttribute'}
								<UnratedAttribute {...renderData.componentProps} {wallet} />
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
					<div class="impact" data-column="gap-6" data-scroll-item="snap-prose">
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

						<section data-column="gap-6" data-scroll-item="snap-prose">
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

						<section class="attribute-rating-methodology" data-column="gap-6" data-scroll-item="snap-prose">
							{#if attribute.methodology}
								<Typography content={attribute.methodology} />
							{:else}
								<p>No methodology information available.</p>
							{/if}

							{#if attribute.ratingScale}
								{#if attribute.ratingScale.display === 'simple'}
									<aside data-card="radius-4" data-scroll-item="snap-prose">
										<Typography content={attribute.ratingScale.content} />
									</aside>
								{:else}
									<aside data-card="radius-4" data-column="gap-5" data-scroll-item="snap-prose">
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

							<section data-column data-scroll-item="snap-prose">
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
		<span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
		<span data-sticky-breadcrumb="approach" aria-hidden="true"></span>
		<span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
	</section>
{/snippet}

<style>
	.container {
		:global(:is(h1, h2, h3, h4, h5, h6)) { overflow-wrap: normal; }
		--stickyBreadcrumb-easing: var(--transition-easeInOutExpo);
		--wallet-icon-size: 3rem;
		---wallet-content-inline-padding: 2rem;
		---wallet-group-heading-font-size: 1.8rem;
		---wallet-compact-icon-size: 32px;
		---pie-compactSize: 128px;
		---pie-compactInset: 8px;
		---pie-compactCenterInline: calc(100vw - var(---pie-compactInset) - var(---pie-compactSize) / 2);
		---pie-compactBlockStart: calc(var(--safeArea-insetTop, 0px) + 20px);
		---pie-compactCenterBlock: calc(var(---pie-compactBlockStart) + var(---pie-compactSize) / 2);
		---pie-clearanceSize: calc(var(---pie-compactSize) + var(--stickyBreadcrumb-gap, 1rem) / 2);
		---wallet-compact-h3: 1rem;
		&[data-sticky-breadcrumb] {
			--stickyBreadcrumb-iconRatio: calc(var(---wallet-compact-icon-size) / var(---wallet-compact-h1));
		}
		---wallet-line-height: 1.6;
		---wallet-attribute-heading-font-size: 1.17rem;
		---wallet-section-icon-gap: 0.875rem;
		---wallet-section-support-gap: 0.1875rem;

		:global {
			[data-sticky-breadcrumb~="scope"]:has(> [data-sticky-breadcrumb~="position"] :is(h2[data-sticky-breadcrumb~="source"], h2[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="item"] > h2), > details > [data-sticky-breadcrumb~="position"] :is(h2[data-sticky-breadcrumb~="source"], h2[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="item"] > h2)) {
				--stickyBreadcrumb-paddingBlock: 1rem;
				--stickyBreadcrumb-sourcePaddingBlock: 1.5rem;
			}
		}

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
		grid-template: 'Header Nav' auto 'Overview Nav' auto 'Content Nav' 1fr / minmax(0, 1fr) auto;

		line-height: var(---wallet-line-height);

		position: relative;

		article {
			grid-area: Content;
			position: relative;
		}

		.page-navigation {
			&[data-sticky-container] {
				--scrollItem-inlineDetached-maxSize: inherit;
				--scrollItem-inlineDetached-paddingStart: 0px;
				--scrollItem-inlineDetached-paddingEnd: 0px;
			}
			> #wallet-toc {
				:global {
					li:has(> details) {
						display: grid;
						grid-template-rows: auto auto;

						/* The snap area shares the header's layout row, outside its press and sticky motion. */
						&::before {
							content: '';
							grid-area: 1 / 1;
							scroll-snap-align: var(---navigation-snapAlign, none);
							pointer-events: none;
						}
						> details {
							display: grid;
							grid-area: 1 / 1 / 3 / 2;
							grid-template-rows: subgrid;

							> summary {
								grid-area: 1 / 1;
							}
						}
					}
				}
			}
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
			z-index: 3;

			position: sticky;
			inset-block-start: var(---wallet-page-block-offset);
			align-self: start;
			&[data-scroll-item] {
				inline-size: var(---wallet-page-navigation-inline-size);
				inset-inline: auto;
			}
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
				flex-flow: row wrap;
				gap: 1rem;
				align-items: start;
				justify-content: center;
				z-index: auto;
				position: static;
				background: none;
				box-shadow: none;

				&[data-scroll-item] {
					inline-size: auto;
					position: static;
				}
				&[data-sticky-container] {
					--scrollItem-inlineDetached-paddingStart: inherit;
					--scrollItem-inlineDetached-paddingEnd: inherit;
				}

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
					overflow-y: auto;

					inline-size: auto;
					block-size: auto;
					min-block-size: 0;

					position: fixed;
					inset: var(--navigation-mobile-blockSize) 0 0;

					background: var(--background-primary);
					opacity: 1;

					transition-property: opacity, translate, display, overlay;
					translate: 0 0 0;
					:global(> .navigation-items) {
						position: relative;

						:global(> menu) {
							isolation: isolate;
						}
						&::after {
							content: "";
							position: absolute;
							inset: 0;
							z-index: 1;
							opacity: 0;
							pointer-events: none;
							backdrop-filter: none;
							transition-property: backdrop-filter;
						}
					}
					@media not (prefers-reduced-transparency: reduce) {
						&:popover-open :global(> .navigation-items::after) {
							transition-property: none;
							animation: wallet-toc-blur var(---wallet-toc-entryDuration, 0.25s)
								var(--transition-easeOutExpo);
						}
						&[data-closing] :global(> .navigation-items::after) {
							opacity: 1;
							backdrop-filter: blur(0.375rem);
						}
					}
					&:not(:popover-open) {
						display: none;

						opacity: 0;

						translate: 0 -0.75rem 1.25rem;
					}
					&:not(:popover-open):not([data-closing]) {
						transition-property: none;
					}
					&:popover-open {
						transition-property: none;
						animation: wallet-toc-entry var(---wallet-toc-entryDuration, 0.25s)
							var(--transition-easeOutExpo);
					}
					&[data-closing] {
						display: flex;
					}
					@media (prefers-reduced-motion: reduce) {
						transition-duration: 0s;
						&:popover-open {
							animation-duration: 0s;
						}
						:global(> .navigation-items::after) {
							transition-duration: 0s;
							animation-duration: 0s;
						}
					}
					@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and
						(width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) and
						(color: if(style(---breadcrumb-wrap: 1): red)) {
						---pie-menuClearanceBlock: max(0px, calc(var(---pie-compactBlockStart) + var(---pie-clearanceSize) - var(--navigation-mobile-blockSize)));

						/* The independent pie stays outside the popover's paint and hit region. */
						clip-path: polygon(
							0 0,
							calc(100% - var(---pie-clearanceSize) - var(---pie-compactInset)) 0,
							calc(100% - var(---pie-clearanceSize) - var(---pie-compactInset)) var(---pie-menuClearanceBlock),
							100% var(---pie-menuClearanceBlock),
							100% 100%,
							0 100%
						);
						&:dir(rtl) {
							clip-path: polygon(
								calc(var(---pie-clearanceSize) + var(---pie-compactInset)) 0,
								100% 0,
								100% 100%,
								0 100%,
								0 var(---pie-menuClearanceBlock),
								calc(var(---pie-clearanceSize) + var(---pie-compactInset)) var(---pie-menuClearanceBlock)
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
										var(---pie-compactSize) - var(---pie-clearanceSize) - var(---inlineDirection) * var(---pie-compactInset)
									) calc(var(---pie-compactCenterBlock) - var(--navigation-mobile-blockSize)),
									arc by calc(2 * var(---pie-clearanceSize) - var(---pie-compactSize)) 0 of
										calc(var(---pie-clearanceSize) - var(---pie-compactSize) / 2) cw,
									arc by calc(var(---pie-compactSize) - 2 * var(---pie-clearanceSize)) 0 of
										calc(var(---pie-clearanceSize) - var(---pie-compactSize) / 2) cw,
									close
								);
							}
						}
						&:popover-open {
							:global(.navigation-items :is(summary, li > a)) {
								---pie-inlineClearance: calc(var(---pie-clearanceSize) + var(---pie-compactInset));
								timeline-scope: --pie-clearance;
								view-timeline: --pie-clearance block;
								view-timeline-inset: calc(var(---pie-compactBlockStart) - var(--navigation-mobile-blockSize)) calc(100% - var(---pie-menuClearanceBlock));
							}
						}
					}
				}
			}
			&[data-wallet-toc-state="open"] > header {
				display: flex;
			}
			&[data-scroll-container] {
				--scrollContainer-perspective: none;
			}
			&[data-sticky-container] {
				isolation: auto;
			}
			@media (width <= 1024px) {
				> #wallet-toc:not(:popover-open):not([data-closing]) {
							flex: 0 1 auto;
							display: flex;
							overflow-y: auto;

							inline-size: max-content;
							min-inline-size: 50%;
							max-inline-size: 100%;
							block-size: var(---pie-size);

							position: relative;
							inset: auto;

							background: none;
							opacity: 1;
							clip-path: none;

					translate: none;
				}
			}
		}

		row-gap: 2rem;

		@media (width <= 1024px) {
			&[data-sticky-container] {
				--sticky-marginInlineStart: 0px;
				--sticky-marginInlineEnd: 0px;
			}
			grid-template: 'Header' 'Overview' 'Nav' 'Content' / minmax(0, 1fr);
		}

		> [data-sticky-breadcrumb~="position"] {
			grid-area: Header;
		}
		> .wallet-header-flow {
			grid-area: Overview;
		}
	}

	:global(#layout:has([data-sticky-breadcrumb~="root"])) {
		/* Keep fixed controls attached to the viewport. */
		--scrollContainer-perspective: none;
		---wallet-page-navigation-inline-size: min(20rem, 320px);
		---wallet-page-block-offset: 0px;
		--scrollContainer-scrollPaddingBlockStart: 0px;

		scroll-snap-type: block proximity;
		@media (prefers-reduced-motion: reduce) {
			scroll-behavior: auto;
		}

		@media (width <= 1024px) {
			---wallet-page-block-offset: var(--navigation-mobile-blockSize);
		}
	}

	:global(#layout:has([data-sticky-breadcrumb~="root"]) > #content) {
		isolation: auto;
	}

	@property ---pie-approachIndex {
		syntax: '<integer>';
		inherits: true;
		initial-value: 0;
	}

	@property ---pie-currentIndex {
		syntax: '<integer>';
		inherits: true;
		initial-value: 0;
	}

	@property ---slice-mid-angle {
		syntax: '<angle>';
		inherits: true;
		initial-value: 0turn;
	}

	.container > article > button,
	[data-sticky-breadcrumb~="root"] > footer {
		display: flex;
		margin-block-end: var(--navigation-controlInsetInline);
		&[data-sticky] {
			--sticky-insetBlockEnd: var(--navigation-controlInsetInline);
		}

	}

	[data-sticky-breadcrumb~="root"] > footer {
		grid-area: Nav;
		align-self: end;
		justify-self: end;
		margin-inline-end: var(--navigation-controlInsetInline);
		&[data-sticky] {
			z-index: 3;
		}
		@media (width <= 1024px) {
			grid-area: Content;
		}
	}
	.container > article > button {
		margin-inline: var(--navigation-controlInsetInline);
		margin-block-start: var(--icon-size, 2rem);
		align-self: end;
		@media (width <= 1024px) {
			align-self: start;
		}
	}

	@property ---pie-highlighted {
		syntax: '<number>';
		inherits: true;
		initial-value: 0;
	}
	@property ---pie-contact {
		syntax: '<number>';
		inherits: false;
		initial-value: 0;
	}
	@keyframes -global-wallet-pie-opacity {
		from { opacity: var(---pie-opacityFrom, 1); }
		to { opacity: var(---pie-opacityTo, 1); }
	}
	@keyframes -global-wallet-pie-scale {
		from { scale: calc(1 + var(---pie-highlightFrom) * (var(--hover-scale) - 1)); }
		to { scale: calc(1 + var(---pie-highlightTo) * (var(--hover-scale) - 1)); }
	}
	@keyframes -global-wallet-pie-highlight {
		from {
			opacity: var(---pie-highlightFrom);
			scale: calc(1 + var(---pie-highlightFrom) * (var(--hover-scale) - 1));
		}
		to {
			opacity: var(---pie-highlightTo);
			scale: calc(1 + var(---pie-highlightTo) * (var(--hover-scale) - 1));
		}
	}
	@keyframes wallet-pie-contact {
		from, to { ---pie-contact: 1; }
	}

	@supports (animation-timeline: scroll()) and (timeline-scope: --link) and (color: if(style(---link-active: 1): red)) {
		@scope (:root) to (details:not([open]) > :not(summary)) {
			.pie-navigation :global(:is(li, details)[data-pressable-name]) {
				animation: link-current auto linear both, wallet-pie-contact auto steps(1, start);
				animation-timeline: var(--link-current, none), var(--pie-contactTimeline);
			}
			.pie-navigation {
				:global(.navigation-items summary > a),
				:global(.navigation-items menu[data-navigation-depth="1"] > li > a) {
					animation:
						link-current auto linear both,
						var(---pie-opacityAnimation, none) auto var(--transition-easeInOutExpo),
						if(style(---pie-interacting: 1): none; else: wallet-pie-scale) auto var(--transition-easeInOutExpo);
					animation-timeline: var(--link-current, none), var(---pie-turn-timeline, none), var(---pie-turn-timeline, none);
					animation-range: normal, var(---pie-turnRange), var(---pie-turnRange);
					@media (prefers-reduced-motion: reduce) {
						animation-timing-function: linear, steps(1, end), steps(1, end);
					}
				}
				.pie-navigation-highlight {
					animation: if(style(---pie-interacting: 1): none; else: wallet-pie-highlight) auto var(--transition-easeInOutExpo);
					animation-timeline: var(---pie-turn-timeline, none);
					animation-range: var(---pie-turnRange);
					@media (prefers-reduced-motion: reduce) {
						animation-timing-function: steps(1, end);
					}
				}
			}
		}
	}

	.pie-navigation-highlight {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		position: absolute;
		inset: 0;
		pointer-events: none;
		filter: var(---pie-highlightFilter);
		opacity: var(---pie-highlighted);
		scale: calc(1 + var(---pie-highlighted) * (var(--hover-scale) - 1));
		transform-origin: var(--pie-originX) var(--pie-originY);
		transform: rotate(calc(var(--slice-midAngle) * 1deg)) translateY(calc(var(--slice-offset) * -1px));
		transition-property: opacity, scale;
		transition-duration: var(---pie-highlightDuration);
		transition-timing-function: var(--transition-easeInOutExpo);
		@media (prefers-reduced-motion: reduce) {
			transition-duration: 0s;
		}
		> span {
			display: block;
			inline-size: 100%;
			block-size: 100%;
			background: var(--slice-fill, var(--accent, var(--background-tertiary)));
		}
	}

	.pie-navigation {
		:global(#top) & .pie-navigation-geometry[data-pressable-state~="related"] {
			---pie-hasRelevant: 1;
		}

		---pie-turnRange: exit-crossing -100% exit-crossing 0%;
		---pie-hasRelevant: 0;
		:global(:is(li, details)[data-pressable-name]) {
			&[data-pressable-state~="exact"] { ---pie-interacting: 1; }
			&[data-pressable-state~="related"] { ---pie-relevant: 1; }

			---pie-relevant: 0;
			---pie-interacting: 0;
			---pie-highlightFrom: 0;
			---pie-highlightTo: 0;
			---pie-highlighted: max(var(---pie-contact), var(---pie-interacting));
			---pie-highlightDuration: if(style(---pie-interacting: 1): var(--pressable-transitionInDuration); style(---pie-contact: 1): 0s; else: var(--pressable-transitionOutDuration));
			--pie-contactTimeline: none;

		}


		display: none;

		@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) {
			animation: breadcrumb-entry auto steps(1, end) forwards, var(---pie-approach-states, none), var(---pie-sourceInlineMeasurement, none);
			animation-timeline: --wallet-entry, var(---pie-approach-timelines, none), --wallet-pie-source-inline;
			animation-range: var(--stickyBreadcrumb-entryRange), var(---pie-approach-ranges, normal), cover 0% cover 100%;
		}

		:global {
			.navigation-items,
			.pie-navigation-icon {
				rotate: calc(-1 * var(---slice-mid-angle, 0deg));
				@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) {
					animation: var(---pie-turn, none) auto var(--transition-easeInOutExpo) both;
					animation-timeline: var(---pie-turn-timeline, none);
					animation-range: var(---pie-turnRange);
					@media (prefers-reduced-motion: reduce) {
						animation-range: exit-crossing 0% exit-crossing 0%;
					}
				}
			}

			a {
				---link-current-source: none;
			}
		}
	}
	.page-navigation {
		@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) {
			animation: var(---pie-rotation-states);
			animation-timeline: var(---pie-rotation-timelines);
			animation-range: exit-crossing -1px entry-crossing 100%;
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
			---pie-scale: tan(atan2(var(---pie-size), calc(var(---pie-diameter) * 1px)));
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
				---pie-opacityAnimation: wallet-pie-opacity;
				&:hover {
					---pie-opacityAnimation: none;
				}
				&:not(:hover) {
					:global(.navigation-items summary > a),
					:global(.navigation-items menu[data-navigation-depth="1"] > li > a) {
						&:not(:active, [data-pressable-state~="pressed"]) {
							opacity: if(style(---pie-relevant: 1): 1; style(---pie-hasRelevant: 1): 0.2; else: 1);
						}
					}
				}

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
				--icon-scale: var(---pie-scale);
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
				opacity: if(style(---breadcrumb-entry: 1): var(---link-active, 0); else: 1);
				visibility: if(
					(not style(---breadcrumb-entry: 1)) or style(---link-active: 1): visible; else: hidden
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

			:global(.navigation-items summary > a),
			:global(.navigation-items menu[data-navigation-depth="1"] > li > a) {
				---slice-mid-angle: calc(var(--slice-midAngle) * 1deg);
				z-index: 1;


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
				&:global(:is(:active, [data-pressable-state~="pressed"])) {
					---pie-opacityAnimation: none;
				}
				&:not(:active, [data-pressable-state~="pressed"]) {
					scale: calc(1 + var(---pie-highlighted, 0) * (var(--hover-scale) - 1));
					opacity: 1;
					@media (prefers-reduced-motion: no-preference) {
						transition-duration: var(---pie-highlightDuration), var(--pressable-transitionOutDuration);
					}
				}
				transition-timing-function: var(--transition-easeInOutExpo);
				@media (prefers-reduced-motion: reduce) {
					transition-duration: 0s;
				}
			}

			:global(.navigation-items a:is(:hover, :focus-visible, :interest-source)) {

				outline: none;
			}

			:global(.navigation-items menu[data-navigation-depth="1"] > li > a) {
				z-index: 1;
			}

			:global(.navigation-items a > .pie-navigation-icon) {
				--icon-size: calc(var(--slice-labelSize) * 1px);

				position: absolute;
				inset: var(--pie-originY) auto auto var(--pie-originX);
				translate: -50% calc(-50% - var(--slice-labelR) * 1px);
				---pie-rotationDirection: -1;
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

		@media (width <= 1024px) {
			.container .page-navigation {
				padding-block-start: 0;
				&[data-scroll-container] {
					overflow: visible;
				}
				--sticky0-insetBlockStart: 0px;
				--sticky-insetBlockStart: 0px
			}

			.container .page-navigation > .pie-navigation[data-sticky][data-sticky] {
				position: relative;
				inset: auto;
				align-self: center;
				inline-size: min(100%, var(---pie-size));

				@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and
					(width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) and
					(color: if(style(---breadcrumb-wrap: 1): red)) {
					z-index: auto;
					anchor-name: --wallet-pie-source;
					---pie-sourceInlineMeasurement: wallet-pie-source-inline auto linear both;

					view-timeline-name: --wallet-pie-source, --wallet-pie-source-inline;
					view-timeline-axis: block, inline;
					view-timeline-inset: var(---pie-compactBlockStart) 0, 0;

					&:is([data-wallet-toc-state="open"], [data-wallet-toc-state="closing"]) .pie-navigation-geometry,
					&:is([data-wallet-toc-state="open"], [data-wallet-toc-state="closing"])::before {
						animation-name: none;
					}

					&::before {
						display: block;
						clip-path: circle(calc(var(---pie-size) / 2));
						block-size: var(---pie-size);
						---pie-backdropAnimation: breadcrumb-backdrop auto var(--transition-easeInOutExpo) both;
						z-index: 1;
						pointer-events: none;
					}
					.pie-navigation-geometry {
						z-index: 3;
					}
					.pie-navigation-geometry,
					&::before {
						position: fixed;

						position-visibility: always;
						translate: 0 0;
						/* A native TOC opening uses the same compact endpoint as scrolling. */
						transform: translateX(
								calc(
									var(---inlineDirection) * (
										100vw - var(---pie-sourceInlineOffset) - 100% - var(---pie-compactInset) +
										(100% - var(---pie-size)) / 2 * var(---pie-compactSize) / var(---pie-size)
									)
								)
							)
							scale(calc(var(---pie-compactSize) / var(---pie-size)));
						animation:
							wallet-pie-source auto linear both,
							wallet-pie-compact auto var(--transition-easeInOutExpo) both,
							var(---pie-backdropAnimation, none);
						@media (prefers-reduced-motion: reduce) {
							animation-timing-function: linear, steps(1, end), linear;
						}
						animation-timeline:
							--wallet-pie-source, --wallet-pie-source,
							var(--stickyBreadcrumb-entryTimeline);
						animation-range:
							cover 0% exit-crossing 0%,
							exit-crossing 0px exit-crossing calc(var(---pie-size) - var(---pie-compactSize)),
							var(--stickyBreadcrumb-entryRange);
						inset-block-start: var(---pie-compactBlockStart);
						inset-inline-start: anchor(--wallet-pie-source inside);
						inline-size: anchor-size(--wallet-pie-source inline);
						margin: 0;
						transform-origin: 100% 0;
						&:dir(rtl) {
							transform-origin: 0 0;
						}
					}
				}

				/* At badge size the attribute icons are a few pixels wide; the colors carry the meaning. */
				:global(.navigation-items menu[data-navigation-depth='1'] .pie-navigation-icon) {
					display: none;
				}
			}
		}
	}


	[data-sticky-breadcrumb~="root"] {
		@media (scripting: none) {
			.wallet-device-controls,
			> article > button,
			> footer {
				display: none;
			}
		}
		& > [data-sticky-breadcrumb~="flow"] > [data-scroll-item~="snap-block-start"] {
			display: none;
		}
		timeline-scope:
			var(--link-timelines, --wallet-links), var(---pie-rotation-timelines, --wallet-links), var(---pie-approach-timelines, --wallet-links),
			var(---breadcrumb-rowInlineTimeline), var(---breadcrumb-rowBlockTimeline);
		@media (width > 1024px) {
			timeline-scope:
				var(--link-timelines, --wallet-links), var(---pie-rotation-timelines, --wallet-links), var(---pie-approach-timelines, --wallet-links),
				var(---breadcrumb-itemTimelines), var(--stickyBreadcrumb-entryTimeline),
				var(---breadcrumb-rowInlineTimeline), var(---breadcrumb-rowBlockTimeline);
		}
	}

	@supports (timeline-scope: all) and (view-timeline-name: ident("a" "b")) {
		[data-sticky-breadcrumb~="root"] {
			timeline-scope: var(--link-timelines, --wallet-links), var(---pie-rotation-timelines, --wallet-links), var(---pie-approach-timelines, --wallet-links);
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
			z-index: 2;
			align-self: start;
			inline-size: max-content;
			max-inline-size: 100%;
		}

		.wallet-title-source {
			flex-basis: max-content;
			font-size: var(---wallet-name-flow-font-size);
		}

		.wallet-title-row {
			flex-basis: max-content;
			min-inline-size: 0;
			h1 {
				min-inline-size: 0;
			}
			> .wallet-device-controls {
				flex-shrink: 0;
				font-size: 1rem;
			}
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
		flex-shrink: 0;
		inline-size: auto;
		block-size: var(--wallet-icon-size);
		filter: drop-shadow(0 0 0.5rem rgba(255, 255, 255, 0.1));
	}

	.wallet-overview {
		font-size: 0.9rem;
	}

	:global([data-sticky-breadcrumb~="scope"]) > header:has(h2) {
			min-inline-size: 0;
			padding-block: var(--stickyBreadcrumb-sourcePaddingBlock);
			font-size: var(---wallet-group-heading-font-size);

			h2 {
				font-size: 1em;
				font-weight: 700;
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

	:global([data-sticky-breadcrumb~="position"][data-column~="span-start"]:has(h2, h3)) {
		--column-spanSize: calc(
			(1lh + var(--column-supportLineHeight, 1rlh) + var(--column-supportGap, 0.5rem)) *
				1.1
		);
	}

	:global([data-sticky-breadcrumb~="scope"]:not([data-sticky-breadcrumb~="root"])) {
		--column-iconGap: var(---wallet-section-icon-gap);
		--column-supportGap: var(---wallet-section-support-gap);
	}


	.attribute {
		position: relative;

		> details > summary {
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
				}
			}

		}
	}

	.pie-navigation-icon {
		color: #fff;
		filter: opacity(0.75) drop-shadow(1px 2px 3px rgb(0 0 0 / 0.15));
	}

	@property ---pie-sourceInlineOffset {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}

	@property ---pie-inlineSpace {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}
	@property ---pie-blockProgress {
		syntax: '<number>';
		inherits: false;
		initial-value: 0;
	}
	@keyframes -global-pie-block {
		from { ---pie-blockProgress: 0; }
		to { ---pie-blockProgress: 1; }
	}
	/* Chromium resolves var() easing in range keyframes to linear; match the global Expo curves. */
	@keyframes -global-pie-clearance {
		entry 0% {
			transform: translateX(0);
			animation-timing-function: cubic-bezier(0.87, 0, 0.13, 1);
		}
		entry 100%,
		exit 0% {
			transform: translateX(calc(-1 * var(---inlineDirection) * var(---pie-inlineClearance)));
			animation-timing-function: cubic-bezier(0.87, 0, 0.13, 1);
		}
		exit 100% {
			transform: translateX(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		/* Keyframe easing requires literal values. */
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
			---pie-inlineSpace: calc(-1 * (var(---pie-compactSize) + var(---pie-compactInset)));
		}
		to {
			---pie-inlineSpace: calc(var(--scrollContainer-sizeInline) - var(---pie-compactSize) - var(---pie-compactInset));
		}
	}

	@keyframes -global-wallet-toc-blur {
		from {
			opacity: 1;
			backdrop-filter: blur(0.375rem);
		}
		to {
			opacity: 1;
			backdrop-filter: blur(0);
		}
	}

	@keyframes -global-wallet-toc-entry {
		from {
			opacity: 0;

			translate: 0 -0.75rem 1.25rem;
		}
	}

	@keyframes -global-wallet-pie-compact {
		from {
			transform: translateX(0) scale(1);
		}
	}
	@keyframes -global-wallet-pie-source-inline {
		from {
			---pie-sourceInlineOffset: 100vw;
		}
		to {
			---pie-sourceInlineOffset: calc(-1 * var(---pie-size));
		}
	}

	@keyframes -global-wallet-pie-source {
		from {
			translate: 0 calc(var(--scrollContainer-sizeBlock) - var(---pie-compactBlockStart));
		}
	}

	@supports (animation-timeline: scroll()) and (animation-range: 0% 100%) and
		(width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) and
		(color: if(style(---breadcrumb-wrap: 1): red)) {
		@media (width <= 1024px) {
			[data-sticky-breadcrumb~="root"] {
				--stickyBreadcrumb-clearance: circle;
				--stickyBreadcrumb-clearanceGap: var(--stickyBreadcrumb-gap, 1rem);
				:global(article) {
					--collapsible-markerMotion: clearance;
					--collapsible-markerClearanceRadius: calc(var(---pie-compactSize) / 2 * var(---pie-radiusRatio));
					--collapsible-markerClearanceCenterInline: var(---pie-compactCenterInline);
					--collapsible-markerClearanceCenterBlock: var(---pie-compactCenterBlock);
				--collapsible-markerAnimation: pie-clearance auto linear both;
				--collapsible-markerTimeline: view(block var(---pie-compactBlockStart) calc(100vh - var(---pie-compactBlockStart) - var(---pie-compactSize)));
				--collapsible-markerRange: cover 0% cover 100%;
				---pie-inlineClearance: calc(var(---pie-compactInset) + var(---pie-compactSize) / 2 * (1 + var(---pie-radiusRatio)));
				}
			}
			@scope (:root) to (details:not([open]), [data-sticky-breadcrumb~="scope"]:has(> details:not([open]))) {
				[data-sticky-breadcrumb~="root"]
					:global([data-sticky-breadcrumb~="scope"]:not([data-sticky-breadcrumb~="root"])) {
					&:dir(rtl) {
						animation-direction: normal, normal, normal, normal, normal, normal, normal, reverse;
						&[data-sticky-breadcrumb~="size"] {
							animation-direction: normal, normal, normal, normal, normal, normal, normal, normal, normal, normal, normal, normal, normal, reverse;
						}
					}
					---pie-inlineTimeline: --pie-inline;
					timeline-scope:
						var(---breadcrumb-sizeTimelines), var(--stickyBreadcrumb-entryTimeline), var(---pie-inlineTimeline);
					@supports (timeline-scope: all) and (view-timeline-name: ident("a" "b")) {
						---pie-inlineTimeline: ident(var(--stickyBreadcrumb-entryTimeline) "-pie-inline");
						timeline-scope: none;
					}
					animation-name: var(---breadcrumb-sizeAnimationNames), pie-inline;
					animation-timeline: var(---breadcrumb-sizeTimelines), var(---pie-inlineTimeline);
					> :global(*) {
						--stickyBreadcrumb-availableInlineSize: calc(var(---pie-inlineSpace) - var(--stickyBreadcrumb-gap, 1rem) / 2);
					}
					&[data-sticky-breadcrumb~="size"] {
						animation-range: var(---breadcrumb-sizeRanges), cover 0% cover 100%;
					}
				}
				[data-sticky-breadcrumb~="root"]
					:global(:is(.attribute-group, .attribute, #stages, #stages section)[data-sticky-breadcrumb~="scope"]) {
					timeline-scope: var(---breadcrumb-sizeTimelines), var(---pie-inlineTimeline);
					@supports (timeline-scope: all) and (view-timeline-name: ident("a" "b")) {
						timeline-scope: none;
					}
				}
				[data-sticky-breadcrumb~="root"]
					:global(
						article summary:has(> [data-column~="span-start"]):not([data-sticky-breadcrumb~="position"])
					) {
					timeline-scope: --pie-inline, var(--collapsible-markerInlineTimeline, --collapsible-marker-inline);
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
					---pie-inlineTimeline: --pie-inline;
					animation-name: column-inline-size, column-block-size, pie-inline;
					animation-timeline: var(---column-sizeTimelines), var(---pie-inlineTimeline);
				}
				[data-sticky-breadcrumb~="root"] :global(article [data-sticky-breadcrumb~="position"]) {
					---pie-inlineClearance: clamp(
						0px,
						calc(
							var(---breadcrumb-sourceRowWidth) +
								var(--stickyBreadcrumb-sourcePaddingInline) - var(---pie-inlineSpace) +
							var(--stickyBreadcrumb-gap, 1rem) / 2
						),
						var(---pie-clearanceSize)
					);
				}
				[data-sticky-breadcrumb~="root"] :global(#wallet-toc:popover-open .navigation-item-after),
				[data-sticky-breadcrumb~="root"] :global(#wallet-toc:popover-open summary::after) {
					/* Depart quickly and return late so both sides clear the pie. */
					animation: pie-clearance auto linear both;
					animation-timeline: --pie-clearance;
					animation-range: cover 0% cover 100%;
				}

				[data-sticky-breadcrumb~="root"] :global(article [data-sticky-breadcrumb~="end"]:not(.attribute-group *)) {
					@container not style(---collapsible-markerSupported: 1) {
						--stickyBreadcrumb-endPaintAnimation:
							var(---breadcrumb-arrivalAnimation, breadcrumb-arrival) auto var(---breadcrumb-endPaintEasing) both,
							pie-clearance auto linear both;
						---pie-clearanceTimeline: --pie-clearance;
						--stickyBreadcrumb-endPaintTimeline: var(--stickyBreadcrumb-entryTimeline), var(---pie-clearanceTimeline);
						--stickyBreadcrumb-endPaintRange: var(--stickyBreadcrumb-entryRange), cover 0% cover 100%;
						/* Native layout timing approximates transformed contact without resolving transformed anchors. */
						timeline-scope: --pie-clearance;
						view-timeline: var(---pie-clearanceTimeline) block;
						@supports (timeline-scope: all) and (view-timeline-name: ident("a" "b")) {
							---pie-clearanceTimeline: ident(var(--stickyBreadcrumb-entryTimeline) "-pie-clearance");
							timeline-scope: none;
						}
						view-timeline-inset: var(---pie-compactBlockStart)
								calc(100vh - var(---pie-compactBlockStart) - var(---pie-compactSize));
					}
				}
				[data-sticky-breadcrumb~="root"] :global([data-sticky-breadcrumb~="scope"][data-sticky-breadcrumb~="clearance"]) {
					--stickyBreadcrumb-clearanceCenterBlock: var(---pie-compactCenterBlock);
					> :global(*) {
					--stickyBreadcrumb-clearanceRadius: calc(var(---pie-compactSize) / 2 * var(---pie-radiusRatio));
					--stickyBreadcrumb-clearanceInlineOffset: calc(-1 * var(---pie-compactSize) / 2 + var(---breadcrumb-sourceRowWidth) + var(--stickyBreadcrumb-sourcePaddingInline) - var(---pie-inlineSpace));
				}
				}

				[data-sticky-breadcrumb~="root"]
					:global(article [data-column~="span-start"] > [data-row]:not([data-row-item~="wrap-end"])::after),
				[data-sticky-breadcrumb~="root"]
					:global(article [data-column~="span-start"] > :is(header, [data-sticky]) > [data-row]:not([data-row-item~="wrap-end"])::after) {
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
					view-timeline: var(---pie-inlineTimeline, --pie-inline) inline;
				}
			}
		}
		[data-sticky-breadcrumb~="root"] {
			grid-template: "Header Nav" auto "Content Nav" 1fr / minmax(0, 1fr) auto;
			> .wallet-header-flow { grid-area: Header; }
			@media (width <= 1024px) {
				grid-template: "Header" "Nav" "Content" / minmax(0, 1fr);
			}
			& > [data-sticky-breadcrumb~="flow"] > [data-scroll-item~="snap-block-start"] {
				display: block;
				inline-size: 1px;
				block-size: 1px;
				position: absolute;
				inset-block-start: 100%;
				inset-inline-start: 0;
			}
			---wallet-compactFontSize: var(---wallet-compact-h1);
			--stickyBreadcrumb-scale: calc(var(---wallet-compactFontSize) / var(---wallet-name-flow-font-size));
			--stickyBreadcrumb-insetBlockStart: var(--sticky-insetBlockStart);
			--stickyBreadcrumb-minBlockSize: var(---wallet-compact-icon-size);
			@media (width > 1024px) {
				--stickyBreadcrumb-minBlockSize: max(
					var(---wallet-compact-icon-size),
					calc(var(--navigation-mobile-blockSize) - 2 * var(--stickyBreadcrumb-paddingBlock, 0.5rem))
				);
			}
			@media (width <= 1024px) {
				--stickyBreadcrumb-exitAnimation: none;
			}
			> [data-sticky-breadcrumb~="position"] {
				--stickyBreadcrumb-sourcePaddingBlock: min(
					var(--scrollItem-paddingInlineMatch),
					var(--scrollItem-inlineDetached-maxPaddingMatchStart)
				);
				--stickyBreadcrumb-sourcePaddingInline: 0px;
				align-self: start;
				anchor-name: none;
				.wallet-title-source {
					align-self: start;
					anchor-name: --breadcrumb-source, --column-firstRow;
					&::before {
						inline-size: calc(
							(
									round(up, anchor-size(--breadcrumb-source inline), 0.0625px) +
										var(---breadcrumb-iconInlineCorrection, var(---breadcrumb-iconCorrection)) -
										(
											anchor-size(--wallet-version-natural inline, 0px) -
												anchor-size(--wallet-version-visual inline, 0px) +
												anchor-size(--wallet-model-natural inline, 0px) -
												anchor-size(--wallet-model-visual inline, 0px)
										) *
										round(up, anchor-size(--breadcrumb-source inline), 0.0625px) / anchor-size(--wallet-title-visual inline)
								) *
								var(--stickyBreadcrumb-scale)
						);
					}
				}
				[data-sticky-breadcrumb~="source"] {
					---breadcrumb-iconCorrection: calc(
						(var(---wallet-compact-icon-size) / var(--stickyBreadcrumb-scale) - var(--wallet-icon-size)) * var(--wallet-icon-aspectRatio, 1)
					);
				}
				.wallet-icon {
					transform-origin: calc(50% - 50% * var(---inlineDirection)) 50%;
					--stickyBreadcrumb-iconScale: calc(
						var(---wallet-compact-icon-size) / var(--wallet-icon-size)
					);
				}
			}
		}
		.container {
			&[data-sticky-breadcrumb~="scope"],
			:global([data-sticky-breadcrumb~="scope"]),
			:global([data-sticky-container]:not([data-sticky-breadcrumb]) > summary[data-sticky~="block-start"]:has(h4)) {
				--stickyBreadcrumb-paddingBlock: calc(
					0.75rem * var(---wallet-compactFontSize) / var(---wallet-compact-h1)
				);
			}
			:global([data-sticky-container]:not([data-sticky-breadcrumb]) > summary[data-sticky~="block-start"]:has(h4)) {
				---wallet-compactFontSize: 0.875rem;

				:global(h4) {
					font-size: var(---wallet-compactFontSize);
				}
			}
		}

		:global(:is(.attribute-group, .attribute, #stages, #stages section)[data-sticky-breadcrumb~="scope"]) {
			/* Arrival clocks are shared with the pie at their common wallet-page owner. */
			timeline-scope: var(---breadcrumb-sizeTimelines);
			@supports (timeline-scope: all) and (view-timeline-name: ident("a" "b")) {
				timeline-scope: none;
			}
		}
		:global([data-sticky-breadcrumb~="scope"]:has(> header[data-sticky-breadcrumb~="position"] [data-sticky-breadcrumb~="item"] > h2)) {
			---wallet-compactFontSize: calc((var(---wallet-compact-h1) + var(---wallet-compact-h3)) / 2);
			--stickyBreadcrumb-scale: calc(var(---wallet-compactFontSize) / var(---wallet-group-heading-font-size));
			> header {
				--stickyBreadcrumb-sourcePaddingInline: 0px;
			}
			@media (width <= 1024px) {
				--stickyBreadcrumb-forceRow: 1;
			}
		}
		:global([data-sticky-breadcrumb~="scope"]:has(> [data-sticky-breadcrumb~="position"] :is(h3[data-sticky-breadcrumb~="source"], h3[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="item"] > h3), > details > [data-sticky-breadcrumb~="position"] :is(h3[data-sticky-breadcrumb~="source"], h3[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="item"] > h3))) {
			---wallet-compactFontSize: var(---wallet-compact-h3);
			--stickyBreadcrumb-scale: calc(var(---wallet-compactFontSize) / var(---wallet-attribute-heading-font-size));
		}
		.wallet-device-controls {
			display: grid;

			grid-auto-flow: column;
			grid-auto-columns: max-content;
		}
		.wallet-title-row {
			anchor-name: --wallet-title-visual;
		}
		.wallet-header-flow {
			anchor-name: --breadcrumb-position;
			&::before {
				flex: 0 1 auto;

				inline-size: var(---breadcrumb-sourceRowWidth);
				block-size: var(---breadcrumb-itemHeight);
				max-inline-size: 100%;

				content: '';
			}
			.wallet-overview {
				flex-basis: 100%;

				margin-block-start: 0.5rem;
			}
		}
	}
</style>
