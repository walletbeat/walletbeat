import assert from 'node:assert/strict'

import sharp from 'sharp'
export type Region = { left: number; top: number; right: number; bottom: number }
export type Box = { x: number; y: number; width: number; height: number }
export type Paint = { mask: number[]; box: Box | null }
export type Comparison = { missing: boolean; boxError: number; unmatched: number }
export type ActorState = {
	root: HTMLElement
	actor: HTMLElement
	row: HTMLElement
	header: HTMLElement
}
export function createPaintReader({ width: W, height: H }: { width: number; height: number }) {
	// One decode per frame; reference selection never depends on glyph similarity.
	async function pixels(buffer: Buffer) {
		const { data, info } = await sharp(buffer)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true })

		assert.equal(info.width, W)
		assert.equal(info.height, H)
		const pink: number[] = [],
			cyanMask: number[][] = []
		let bx0 = Infinity,
			bx1 = -Infinity,
			cy0 = Infinity,
			cy1 = -Infinity

		for (let y = 0; y < H; y++) {
			for (let x = 0; x < W; x++) {
				const i = (y * W + x) * 4,
					r = data[i],
					g = data[i + 1],
					b = data[i + 2]

				if (y >= H - 55 && y <= H - 35 && r < 8 && g < 8 && b > 247) {
					bx0 = Math.min(bx0, x)
					bx1 = Math.max(bx1, x)
				}

				if (x <= 8 && y >= H - 100 && y <= H - 1 && r < 8 && g > 247 && b > 247) {
					cy0 = Math.min(cy0, y)
					cy1 = Math.max(cy1, y)
					cyanMask.push([y * W + x, r, g, b, data[i + 3]])
				}

				if (r > 120 && b > 100 && r > g * 1.35 && b > g * 1.2) {
					pink.push(y * W + x)
				}
			}
		}

		return {
			cyanMask,
			blue: Number.isFinite(bx0) ? (bx0 + bx1) / 2 : null,
			cyan: Number.isFinite(cy0) ? (cy0 + cy1) / 2 : null,
			at(region: Region): Paint {
				const mask = pink.filter(p => {
					const x = p % W,
						y = Math.floor(p / W)

					return x >= region.left && x <= region.right && y >= region.top && y <= region.bottom
				})
				const xs = mask.map(p => p % W),
					ys = mask.map(p => Math.floor(p / W))

				return {
					mask,
					box: mask.length
						? {
								x: Math.min(...xs),
								y: Math.min(...ys),
								width: Math.max(...xs) - Math.min(...xs) + 1,
								height: Math.max(...ys) - Math.min(...ys) + 1,
							}
						: null,
				}
			},
		}
	}
	function compare(actual: Paint, reference: Paint): Comparison {
		if (!actual.box || !reference.box) {
			return { missing: true, boxError: Infinity, unmatched: 1 }
		}

		const miss = (a: number[], b: number[]) => {
			const set = new Set(b)

			return (
				a.filter(p => {
					const x = p % W,
						y = Math.floor(p / W)

					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							if (set.has((y + dy) * W + x + dx)) {
								return false
							}
						}
					}

					return true
				}).length / a.length
			)
		}

		const actualBox = actual.box,
			referenceBox = reference.box

		return {
			missing: false,
			boxError: Math.max(
				...(['x', 'y', 'width', 'height'] as const).map(k =>
					Math.abs(actualBox[k] - referenceBox[k]),
				),
			),
			unmatched: Math.max(miss(actual.mask, reference.mask), miss(reference.mask, actual.mask)),
		}
	}
	const correct = (comparison: Comparison) =>
		!comparison.missing && comparison.boxError <= 1 && comparison.unmatched <= 0.02

	return { pixels, compare, correct }
}

