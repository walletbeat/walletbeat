export function qualifyNativeBreadcrumbClock() {
	const applicable = [
		'animation-timeline: scroll()',
		'animation-range: 0% 100%',
		'width: anchor-size(--breadcrumb-source inline)',
		'timeline-scope: --breadcrumb-size',
		'color: if(style(---breadcrumb-wrap: 1): red)',
	].every(feature => CSS.supports(feature))

	if (!applicable) {
		return { applicable, resolved: true, expectedTimeline: null, effects: [] }
	}

	const position = document.querySelector('#top > [data-sticky-breadcrumb~="position"]')
	const expectedTimeline = position
		? getComputedStyle(position).getPropertyValue('--stickyBreadcrumb-entryTimeline').trim()
		: ''
	const effects = position
		? position
				.getAnimations()
				.filter(
					animation =>
						animation instanceof CSSAnimation &&
						animation.animationName === 'breadcrumb-entry' &&
						animation.effect instanceof KeyframeEffect &&
						animation.effect.target === position &&
						!animation.effect.pseudoElement,
				)
				.map(animation => ({
					name: animation instanceof CSSAnimation ? animation.animationName : null,
					timelineClass: animation.timeline?.constructor.name ?? null,
					timelineResolved:
						animation.timeline !== null && !(animation.timeline instanceof DocumentTimeline),
					timelineTime:
						animation.timeline?.currentTime == null ? null : String(animation.timeline.currentTime),
					currentTime: animation.currentTime == null ? null : String(animation.currentTime),
					progress: animation.effect?.getComputedTiming().progress ?? null,
					fill: animation.effect?.getTiming().fill ?? null,
					playState: animation.playState,
				}))
		: []

	return {
		applicable,
		resolved:
			expectedTimeline.startsWith('--') &&
			effects.length === 1 &&
			effects.every(
				effect =>
					effect.timelineResolved && effect.timelineTime !== null && effect.currentTime !== null,
			),
		expectedTimeline,
		effects,
	}
}

export function selectStickyChain() {
	const details = [
		...document.querySelectorAll(
			'#top .attribute-group .attribute > details .attribute-accordions > details[open][id]',
		),
	]
		.filter(element => element.querySelector(':scope > summary h4'))
		.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]

	if (!details) {
		throw new Error('The fixture must expose a real disclosed H4 scope')
	}

	const attribute = details.closest('section.attribute')
	const group = attribute?.closest('.attribute-group')

	if (!attribute || !group) {
		throw new Error('The H4 scope requires its attribute and group')
	}

	return [
		{ level: 1, scope: '#top', heading: '#top h1' },
		{
			level: 2,
			scope: '#' + CSS.escape(group.id),
			heading: '#' + CSS.escape(group.id) + ' > header h2',
		},
		{
			level: 3,
			scope: '#' + CSS.escape(attribute.id),
			heading: '#' + CSS.escape(attribute.id) + ' > details > summary h3',
		},
		{
			level: 4,
			scope: '#' + CSS.escape(details.id),
			heading: '#' + CSS.escape(details.id) + ' > summary h4',
		},
	]
}

