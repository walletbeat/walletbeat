import { expect, it } from 'vitest'

import { computePieSlices, PieLayout } from '@/components/pie-geometry'

it.each([355, 180, 120, 60, 22.5, 8, 1])('keeps a %s degree slice inside its annulus', angle => {
	const [{ computed }] = computePieSlices({
		slices: [{ id: 'slice', color: 'red', weight: 1, arcLabel: '', titleText: '' }],
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
