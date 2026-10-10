import { Rating, ratingToColor } from '@/schema/attributes'

import type { ComputedSlice, Slice } from './pie-geometry'

/**
 * Radial gradient for an attribute group petal: the group's attributes'
 * rating colors, ordered from unrated (center) to passing (edge), each
 * covering a share of the petal's area proportional to its weight.
 */
export const attributeGroupFlowerGradient: NonNullable<Slice['gradient']> = {
	areaRadiusStops: [
		0.0, 0.038097, 0.075252, 0.111402, 0.146585, 0.180353, 0.213312, 0.245668, 0.277513, 0.308937,
		0.339923, 0.370813, 0.401695, 0.432635, 0.463538, 0.494531, 0.525379, 0.555836, 0.586127,
		0.616255, 0.646222, 0.676031, 0.705683, 0.735183, 0.764631, 0.793975, 0.823297, 0.852492,
		0.881757, 0.911014, 0.940339, 0.969777, 1.0,
	],
	colors: [
		ratingToColor(Rating.UNRATED),
		ratingToColor(Rating.FAIL),
		ratingToColor(Rating.PARTIAL),
		ratingToColor(Rating.PASS),
	],
	transparentStopColor: ratingToColor(Rating.UNRATED),
}

type GradientStops = Array<{ color: string; position: number }>

/** A gradient slice's color stops (radius in px), or a single flat color. */
function sliceGradientStops(slice: ComputedSlice): GradientStops | string {
	const children = slice.children
	const gradient = slice.gradient

	if (children === undefined || children.length === 0 || gradient === undefined) {
		return slice.color
	}

	const colorWeights = gradient.colors
		.map(color => ({
			color,
			weight: children
				.filter(child => child.color === color)
				.reduce((sum, child) => sum + child.weight, 0),
		}))
		.filter(({ weight }) => weight > 0)

	if (colorWeights.length <= 1) {
		const color = colorWeights.at(0)?.color ?? slice.color

		return color === gradient.transparentStopColor ? 'var(--rating-unrated)' : color
	}

	const areaRadiusStops = gradient.areaRadiusStops
	const { innerR, outerR } = slice.computed
	const totalWeight = colorWeights.reduce((sum, entry) => sum + entry.weight, 0)
	const minimumStopGap = Math.min(8, (outerR - innerR) / Math.max(colorWeights.length - 1, 1))
	const stopPositions = colorWeights
		.map(({ weight }, index, weights) => {
			const areaFraction =
				(weights.slice(0, index).reduce((sum, entry) => sum + entry.weight, 0) + weight / 2) /
				totalWeight

			if (areaRadiusStops === undefined) {
				return Math.sqrt(innerR ** 2 + (outerR ** 2 - innerR ** 2) * areaFraction)
			}

			const scaledStopIndex = areaFraction * (areaRadiusStops.length - 1)
			const stopIndex = Math.floor(scaledStopIndex)
			const normalizedRadius =
				areaRadiusStops[stopIndex] +
				(areaRadiusStops[Math.min(stopIndex + 1, areaRadiusStops.length - 1)] -
					areaRadiusStops[stopIndex]) *
					(scaledStopIndex - stopIndex)

			return innerR + (outerR - innerR) * normalizedRadius
		})
		.reduce<number[]>(
			(stops, stop, index) => [
				...stops,
				Math.max(stop, index === 0 ? innerR : stops[index - 1] + minimumStopGap),
			],
			[],
		)
		.reduceRight<number[]>(
			(stops, stop, index) => [
				Math.min(stop, index === colorWeights.length - 1 ? outerR : stops[0] - minimumStopGap),
				...stops,
			],
			[],
		)

	return colorWeights.map(({ color }, index) => ({
		color: color === gradient.transparentStopColor ? 'transparent' : color,
		position: stopPositions[index],
	}))
}

/**
 * CSS background for a slice: its flat color, or a radial gradient of its
 * children's rating colors centered on the pie origin (`at`, a CSS position).
 */
export function pieSliceFill(slice: ComputedSlice, at: string): string {
	const stops = sliceGradientStops(slice)

	if (typeof stops === 'string') {
		return stops
	}

	return `radial-gradient(in oklch circle at ${at}, ${stops.map(({ color, position }) => `${color} ${position}px`).join(', ')}), var(--rating-unrated)`
}

/**
 * The fill color under the slice's label, so the label's ink can contrast
 * with what is actually drawn there rather than with the slice's nominal
 * color (gradient slices can be mostly unrated grey around the label).
 */
export function pieSliceLabelBackground(slice: ComputedSlice): string {
	const stops = sliceGradientStops(slice)

	if (typeof stops === 'string') {
		return stops
	}

	const nearest = stops.reduce((best, stop) =>
		Math.abs(stop.position - slice.computed.labelR) <
		Math.abs(best.position - slice.computed.labelR)
			? stop
			: best,
	)

	return nearest.color === 'transparent' ? 'var(--rating-unrated)' : nearest.color
}
