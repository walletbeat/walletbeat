import { type NonEmptyArray, nonEmptyGet, nonEmptyMap } from '@/types/utils/non-empty'
import { PieChart } from '@mui/x-charts/PieChart'
import type React from 'react'
import { styled, type Theme } from '@mui/material/styles'
import type { FadeOptions, HighlightItemData, PieItemIdentifier, PieValueType } from '@mui/x-charts'
import { useState } from 'react'

export interface PieSlice {
	id: string
	color: string
	weight: number
	arcLabel: string
	tooltip: string
	tooltipValue: string
	focusChange?: (focused: boolean) => void
	click?: (event: React.MouseEvent<SVGPathElement>) => void
}

export enum Arc {
	TOP_HALF = 'TOP_HALF',
	FULL = 'FULL',
}

export interface PieRatings {
	pieId: string
	slices: NonEmptyArray<PieSlice>
	width: number
	height: number
	arc?: Arc
	paddingAngle?: number
	cornerRadiusFraction?: number
	innerRadiusFraction?: number
	outerRadiusFraction?: number
	hoverEffect?: boolean
	hoverRadiusFraction?: number
	highlightedSliceId?: string | null
	centerLabel?: string
	centerLabelHeightFraction?: number
}

function sliceToData(slice: PieSlice): PieValueType {
	return {
		id: slice.id,
		value: slice.weight,
		color: slice.color,
		label: (location: 'legend' | 'tooltip' | 'arc'): string => {
			switch (location) {
				case 'legend':
					return ''
				case 'tooltip':
					return slice.tooltip
				case 'arc':
					return slice.arcLabel
			}
		},
	}
}

/**
 * MUI's PieChart appears to get the center of the pie chart off by this fixed
 * number of pixels.
 */
const pieChartCenterError = -5

function PieCenterLabel({
	arc,
	cx,
	cy,
	fontSize,
	color,
	children,
}: {
	arc: Arc
	cx: number
	cy: number
	fontSize: number
	color: string | ((theme: Theme) => string)
	children: React.ReactNode
}): React.JSX.Element {
	const StyledText = styled('text')(({ theme }) => ({
		fill: typeof color === 'string' ? color : color(theme),
		textAnchor: 'middle',
		dominantBaseline: 'central',
		fontSize,
	}))
	const { x, y } = (() => {
		switch (arc) {
			case Arc.TOP_HALF:
				return {
					x: cx - pieChartCenterError,
					y: cy - fontSize / 2,
				}
			case Arc.FULL:
				return {
					x: cx - pieChartCenterError,
					y: cy,
				}
		}
	})()
	return (
		<StyledText x={x} y={y}>
			{children}
		</StyledText>
	)
}

function computeArcLabel(innerRadius: number, outerRadius: number): number {
	return Math.floor((innerRadius + outerRadius) / 2)
}

export function RatingPie({
	pieId,
	slices,
	width,
	height,
	arc = Arc.FULL,
	paddingAngle = 6,
	innerRadiusFraction = 0.5,
	outerRadiusFraction = 0.95,
	cornerRadiusFraction = 0.1,
	hoverEffect = true,
	hoverRadiusFraction = 1.0,
	highlightedSliceId = undefined,
	centerLabel = '',
	centerLabelHeightFraction = 0.275,
}: PieRatings): React.JSX.Element {
	const { maxRadius, startAngle, endAngle, cx, cy } = (() => {
		switch (arc) {
			case Arc.TOP_HALF:
				return {
					maxRadius: height,
					startAngle: -90,
					endAngle: 90,
					cx: width / 2 + pieChartCenterError,
					cy: height + pieChartCenterError,
				}
			case Arc.FULL:
				return {
					maxRadius: height,
					startAngle: -90,
					endAngle: 270,
					cx: width / 2 + pieChartCenterError,
					cy: height / 2 + pieChartCenterError,
				}
		}
	})()
	const innerRadius = maxRadius * innerRadiusFraction
	const outerRadius = maxRadius * outerRadiusFraction
	const cornerRadius = maxRadius * cornerRadiusFraction
	const hoverRadius = maxRadius * hoverRadiusFraction
	const hasFocusHandling = nonEmptyGet(slices).focusChange !== undefined
	let handleHighlightChange: ((data: HighlightItemData | null) => void) | undefined = undefined
	const [lastFocusedSliceIndex, setLastFocusedSliceIndex] = useState<number | null>(null)
	if (hasFocusHandling) {
		handleHighlightChange = (data: HighlightItemData | null) => {
			const currentFocusedSliceIndex = data === null ? null : (data.dataIndex ?? null)
			if (lastFocusedSliceIndex === currentFocusedSliceIndex) {
				return // No change.
			}
			if (
				lastFocusedSliceIndex !== null &&
				slices[lastFocusedSliceIndex].focusChange !== undefined
			) {
				slices[lastFocusedSliceIndex].focusChange(false)
			}
			if (
				currentFocusedSliceIndex !== null &&
				slices[currentFocusedSliceIndex].focusChange !== undefined
			) {
				slices[currentFocusedSliceIndex].focusChange(true)
			}
			setLastFocusedSliceIndex(currentFocusedSliceIndex)
		}
	}
	let highlightedItem: HighlightItemData | null | undefined = undefined
	let fadeScope: FadeOptions = 'none'
	if (highlightedSliceId !== undefined) {
		if (highlightedSliceId === null) {
			highlightedItem = { seriesId: pieId }
		} else {
			const highlightedSliceIndex = slices.findIndex(slice => slice.id === highlightedSliceId)
			highlightedItem = {
				seriesId: pieId,
				dataIndex: highlightedSliceIndex === -1 ? undefined : highlightedSliceIndex,
			}
			fadeScope = 'global'
		}
	}
	const hasClickHandling = nonEmptyGet(slices).click !== undefined
	const handleClick = hasClickHandling
		? (event: React.MouseEvent<SVGPathElement>, itemIdentifier: PieItemIdentifier) => {
			const handler = slices[itemIdentifier.dataIndex].click
			if (handler !== undefined) {
				handler(event)
			}
		}
		: undefined
	return (
		<PieChart
			series={[
				{
					id: pieId,
					data: nonEmptyMap(slices, slice => sliceToData(slice)),
					type: 'pie',
					arcLabel: 'label',
					arcLabelRadius: computeArcLabel(innerRadius, outerRadius),
					cx,
					cy,
					cornerRadius,
					outerRadius,
					innerRadius,
					highlightScope: hoverEffect
						? {
							fade: fadeScope,
							highlight: 'item',
						}
						: undefined,
					faded: hoverEffect
						? {
							innerRadius,
							outerRadius,
						}
						: undefined,
					highlighted: hoverEffect
						? {
							innerRadius,
							outerRadius: hoverRadius,
						}
						: undefined,
					startAngle,
					endAngle,
					paddingAngle,
					valueFormatter: val => {
						const slice = slices.find(slice => slice.id === (val.id ?? '<invalid>'))
						if (slice === undefined) {
							return '\u{2049}' // Interrobang
						}
						return slice.tooltipValue
					},
				},
			]}
			width={width}
			height={height}
			highlightedItem={highlightedItem}
			onHighlightChange={handleHighlightChange}
			onItemClick={handleClick}
			slotProps={{ legend: { hidden: true, padding: 0 } }}
		>
			{centerLabel === '' ? null : (
				<PieCenterLabel
					arc={arc}
					color={theme => theme.palette.text.primary}
					fontSize={height * centerLabelHeightFraction}
					cx={cx}
					cy={cy}
				>
					{centerLabel}
				</PieCenterLabel>
			)}
		</PieChart>
	)
}
