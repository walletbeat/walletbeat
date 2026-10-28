import type { WBIconID } from '@/styles/wbicons'

export type Slice = {
	id: string
	color: string
	opacity?: number
	weight: number
	arcLabel: string
	arcIconId?: WBIconID
	ariaLabel: string
	href?: string
	gradient?: {
		colors: string[]
		transparentStopColor?: string
	}
	children?: Slice[]
}

export const PieLayout = {
	HalfTop: 'TopHalf',
	FullLeft: 'FullLeft',
	FullTop: 'FullTop',
}

export type LevelConfig = {
	outerRadiusFraction: number
	innerRadiusFraction: number
	offset?: number
	gap: number
	anglePadding?: number
	angleGap?: number
	outerCornerRadius?: number
	innerCornerRadius?: number
	labelSize?: number
	labelSizeScale?: number
}

export type ComputedSlice = Slice & {
	computed: {
		totalAngle: number
		midAngle: number
		outerR: number
		innerR: number
		outerCornerRadius: number
		innerCornerRadius: number
		gap: number
		level: number
		offset: number
		labelSize: number
		labelR: number
	}
	children?: ComputedSlice[]
}

export const overallRatingPieRadius = 80
export const overallRatingPiePadding = 8

export const overallRatingPieLevels = (innerRadiusFraction = 0.15): LevelConfig[] => [
	{
		outerRadiusFraction: 1,
		innerRadiusFraction,
		gap: 4,
		angleGap: 5,
		offset: 3,
		outerCornerRadius: 28,
		innerCornerRadius: 16,
		labelSizeScale: 1.25,
	},
	{
		outerRadiusFraction: 0.45,
		innerRadiusFraction: 0.1,
		gap: 0,
		anglePadding: -20,
		angleGap: -30,
		offset: 80,
		outerCornerRadius: 8,
		innerCornerRadius: 8,
		labelSize: 9,
	},
]

export const pieMaxRadius = (radius: number, levels: LevelConfig[]): number =>
	Math.max(
		0,
		...levels.map(level => radius * level.outerRadiusFraction + Math.abs(level.offset ?? 0)),
	)

export const overallRatingPieMaxRadius = pieMaxRadius(
	overallRatingPieRadius,
	overallRatingPieLevels(),
)

/**
 * Path data for a computed slice, drawn pointing up (toward negative y)
 * around the pie origin, before its `rotate(midAngle)` and
 * `translate(0, -offset)` transforms. Usable both as SVG path data and in
 * CSS `clip-path: path()`.
 */
