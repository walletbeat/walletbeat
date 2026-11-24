import * as fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from '@/utils/codebase'

import { removeCSSOutline } from '../src/tools/icon-font-generator/svg-stroke-removal'

/**
 * All SVG files under resources/ that contain CSS stroke declarations
 * (either in a <style> block or in inline style attributes).
 */
function findStrokedSvgs(): { relativePath: string; contents: string }[] {
	const root = getRepositoryRoot()
	const results: { relativePath: string; contents: string }[] = []
	const walk = (dir: string): void => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, entry.name)

			if (entry.isDirectory()) {
				walk(fullPath)
			} else if (entry.name.endsWith('.svg')) {
				const contents = fs.readFileSync(fullPath, 'utf8')

				if (/stroke\s*:/.test(contents)) {
					results.push({ relativePath: path.relative(root, fullPath), contents })
				}
			}
		}
	}

	walk(path.join(root, 'resources'))
	results.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

	return results
}

const strokedSvgs = findStrokedSvgs()

describe('removeCSSOutline on synthetic documents', () => {
	const wrap = (defs: string, body: string): string =>
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">${defs}${body}</svg>`

	it('turns a stroked open line into its outline rectangle', () => {
		const input = wrap(
			'<defs><style>.a{stroke:#000;stroke-miterlimit:10;stroke-width:2px}</style></defs>',
			'<path d="M0 0H10" class="a"/>',
		)
		const output = removeCSSOutline(input)

		expect(output).not.toMatch(/stroke/)
		expect(output).not.toMatch(/class=/)
		expect(output).not.toMatch(/<style/)
		expect(output).not.toMatch(/<defs/)
		// The original path is kept, followed by the stroke outline: a
		// 10x2 rectangle around the line (butt caps).
		expect(output).toContain('<path d="M0 0H10"/>')
		expect(output).toContain('<path d="M0 -1L10 -1L10 1L0 1Z"/>')
	})

	it('produces miter joins on a closed square within the miter limit', () => {
		const input = wrap(
			'<defs><style>.a{stroke:#000;stroke-miterlimit:10;stroke-width:2px}</style></defs>',
			'<path d="M0 0H10V10H0Z" class="a"/>',
		)
		const output = removeCSSOutline(input)
		const outline = /<path d="([^"]*)"\/>$/.exec(output.replace(/<\/svg>$/, ''))

		if (outline === null) {
			throw new Error('No outline path found in output')
		}

		const d = outline[1]

		// Outer ring: square grown by 1 with sharp miter corners.
		for (const corner of ['-1 -1', '11 -1', '11 11', '-1 11']) {
			expect(d).toContain(`L${corner}`)
		}
		// Two rings (outer and inner boundary of the stroke band) with
		// opposite windings, so the interior of the square stays unfilled
		// under the nonzero fill rule.
		const rings = d
			.split('M')
			.filter(ring => ring !== '')
			.map(ring =>
				[...ring.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => ({
					x: parseFloat(m[1]),
					y: parseFloat(m[2]),
				})),
			)

		expect(rings).toHaveLength(2)
		const signedArea = (ring: { x: number; y: number }[]): number =>
			ring.reduce((sum, p, i) => {
				const q = ring[(i + 1) % ring.length]

				return sum + (p.x * q.y - q.x * p.y)
			}, 0) / 2

		expect(signedArea(rings[0]) * signedArea(rings[1])).toBeLessThan(0)

		// Every inner-ring vertex lies exactly 1 unit from the square's
		// outline (on one of the offset lines x=1, x=9, y=1 or y=9, within
		// the corner overlap allowance).
		for (const p of rings[1]) {
			const onOffsetLine = [1, 9].some(
				line => Math.abs(p.x - line) < 1e-9 || Math.abs(p.y - line) < 1e-9,
			)

			expect(onOffsetLine, `(${p.x}, ${p.y}) not on an inner offset line`).toBe(true)
		}
	})

	it('bevels a join that exceeds the miter limit', () => {
		// A 2:1 spike: the tip angle is sharp enough that the miter ratio
		// exceeds the default limit of 4.
		const input = wrap(
			'<defs><style>.a{stroke:#000}</style></defs>',
			'<path d="M0 0L20 1L0 2" class="a"/>',
		)
		const output = removeCSSOutline(input)
		// Extract all outline coordinates and check none extend far beyond
		// the spike tip (a miter would reach x = 20 + ~10).
		const outline = /<path d="([^"]*)"\/>/g
		let match
		let maxX = -Infinity

		while ((match = outline.exec(output)) !== null) {
			for (const coordinate of match[1].matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
				maxX = Math.max(maxX, parseFloat(coordinate[1]))
			}
		}
		expect(maxX).toBeLessThan(21)
	})

	it('replaces fill:none stroked shapes entirely with their outline', () => {
		const input = wrap('', '<path d="M0 0H10" style="stroke:#000;fill:none;stroke-width:2px"/>')
		const output = removeCSSOutline(input)

		expect(output).not.toMatch(/stroke/)
		expect(output).not.toMatch(/fill:none/)
		expect(output).toContain('<path d="M0 -1L10 -1L10 1L0 1Z"/>')
	})

	it('keeps the transform attribute on the generated outline', () => {
		const input = wrap(
			'',
			'<rect width="10" height="2" x="1" y="1" rx="1" ry="1" style="stroke:#000" transform="rotate(-30 5 5)"/>',
		)
		const output = removeCSSOutline(input)

		expect(output).not.toMatch(/stroke/)
		expect(output).toMatch(
			/<rect [^>]*transform="rotate\(-30 5 5\)"\/><path d="[^"]*" transform="rotate\(-30 5 5\)"\/>/,
		)
	})

	it('handles ellipses', () => {
		const input = wrap(
			'',
			'<ellipse cx="10" cy="10" rx="4" ry="2" style="stroke:#000;stroke-width:2px"/>',
		)
		const output = removeCSSOutline(input)

		expect(output).not.toMatch(/stroke/)
		// Outline must contain two rings (outer and inner boundary of the
		// stroke band): two M commands.
		const outline = /<ellipse [^>]*\/><path d="([^"]*)"\/>/.exec(output)

		if (outline === null) {
			throw new Error('No outline path found after the ellipse')
		}

		expect(outline[1].match(/M/g)).toHaveLength(2)
	})

	it('leaves non-stroked elements untouched', () => {
		const input = wrap('', '<path d="M0 0H10V10Z"/><rect width="3" height="4"/>')

		expect(removeCSSOutline(input)).toBe(input)
	})

	it('rejects strokes whose color differs from the fill', () => {
		const input = wrap(
			'<defs><style>.a{stroke:#f00}</style></defs>',
			'<path d="M0 0H10" class="a"/>',
		)

		expect(() => removeCSSOutline(input)).toThrow(/differs from fill/)
	})

	it('rejects unsupported stroke features', () => {
		const input = wrap('', '<path d="M0 0H10" style="stroke:#000;stroke-linecap:round"/>')

		expect(() => removeCSSOutline(input)).toThrow(/stroke-linecap/)
	})
})