function observeActor({ root, actor, row, header }: ActorState) {
	const motion = row
		.getAnimations()
		.find(
			(a): a is CSSAnimation =>
				a instanceof CSSAnimation &&
				a.animationName === 'breadcrumb-item-motion' &&
				a.effect instanceof KeyframeEffect &&
				a.effect.target === row,
		)

	if (
		!(motion?.timeline instanceof ViewTimeline) ||
		motion.timeline.source !== root ||
		!(motion.effect instanceof KeyframeEffect)
	) {
		throw Error('Actual row ViewTimeline must resolve to #layout')
	}

	const styles = (pseudo: string) => {
		const s = getComputedStyle(actor, pseudo)

		return {
			transform: s.transform,
			translate: s.translate,
			opacity: s.opacity,
			fontSize: s.fontSize,
			fontFamily: s.fontFamily,
			animationName: s.animationName,
			animationTimeline: s.animationTimeline,
			animationRange: s.animationRange,
			animationRangeStart: s.animationRangeStart,
			animationRangeEnd: s.animationRangeEnd,
			animationDuration: s.animationDuration,
			animationDelay: s.animationDelay,
			animationTimingFunction: s.animationTimingFunction,
			animationPlayState: s.animationPlayState,
			scale: s.scale,
			transitionProperty: s.transitionProperty,
			transitionDuration: s.transitionDuration,
			transitionDelay: s.transitionDelay,
			content: s.content,
			inkAdvance: s.getPropertyValue('---icon-ink-advance'),
			inkHeight: s.getPropertyValue('---icon-ink-height'),
			inkTop: s.getPropertyValue('---icon-ink-top'),
			inkMinX: s.getPropertyValue('---icon-ink-minX'),
			inkMaxX: s.getPropertyValue('---icon-ink-maxX'),
		}
	}
	const interaction = (element: HTMLElement) => {
		const style = getComputedStyle(element)

		return {
			tag: element.tagName,
			id: element.id,
			hover: element.matches(':hover'),
			active: element.matches(':active'),
			focus: element.matches(':focus'),
			focusWithin: element.matches(':focus-within'),
			interest: CSS.supports('selector(:interest-source)')
				? element.matches(':interest-source')
				: null,
			dataPressableState: element.getAttribute('data-pressable-state'),
			scale: style.scale,
			transitionProperty: style.transitionProperty,
			transitionDuration: style.transitionDuration,
			transitionDelay: style.transitionDelay,
			finiteDocumentAnimations: element
				.getAnimations({ subtree: true })
				.filter(
					animation =>
						animation.timeline instanceof DocumentTimeline &&
						Number.isFinite(animation.effect?.getComputedTiming().endTime),
				)
				.map(animation => ({
					name:
						animation instanceof CSSAnimation
							? animation.animationName
							: animation instanceof CSSTransition
								? animation.transitionProperty
								: null,
					pending: animation.pending,
					playState: animation.playState,
					timing: animation.effect?.getComputedTiming(),
				})),
		}
	}
	const h = header.getBoundingClientRect(),
		rs = getComputedStyle(row),
		a = actor.getBoundingClientRect()
	const source = actor.closest('[data-sticky-breadcrumb~="source"]')
	const sourceBox = source?.getBoundingClientRect()
	const before = styles('::before'),
		after = styles('::after')
	const actorStyle = getComputedStyle(actor)
	const rowMatrix = new DOMMatrix(rs.transform)
	const pseudoMatrices = [before, after].map(style => new DOMMatrix(style.transform))
	const rowScale = Math.max(
		1,
		Math.hypot(rowMatrix.a, rowMatrix.b),
		Math.hypot(rowMatrix.c, rowMatrix.d),
	)
	const pseudoScale = Math.max(
		1,
		...pseudoMatrices.flatMap(m => [Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)]),
	)
	const sourceWidth = Math.max(actor.offsetWidth, parseFloat(actorStyle.inlineSize) || 0)
	const fontFootprint = Math.max(
		...[before, after].map(
			style => parseFloat(style.fontSize) * Math.max(1, parseFloat(style.inkAdvance) || 1),
		),
	)
	const guard =
		Math.max(sourceWidth, fontFootprint) * rowScale * pseudoScale +
		Math.abs(rowMatrix.e) +
		Math.max(...pseudoMatrices.map(m => Math.abs(m.e))) +
		2
	const left = Math.max(0, Math.floor(Math.min(a.left, sourceBox?.left ?? a.left) - guard))
	const right = Math.min(
		innerWidth - 1,
		Math.ceil(Math.max(a.right, (sourceBox?.left ?? a.left) + sourceWidth) + guard),
	)

	return {
		scroll: root.scrollTop,
		maximum: root.scrollHeight - root.clientHeight,
		progress: motion.effect.getComputedTiming().progress ?? null,
		source: motion.timeline.source.id,
		row: { transform: rs.transform, translate: rs.translate },
		interaction: { row: interaction(row), actor: interaction(actor) },
		nativeParentEffect: {
			playState: motion.playState,
			pending: motion.pending,
			timing: motion.effect.getTiming(),
			computedTiming: motion.effect.getComputedTiming(),
			keyframes: motion.effect.getKeyframes(),
			timeline: { source: motion.timeline.source.id, axis: motion.timeline.axis },
		},
		before,
		after,
		readerGeometry: {
			actor: { x: a.x, y: a.y, width: a.width, height: a.height },
			source: sourceBox
				? { x: sourceBox.x, y: sourceBox.y, width: sourceBox.width, height: sourceBox.height }
				: null,
			untransformedActorWidth: sourceWidth,
			untransformedSourceWidth: source instanceof HTMLElement ? source.offsetWidth : null,
			fontFootprint,
			rowScale,
			pseudoScale,
			guard,
			horizontalPolicy:
				'Union of actual actor and source slot plus a full untransformed font/slot footprint on each side; independent of observed glyph silhouette',
		},
		region: {
			left,
			top: Math.max(0, Math.floor(h.top) - 2),
			right,
			bottom: Math.min(innerHeight - 1, Math.ceil(h.bottom) + 2),
		},
	}
}