export const slicePathData = (
	{
		totalAngle,
		outerR,
		innerR,
		outerCornerRadius,
		innerCornerRadius,
		gap,
	}: ComputedSlice['computed'],
	origin: { x: number; y: number } = { x: 0, y: 0 },
): string => {
	const point = (x: number, y: number) =>
		`${(origin.x + x).toFixed(3)} ${(origin.y + y).toFixed(3)}`
	const polar = (angle: number, r: number) => point(Math.sin(angle) * r, -Math.cos(angle) * r)

	if (Math.abs(totalAngle) >= 359.99) {
		return [
			`M ${point(outerR, 0)}`,
			`A ${outerR} ${outerR} 0 1 1 ${point(-outerR, 0)}`,
			`A ${outerR} ${outerR} 0 1 1 ${point(outerR, 0)}`,
			`L ${point(innerR, 0)}`,
			`A ${innerR} ${innerR} 0 1 0 ${point(-innerR, 0)}`,
			`A ${innerR} ${innerR} 0 1 0 ${point(innerR, 0)}`,
			'Z',
		].join(' ')
	}

	const halfAngle = (Math.abs(totalAngle) * Math.PI) / 360
	const sinHalf = Math.sin(halfAngle)
	const cosHalf = Math.cos(halfAngle)
	const halfGap = gap / 2
	const maxCornerR = (outerR - innerR) / 2
	const outerCornerR = Math.max(
		0,
		Math.min(
			outerCornerRadius,
			maxCornerR,
			Math.max(0, (sinHalf * outerR - halfGap) / (1 + sinHalf)),
		),
	)
	const innerCornerR = Math.max(
		0,
		Math.min(
			innerCornerRadius,
			maxCornerR,
			Math.max(0, (sinHalf * innerR - halfGap) / Math.max(0.000001, 1 - sinHalf)),
		),
	)
	const outerCornerOffset = halfGap + outerCornerR
	const innerCornerOffset = halfGap + innerCornerR
	const outerCornerCenterR = outerR - outerCornerR
	const innerCornerCenterR = innerR + innerCornerR
	const outerAngleInset = Math.asin(outerCornerOffset / outerCornerCenterR)
	const innerAngleInset = Math.asin(innerCornerOffset / innerCornerCenterR)
	const outerSideR = Math.sqrt(outerCornerCenterR ** 2 - outerCornerOffset ** 2)
	const innerSideR = Math.sqrt(innerCornerCenterR ** 2 - innerCornerOffset ** 2)
	const sidePoint = (sideR: number, side: 1 | -1) =>
		point(side * (sinHalf * sideR - cosHalf * halfGap), -(cosHalf * sideR + sinHalf * halfGap))

	return [
		`M ${polar(outerAngleInset - halfAngle, outerR)}`,
		`A ${outerR} ${outerR} 0 0 1 ${polar(0, outerR)}`,
		`A ${outerR} ${outerR} 0 0 1 ${polar(halfAngle - outerAngleInset, outerR)}`,
		`A ${outerCornerR} ${outerCornerR} 0 0 1 ${sidePoint(outerSideR, 1)}`,
		`L ${sidePoint(innerSideR, 1)}`,
		`A ${innerCornerR} ${innerCornerR} 0 0 1 ${polar(halfAngle - innerAngleInset, innerR)}`,
		`A ${innerR} ${innerR} 0 0 0 ${polar(0, innerR)}`,
		`A ${innerR} ${innerR} 0 0 0 ${polar(innerAngleInset - halfAngle, innerR)}`,
		`A ${innerCornerR} ${innerCornerR} 0 0 1 ${sidePoint(innerSideR, -1)}`,
		`L ${sidePoint(outerSideR, -1)}`,
		`A ${outerCornerR} ${outerCornerR} 0 0 1 ${polar(outerAngleInset - halfAngle, outerR)}`,
		'Z',
	].join(' ')
}

