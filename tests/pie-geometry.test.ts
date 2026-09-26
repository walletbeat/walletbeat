import { expect, it } from 'vitest'

import { sliceFill } from '@/components/pie-fill'
import { computePieSlices, PieLayout } from '@/components/pie-geometry'

it.each([355, 180, 120, 60, 22.5, 8, 1])('keeps a %s degree slice inside its annulus', angle => {
	const [{ computed }] = computePieSlices({
		slices: [{ id: 'slice', color: 'red', weight: 1, arcLabel: '', ariaLabel: '' }],
		radius: 100,
		levels: [
			{
				outerRadiusFraction: 1,
				innerRadiusFraction: 0.1,
				gap: 8,
				anglePadding: 360 - angle,
				outerCornerRadius: 12,
				innerCornerRadius: 8,
			},
		],
		layout: PieLayout.FullLeft,
		centerFirstSlice: true,
	})

	expect(Object.values(computed).every(Number.isFinite)).toBe(true)
	expect(computed.innerR).toBeLessThanOrEqual(computed.outerR)

	if (angle < 180 && computed.innerR < computed.outerR) {
		// A radial side must reach the inner circle without passing the opposite side.
		expect(computed.innerR * Math.sin((angle * Math.PI) / 360)).toBeGreaterThanOrEqual(
			computed.gap / 2 - 1e-10,
		)
	} else if (angle >= 180) {
		expect(computed.innerR).toBe(10)
	}
})

it('places multi-color fill stops in order inside the computed annulus', () => {
	const [slice] = computePieSlices({
		slices: [
			{
				id: 'slice',
				color: 'red',
				weight: 1,
				arcLabel: '',
				ariaLabel: '',
				gradient: {
					colors: ['red', 'transparent-stop', 'blue'],
					transparentStopColor: 'transparent-stop',
				},
				children: [
					{ id: 'red', color: 'red', weight: 1, arcLabel: '', ariaLabel: '' },
					{ id: 'transparent', color: 'transparent-stop', weight: 2, arcLabel: '', ariaLabel: '' },
					{ id: 'blue', color: 'blue', weight: 3, arcLabel: '', ariaLabel: '' },
				],
			},
		],
		radius: 100,
		levels: [
			{
				outerRadiusFraction: 1,
				innerRadiusFraction: 0.2,
				gap: 8,
				anglePadding: 240,
				outerCornerRadius: 12,
				innerCornerRadius: 8,
			},
		],
		layout: PieLayout.FullLeft,
		centerFirstSlice: true,
	})
	const fill = sliceFill(slice)
	const stops = [...fill.matchAll(/(?:red|transparent|blue) ([\d.]+)px/g)].map(match =>
		Number(match[1]),
	)

	expect(fill).toContain('transparent ')
	expect(stops).toHaveLength(3)
	expect(stops).toEqual([...stops].sort((a, b) => a - b))
	expect(stops[0]).toBeGreaterThanOrEqual(slice.computed.innerR)
	expect(stops.at(-1)).toBeLessThanOrEqual(slice.computed.outerR)
})
