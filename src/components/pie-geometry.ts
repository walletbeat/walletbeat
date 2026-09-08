import type { WBIconID } from '@/styles/wbicons'

export type Slice = {
	id: string
	color: string
	opacity?: number
	weight: number
	arcLabel: string
	arcIconId?: WBIconID
	titleText: string
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
		labelSizeScale: number
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
					labelSizeScale,
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