export const computePieSlices = ({
	slices,
	radius,
	levels,
	layout,
	centerFirstSlice,
	labelSize = radius / 4,
}: {
	slices: Slice[]
	radius: number
	levels: LevelConfig[]
	layout: (typeof PieLayout)[keyof typeof PieLayout]
	centerFirstSlice: boolean
	labelSize?: number
}): ComputedSlice[] => {
	const getLevelConfig = (level: number) => levels[Math.min(level, levels.length - 1)]

	const compute = (
		{
			slices,
			startAngle,
			endAngle,
			firstSliceMidAngle,
		}: {
			slices: Slice[]
			startAngle: number
			endAngle: number
			firstSliceMidAngle?: number
		},
		level = 0,
	): ComputedSlice[] => {
		const levelConfig = getLevelConfig(level)
		const parentLevelConfig = getLevelConfig(level - 1)
		const outerR = radius * levelConfig.outerRadiusFraction
		const configuredInnerR = radius * levelConfig.innerRadiusFraction
		const orientation = Math.sign(endAngle - startAngle)
		const anglePadding = levelConfig.anglePadding ?? 0
		const angleGap = levelConfig.angleGap ?? 0
		const totalGapAngle = angleGap * Math.max(slices.length - 1, 0)
		const angleInsetFromParentGap = parentLevelConfig
			? ((Math.asin(levelConfig.gap / 2 / outerR) - Math.asin(parentLevelConfig.gap / 2 / outerR)) *
					180) /
				Math.PI
			: 0
		const effectiveStartAngle =
			startAngle + orientation * (anglePadding / 2 + angleInsetFromParentGap)
		const effectiveEndAngle = endAngle - orientation * (anglePadding / 2 + angleInsetFromParentGap)
		const effectiveTotalAngle =
			effectiveEndAngle - effectiveStartAngle - orientation * totalGapAngle
		const totalWeight = slices.reduce((sum, slice) => sum + slice.weight, 0)
		const computedFirstSliceMidAngle =
			effectiveStartAngle +
			(effectiveTotalAngle * ((slices[0]?.weight ?? 0) / (totalWeight || 1))) / 2
		const angleOffset =
			(firstSliceMidAngle ?? computedFirstSliceMidAngle) - computedFirstSliceMidAngle
		let currentAngle = effectiveStartAngle + angleOffset

		return slices.map(({ children, ...slice }, index) => {
			const totalAngle = effectiveTotalAngle * (slice.weight / totalWeight)
			const startAngle = currentAngle
			const endAngle = startAngle + totalAngle
			const midAngle = startAngle + totalAngle / 2
			const labelSizeScale = levelConfig.labelSizeScale ?? 1
			const effectiveLabelSize = (levelConfig.labelSize ?? labelSize) * labelSizeScale
			const labelRadius = effectiveLabelSize / 2
			const halfAngle = (Math.abs(totalAngle) * Math.PI) / 360
			const gap = Math.abs(totalAngle) >= 360 ? 0 : levelConfig.gap
			const halfGap = gap / 2
			const innerR = Math.min(
				outerR,
				Math.max(
					configuredInnerR,
					halfAngle > 0 && halfAngle < Math.PI / 2 ? halfGap / Math.sin(halfAngle) : 0,
				),
			)
			const minimumLabelR = Math.sqrt((outerR - labelRadius) * (innerR + labelRadius))
			const outerCornerRadius = Math.max(
				0,
				Math.min(
					levelConfig.outerCornerRadius ?? halfGap,
					(outerR - innerR) / 2,
					(Math.sin(halfAngle) * outerR - halfGap) / (1 + Math.sin(halfAngle)),
				),
			)
			const innerCornerRadius = Math.max(
				0,
				Math.min(
					levelConfig.innerCornerRadius ?? halfGap,
					(outerR - innerR) / 2,
					(Math.sin(halfAngle) * innerR - halfGap) / Math.max(0.000001, 1 - Math.sin(halfAngle)),
				),
			)
			const centroidLabelR =
				(2 / 3) *
				((outerR ** 2 + outerR * innerR + innerR ** 2) / (outerR + innerR)) *
				(halfAngle === 0 ? 1 : Math.sin(halfAngle) / halfAngle)
			const maximumLabelR = outerR - labelRadius
			const labelR = Math.max(minimumLabelR, Math.min(centroidLabelR, maximumLabelR))

			currentAngle = endAngle + (index < slices.length - 1 ? orientation * angleGap : 0)

			return {
				...slice,
				computed: {
					totalAngle,
					midAngle,
					outerR,
					innerR,
					outerCornerRadius,
					innerCornerRadius,
					level,
					offset: levelConfig.offset ?? 0,
					gap,
					labelSize: effectiveLabelSize,
					labelR,
				},
				...(children && {
					children: compute({ slices: children, startAngle, endAngle }, level + 1),
				}),
			}
		})
	}

	const level0AngleGap = getLevelConfig(0).angleGap ?? 0

	return compute({
		slices,
		firstSliceMidAngle: centerFirstSlice ? 0 : undefined,
		...(layout === PieLayout.FullLeft
			? { startAngle: -90 + level0AngleGap / 2, endAngle: 270 - level0AngleGap / 2 }
			: layout === PieLayout.FullTop
				? { startAngle: 360 - level0AngleGap / 2, endAngle: level0AngleGap / 2 }
				: { startAngle: -90, endAngle: 90 }),
	})
}