describe('removeCSSOutline on all stroked SVGs under resources/', () => {
	it('finds stroked SVG files', () => {
		expect(strokedSvgs.length).toBeGreaterThan(0)
	})

	for (const { relativePath, contents } of strokedSvgs) {
		describe(relativePath, () => {
			const output = removeCSSOutline(contents)

			it('removes all stroke declarations', () => {
				expect(output).not.toMatch(/stroke\s*:/)

				// Any remaining <style> block must not declare stroke-related
				// CSS properties (e.g. `stroke`, `stroke-width`). Non-stroke
				// rules (e.g. `fill`) are allowed to stay in the block.
				for (const styleBlock of output.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
					expect(styleBlock[1]).not.toMatch(/stroke(?:-[\w-]+)?\s*:/)
				}
			})

			it('preserves the SVG root and original shape data', () => {
				const viewBox = /viewBox="[^"]*"/.exec(contents)

				if (viewBox === null) {
					throw new Error('Source SVG has no viewBox')
				}

				expect(output).toContain(viewBox[0])

				// Every original path's geometry must be present in the output
				// (stroked shapes keep their fill; only styling changes),
				// except shapes that were fill:none (pure stroke lines),
				// which are replaced by their outline.
				for (const element of contents.matchAll(/<path[^>]*>/g)) {
					if (element[0].includes('fill:none')) {
						continue
					}

					const d = / d="([^"]*)"/.exec(element[0])

					if (d !== null) {
						expect(output).toContain(d[1])
					}
				}
			})

			it('is a no-op when applied twice', () => {
				expect(removeCSSOutline(output)).toBe(output)
			})
		})
	}
})

// ---------------------------------------------------------------------------
// Pixel-comparison tests
// ---------------------------------------------------------------------------

/** Rasterize an SVG string to raw 8-bit pixels, 512 pixels wide. */
async function renderSvg(
	svgContents: string,
): Promise<{ width: number; height: number; channels: number; data: Buffer }> {
	const { data, info } = await sharp(Buffer.from(svgContents))
		.resize({ width: 512 })
		.raw()
		.toBuffer({ resolveWithObject: true })

	return { width: info.width, height: info.height, channels: info.channels, data }
}

describe('rendering equivalence', () => {
	/**
	 * The rasterizer flattens curves at a fixed device-space tolerance, so two
	 * different-but-equivalent vector representations of the same image never
	 * rasterize fully identically: hairline antialiasing differences along
	 * edges are inherent. These thresholds are calibrated to that floor:
	 * structural errors (a missing or displaced stroke) exceed them by orders
	 * of magnitude.
	 */
	const MAX_DIFFERING_FRACTION = 0.1
	const MAX_LARGE_DIFF_FRACTION = 0.003

	for (const { relativePath, contents } of strokedSvgs) {
		it(`${relativePath} renders visually identically after conversion`, async () => {
			const original = await renderSvg(contents)
			const converted = await renderSvg(removeCSSOutline(contents))

			expect(converted.width).toBe(original.width)
			expect(converted.height).toBe(original.height)
			expect(converted.channels).toBe(original.channels)
			let differing = 0
			let largeDifference = 0
			const pixelCount = original.width * original.height

			for (let i = 0; i < original.data.length; i += original.channels) {
				let maximum = 0

				for (let c = 0; c < original.channels; c++) {
					maximum = Math.max(maximum, Math.abs(original.data[i + c] - converted.data[i + c]))
				}

				if (maximum > 0) {
					differing++
				}

				if (maximum > 32) {
					largeDifference++
				}
			}
			expect(
				differing / pixelCount,
				`${differing} of ${pixelCount} pixels differ`,
			).toBeLessThanOrEqual(MAX_DIFFERING_FRACTION)
			expect(
				largeDifference / pixelCount,
				`${largeDifference} of ${pixelCount} pixels differ by more than 32 levels`,
			).toBeLessThanOrEqual(MAX_LARGE_DIFF_FRACTION)
		})
	}
})
