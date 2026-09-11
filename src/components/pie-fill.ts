import { Rating, ratingToColor } from '@/schema/attributes'

import type { ComputedSlice, Slice } from './pie-geometry'

export const attributeGroupFlowerGradient: NonNullable<Slice['gradient']> = {
	colors: [
		ratingToColor(Rating.UNRATED),
		ratingToColor(Rating.FAIL),
		ratingToColor(Rating.PARTIAL),
		ratingToColor(Rating.PASS),
	],
	transparentStopColor: ratingToColor(Rating.UNRATED),
}

// Cache the radial integral once per canonical shape. Its derivative is r times
// the occupied angle, including the rounded corner-circle intersections.
const BIN_COUNT = 1024
const profiles = new Map<string, number[]>()

const bounded = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const angularWidth = (computed: ComputedSlice['computed'], radius: number): number => {
	const halfAngle = (Math.abs(computed.totalAngle) * Math.PI) / 360
	const halfGap = Math.max(0, computed.gap) / 2

	if (halfAngle >= Math.PI - 1e-9) {
		return 2 * Math.PI
	}

	const outerCenter = computed.outerR - computed.outerCornerRadius
	const innerCenter = computed.innerR + computed.innerCornerRadius
	let halfWidth = halfAngle - Math.asin(bounded(halfGap / Math.max(radius, 1e-9), -1, 1))

	const cornerWidth = (center: number, corner: number, outer: boolean) => {
		if (corner <= 0 || center <= 0 || radius <= 0) {
			return halfWidth
		}

		const side = Math.sqrt(Math.max(0, center * center - (halfGap + corner) ** 2 + halfGap ** 2))

		if ((outer && radius <= side) || (!outer && radius >= side)) {
			return halfWidth
		}

		return Math.min(
			halfWidth,
			halfAngle -
				Math.asin(bounded((halfGap + corner) / center, -1, 1)) +
				Math.acos(
					bounded(
						(radius * radius + center * center - corner * corner) / (2 * radius * center),
						-1,
						1,
					),
				),
		)
	}

	halfWidth = cornerWidth(outerCenter, computed.outerCornerRadius, true)
	halfWidth = cornerWidth(innerCenter, computed.innerCornerRadius, false)

	return Math.max(0, 2 * halfWidth)
}

const profileFor = (computed: ComputedSlice['computed']): number[] => {
	const key = [
		computed.outerR,
		computed.innerR,
		Math.abs(computed.totalAngle),
		computed.gap,
		computed.outerCornerRadius,
		computed.innerCornerRadius,
	].join('|')
	const existing = profiles.get(key)

	if (existing) {
		return existing
	}

	const step = Math.max(0, computed.outerR - computed.innerR) / BIN_COUNT
	const cumulativeArea = [0]

	for (let i = 0; i < BIN_COUNT; i += 1) {
		const radius = computed.innerR + (i + 0.5) * step

		cumulativeArea.push(cumulativeArea[i] + radius * angularWidth(computed, radius) * step)
	}
	profiles.set(key, cumulativeArea)

	return cumulativeArea
}

const radiusAtArea = (computed: ComputedSlice['computed'], fraction: number): number => {
	const f = bounded(fraction, 0, 1)

	if (Math.abs(computed.totalAngle) >= 360) {
		return Math.sqrt(computed.innerR ** 2 + (computed.outerR ** 2 - computed.innerR ** 2) * f)
	}

	const profile = profileFor(computed)
	const target = profile[BIN_COUNT] * f
	let low = 0
	let high = BIN_COUNT

	while (high - low > 1) {
		const mid = Math.floor((low + high) / 2)

		if (profile[mid] < target) {
			low = mid
		} else {
			high = mid
		}
	}
	const a0 = profile[low]
	const a1 = profile[high]
	const t = a1 === a0 ? 0 : (target - a0) / (a1 - a0)
	const radius = computed.innerR + ((low + t) * (computed.outerR - computed.innerR)) / BIN_COUNT

	return radius
}

export const sliceFill = (slice: ComputedSlice) => {
	const { children, gradient } = slice

	if (!children?.length || !gradient) {
		return slice.color
	}

	const childWeights = new Map<string, number>()

	for (const child of children) {
		childWeights.set(child.color, (childWeights.get(child.color) ?? 0) + child.weight)
	}
	const colorWeights = gradient.colors
		.map(color => ({ color, weight: childWeights.get(color) ?? 0 }))
		.filter(({ weight }) => weight > 0)

	if (colorWeights.length <= 1) {
		const color = colorWeights[0]?.color ?? slice.color

		return color === gradient.transparentStopColor ? 'var(--rating-unrated)' : color
	}

	const totalWeight = colorWeights.reduce((sum, entry) => sum + entry.weight, 0)
	const minimumStopGap = Math.min(
		8,
		(slice.computed.outerR - slice.computed.innerR) / Math.max(colorWeights.length - 1, 1),
	)
	const stopPositions = colorWeights
		.map(({ weight }, index, weights) => {
			const areaFraction =
				(weights.slice(0, index).reduce((sum, entry) => sum + entry.weight, 0) + weight / 2) /
				totalWeight

			return radiusAtArea(slice.computed, areaFraction)
		})
		.reduce<number[]>(
			(stops, stop, index) => [
				...stops,
				Math.max(stop, index === 0 ? slice.computed.innerR : stops[index - 1] + minimumStopGap),
			],
			[],
		)
		.reduceRight<number[]>(
			(stops, stop, index) => [
				Math.min(
					stop,
					index === colorWeights.length - 1 ? slice.computed.outerR : stops[0] - minimumStopGap,
				),
				...stops,
			],
			[],
		)

	return `radial-gradient(in oklch circle at var(--pie-originX) var(--pie-originY), ${colorWeights.map(({ color }, index) => `${color === gradient.transparentStopColor ? 'transparent' : color} ${stopPositions[index]}px`).join(', ')}), var(--rating-unrated)`
}