/** @param {{level: number, scope: string, heading: string}[]} chain */
export function observeStickyChain(chain) {
	const root = document.querySelector('#layout')
	const content = document.querySelector('#content')

	if (!root || !content) {
		throw new Error('Sticky observations require the page scroll root and content')
	}

	const frame = content.getBoundingClientRect()
	/** @param {DOMRectReadOnly} box */
	const bounds = ({ x, y, width, height, top, right, bottom, left }) => ({
		x,
		y,
		width,
		height,
		top,
		right,
		bottom,
		left,
	})

	/** @overload @param {Element} element @returns {ReturnType<typeof bounds>} */
	/** @overload @param {Element | null} element @returns {ReturnType<typeof bounds> | null} */
	/** @param {Element | null} element @returns {ReturnType<typeof bounds> | null} */
	function rect(element) {
		return element ? bounds(element.getBoundingClientRect()) : null
	}
	const site = document.querySelector('#nav > header')?.getBoundingClientRect()
	const rows = chain.map(owner => {
		const scope = document.querySelector(owner.scope)
		const heading = document.querySelector(owner.heading)

		if (!scope || !heading) {
			throw new Error('The sticky owner requires its real scope and heading')
		}

		const row =
			heading.closest('[data-sticky~="backdrop-self"]') ??
			heading.closest('[data-sticky~="block-start"]') ??
			heading
		const position = heading.closest('[data-sticky-breadcrumb~="position"]') ?? row
		/** @param {Element} element */
		const visible = element =>
			element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
		/** @param {Element} element */
		const ownsForeground = element =>
			(element.closest('[data-sticky-breadcrumb~="position"]') ??
				element.closest('summary[data-sticky]') ??
				row) === position
		const paintOwners = [
			position,
			...position.querySelectorAll(
				'[data-sticky~="backdrop-self"], [data-sticky~="backdrop-before"], [data-sticky~="backdrop-after"]',
			),
		].filter(
			(element, index, elements) =>
				elements.indexOf(element) === index &&
				(element === position ||
					element.closest('[data-sticky-breadcrumb~="position"]') === position),
		)
		const painted = paintOwners.flatMap(element => {
			const box = element.getBoundingClientRect()

			const pseudos = [
				...(element.matches('[data-sticky~="backdrop-before"]') ? ['::before'] : []),
				...(element.matches('[data-sticky~="backdrop-after"]') ? ['::after'] : []),
			]

			return pseudos
				.map(pseudo => {
					const style = getComputedStyle(element, pseudo)
					const visiblePaint =
						style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
						(style.backdropFilter && style.backdropFilter !== 'none')

					if (
						!style.content ||
						style.content === 'none' ||
						style.display === 'none' ||
						style.visibility === 'hidden' ||
						Number(style.opacity) <= 0.01 ||
						!visiblePaint
					) {
						return null
					}

					const inputs = {
						width: style.width,
						height: style.height,
						top: style.top,
						left: style.left,
						transformOrigin: style.transformOrigin,
						transform: style.transform,
						translate: style.translate,
						scale: style.scale,
						rotate: style.rotate,
					}
					const description = {
						pseudo,
						positionOwner: element === position,
						owner: element.tagName,
						background: style.backgroundColor,
						inputs,
					}
					/** @param {string} value @param {number} basis */
					const length = (value, basis) => {
						if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|%)?$/.test(value)) {
							return parseFloat(value) * (value.endsWith('%') ? basis / 100 : 1)
						}

						throw new Error('Unsupported native length: ' + value)
					}

					try {
						const width = length(style.width, element.clientWidth)
						const height = length(style.height, element.clientHeight)

						if (!(height > 0) || !(width > 0)) {
							return null
						}

						const originTokens = style.transformOrigin.split(/\s+/)
						const origin = [length(originTokens[0], width), length(originTokens[1], height)]
						const translateTokens =
							style.translate === 'none' ? ['0', '0'] : style.translate.split(/\s+/)

						if (translateTokens.length > 2 || style.rotate !== 'none') {
							throw new Error('Unsupported native individual rotation or 3D translate')
						}

						const translation = [
							length(translateTokens[0], width),
							length(translateTokens[1] ?? '0', height),
						]
						const scaleTokens = style.scale === 'none' ? ['1', '1'] : style.scale.split(/\s+/)

						if (
							scaleTokens.length > 2 ||
							!scaleTokens.every(token => /^-?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(token))
						) {
							throw new Error('Unsupported native scale')
						}

						const scale = scaleTokens.map(
							token => parseFloat(token) / (token.endsWith('%') ? 100 : 1),
						)
						const transform =
							style.transform === 'none'
								? new DOMMatrixReadOnly()
								: new DOMMatrixReadOnly(style.transform)

						if (!transform.is2D) {
							throw new Error('Unsupported native 3D transform')
						}

						const matrix = new DOMMatrix()
							.translate(translation[0], translation[1])
							.translate(origin[0], origin[1])
							.scale(scale[0], scale[1] ?? scale[0])
							.multiply(transform)
							.translate(-origin[0], -origin[1])
						const points = [
							[0, 0],
							[width, 0],
							[0, height],
							[width, height],
						].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix))
						const top =
							box.top +
							element.clientTop +
							length(style.top, element.clientHeight) +
							Math.min(...points.map(point => point.y))
						const bottom =
							box.top +
							element.clientTop +
							length(style.top, element.clientHeight) +
							Math.max(...points.map(point => point.y))

						const left =
							box.left +
							element.clientLeft +
							length(style.left, element.clientWidth) +
							Math.min(...points.map(point => point.x))
						const right =
							box.left +
							element.clientLeft +
							length(style.left, element.clientWidth) +
							Math.max(...points.map(point => point.x))

						return {
							...description,
							left,
							right,
							top,
							bottom,
							width: right - left,
							height: bottom - top,
						}
					} catch (error) {
						return { ...description, unsupported: String(error) }
					}
				})
				.filter(surface => surface !== null)
		})
		const selfSurfaces = paintOwners.flatMap(element => {
			const style = getComputedStyle(element)
			const box = element.getBoundingClientRect()
			const hasPaint =
				style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
				style.backgroundImage !== 'none' ||
				(style.backdropFilter && style.backdropFilter !== 'none')

			return element.matches('[data-sticky~="backdrop-self"]') &&
				visible(element) &&
				style.display !== 'contents' &&
				box.width > 0 &&
				box.height > 0 &&
				hasPaint
				? [
						{
							positionOwner: element === position,
							owner: element.tagName,
							source: 'actual-backdrop-self',
							...bounds(box),
						},
					]
				: []
		})
		const allSurfaces = [...painted, ...selfSurfaces]
		const positionSurfaces = allSurfaces.filter(surface => surface.positionOwner)
		const surfaces = positionSurfaces.length ? positionSurfaces : allSurfaces
		const unsupported = surfaces.filter(surface => 'unsupported' in surface)

		if (unsupported.length) {
			throw new Error('Inconclusive painted sticky bounds: ' + JSON.stringify(unsupported))
		}

		const resolvedSurfaces = surfaces.filter(surface => 'top' in surface)
		const foreground = [
			heading,
			...position.querySelectorAll(
				'[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="end"]',
			),
		]
			.filter(element => ownsForeground(element) && visible(element))
			.map(element => element.getBoundingClientRect())
			.filter(box => box.width > 0 && box.height > 0)

		if (!resolvedSurfaces.length && !foreground.length && visible(heading)) {
			throw new Error(
				'Inconclusive occupied sticky bounds: visible owner has no foreground or surface box',
			)
		}

		const occupiedRow = resolvedSurfaces.length
			? {
					top: Math.min(...resolvedSurfaces.map(surface => surface.top)),
					bottom: Math.max(...resolvedSurfaces.map(surface => surface.bottom)),
				}
			: {
					top: foreground.length ? Math.min(...foreground.map(box => box.top)) : 0,
					bottom: foreground.length ? Math.max(...foreground.map(box => box.bottom)) : 0,
				}
		const endBoxes = [...position.querySelectorAll('[data-sticky-breadcrumb~="end"]')]
			.filter(
				element =>
					element.closest('[data-sticky-breadcrumb~="position"]') === position &&
					getComputedStyle(element).visibility !== 'hidden' &&
					Number(getComputedStyle(element).opacity) > 0.01,
			)
			.map(element => ({ text: (element.textContent ?? '').trim(), box: rect(element) }))
		const support =
			position.querySelector('.section-caption > div, .subsection-caption > div') ??
			position.querySelector('p') ??
			(owner.level === 1
				? scope.querySelector('.wallet-overview > p')
				: owner.level === 4
					? scope.querySelector(':scope > section p')
					: null)
		let opacity = 1

		for (let element = heading; element && element !== root; element = element.parentElement) {
			opacity *= Number(getComputedStyle(element).opacity)
		}
		const range = document.createRange()
		const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
		/** @type {ReturnType<typeof bounds>[]} */
		const lines = []

		while (walker.nextNode()) {
			const text = walker.currentNode

			if (!(text.textContent ?? '').trim() || text.parentElement?.closest('[aria-hidden="true"]')) {
				continue
			}

			range.selectNodeContents(text)
			lines.push(...[...range.getClientRects()].map(bounds))
		}
		const style = getComputedStyle(heading)
		const effects = [heading, position].map(element => ({
			tag: element.tagName,
			className: element.className,
			transform: getComputedStyle(element).transform,
			translate: getComputedStyle(element).translate,
			scale: getComputedStyle(element).scale,
			timeline: getComputedStyle(element).animationTimeline,
			rangeStart: getComputedStyle(element).animationRangeStart,
			rangeEnd: getComputedStyle(element).animationRangeEnd,
			animations: element.getAnimations().map(animation => ({
				name: animation instanceof CSSAnimation ? animation.animationName : null,
				currentTime: String(animation.currentTime),
				timelineTime: String(animation.timeline?.currentTime),
				progress: animation.effect?.getComputedTiming().progress,
				easing: animation.effect?.getTiming().easing,
			})),
		}))

		return {
			...owner,
			effects,
			occupiedRow,
			surfaces: resolvedSurfaces,
			painted,
			endBoxes,
			positionBox: rect(position),
			scopeBox: rect(scope),
			headingBox: rect(heading),
			rowBox: rect(row),
			supportBox: rect(support),
			supportText: support?.textContent?.trim() ?? null,
			lines,
			opacity,
			visibility: style.visibility,
			fontSize: parseFloat(style.fontSize),
			scopeOpen: scope instanceof HTMLDetailsElement ? scope.open : null,
		}
	})

	return {
		scroll: root.scrollTop,
		range: root.scrollHeight - root.clientHeight,
		viewport: { width: innerWidth, height: innerHeight },
		frame: bounds(frame),
		siteBottom:
			site &&
			site.bottom > 0 &&
			site.bottom < innerHeight / 2 &&
			Math.min(site.right, frame.right) > Math.max(site.left, frame.left)
				? site.bottom
				: 0,
		rows,
	}
}