function observeGeometry({ root, actor, row, header }: ActorState) {
	const box = (element: Element | null | undefined) => {
		if (!element) {
			return null
		}

		const { x, y, width, height, top, right, bottom, left } = element.getBoundingClientRect()

		return { x, y, width, height, top, right, bottom, left }
	}
	const values = (element: Element | null | undefined) => {
		if (!element) {
			return null
		}

		const style = getComputedStyle(element)

		return Object.fromEntries(
			[
				'--stickyBreadcrumb-entryRange',
				'---breadcrumb-parentBlockEnd',
				'---breadcrumb-blockEnd',
				'--stickyBreadcrumb-sourcePaddingBlock',
				'--stickyBreadcrumb-paddingBlock',
				'--sticky-insetBlockStart',
				'---breadcrumb-itemHeight',
				'---breadcrumb-sourceRowHeight',
				'animation-name',
				'animation-timeline',
				'animation-range-start',
				'animation-range-end',
				'view-timeline-inset',
				'inset-block-start',
				'inset-block-end',
				'margin-block-start',
				'padding-block-start',
				'padding-block-end',
			].map(name => [name, style.getPropertyValue(name)]),
		)
	}
	const motion = row
		.getAnimations()
		.find(
			(a): a is CSSAnimation =>
				a instanceof CSSAnimation &&
				a.animationName === 'breadcrumb-item-motion' &&
				a.effect instanceof KeyframeEffect &&
				a.effect.target === row,
		)

	if (
		!(motion?.timeline instanceof ViewTimeline) ||
		motion.timeline.source !== root ||
		!(motion.effect instanceof KeyframeEffect)
	) {
		throw Error('Native row geometry requires its actual page timeline')
	}

	const offset = (value: CSSNumericValue | null | undefined) => {
		if (value === null || value === undefined) {
			return null
		}

		try {
			return { cssText: String(value), px: value.to('px').value }
		} catch {
			return { cssText: String(value), px: null }
		}
	}
	const scope = actor.closest('[data-sticky-breadcrumb~="scope"]')
	const flow = scope?.querySelector(
		':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
	)

	return {
		scroll: root.scrollTop,
		root: box(root),
		actor: box(actor),
		header: box(header),
		row: box(row),
		scope: box(scope),
		flow: box(flow),
		properties: {
			actor: values(actor),
			row: values(row),
			header: values(header),
			scope: values(scope),
			flow: values(flow),
		},
		motion: {
			name: motion.animationName,
			timing: motion.effect.getTiming(),
			computedTiming: motion.effect.getComputedTiming(),
			keyframes: motion.effect.getKeyframes(),
		},
		timeline: {
			source: motion.timeline.source.id,
			axis: motion.timeline.axis,
			startOffset: offset(motion.timeline.startOffset),
			endOffset: offset(motion.timeline.endOffset),
			subject: motion.timeline.subject?.outerHTML ?? null,
			subjectRect: box(motion.timeline.subject),
			subjectProperties: values(motion.timeline.subject),
		},
	}
}

export { observeActor, observeGeometry }
