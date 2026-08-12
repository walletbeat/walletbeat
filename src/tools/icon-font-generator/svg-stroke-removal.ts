/**
 * SVG CSS stroke removal.
 *
 * Takes a monochrome SVG where some shapes are stroked via CSS rules (with a
 * stroke color identical to the shape's fill color), and returns a visually
 * equivalent SVG without any CSS stroke rules. For each stroked shape, the
 * region the stroke would have painted is re-created as an explicit filled
 * `<path>` outline placed right after the shape.
 *
 * The outline is derived purely from the source geometry: curves are
 * adaptively flattened to a fine polyline, which is then offset by half the
 * stroke width on both sides, applying SVG stroking rules (miter joins with
 * miter limit, bevel fallback, butt caps). The resulting rings are filled
 * with the default nonzero rule, which reproduces the stroked region the
 * same way vector rasterizers do internally when converting strokes to
 * fills.
 *
 * Supported: `<path>` (M/L/H/V/C/S/Q/A/Z and relative forms), `<rect>`
 * (including rounded corners), `<ellipse>`; stroke properties defined in
 * `<style>` class rules and/or inline `style` attributes. Elements may carry
 * a `transform` attribute: the outline is computed in local coordinates and
 * inherits the same transform, so any transform works. Unsupported stroke
 * features (dashes, non-butt caps, non-miter joins, gradients, opacity)
 * cause an error rather than a wrong result.
 */

interface Point {
	x: number
	y: number
}

interface Subpath {
	points: Point[]
	closed: boolean
}

interface StrokeProperties {
	stroke: string
	strokeWidth: number
	miterLimit: number
}

/** Flattening tolerance, in user units: maximum deviation of the emitted
 * polyline from the true curve / true offset curve. */
const FLATTEN_TOLERANCE = 0.005

const EPSILON = 1e-9

/** Bezier circular-arc constant for a quarter circle. */
const KAPPA = 0.5522847498307936

// ---------------------------------------------------------------------------
// CSS parsing
// ---------------------------------------------------------------------------

interface CSSDeclaration {
	property: string
	value: string
}

interface CSSRules {
	/** Class name → declarations, in cascade order. */
	classes: Map<string, CSSDeclaration[]>
}

function parseCSSRules(css: string): CSSRules {
	const classes = new Map<string, CSSDeclaration[]>()
	const ruleRegex = /([^{}]+)\{([^{}]*)\}/g
	let match

	while ((match = ruleRegex.exec(css)) !== null) {
		const selectors = match[1].split(',').map(s => s.trim())
		const declarations = parseDeclarations(match[2])

		for (const selector of selectors) {
			const classMatch = /^\.([A-Za-z_][\w-]*)$/.exec(selector)

			if (classMatch === null) {
				throw new Error(`Unsupported CSS selector: ${selector}`)
			}

			const className = classMatch[1]
			const existing = classes.get(className) ?? []

			classes.set(className, existing.concat(declarations))
		}
	}

	return { classes }
}

function parseDeclarations(block: string): CSSDeclaration[] {
	return block
		.split(';')
		.map(declaration => declaration.trim())
		.filter(declaration => declaration !== '')
		.map(declaration => {
			const colon = declaration.indexOf(':')

			if (colon === -1) {
				throw new Error(`Malformed CSS declaration: ${declaration}`)
			}

			return {
				property: declaration.slice(0, colon).trim().toLowerCase(),
				value: declaration.slice(colon + 1).trim(),
			}
		})
}

function isStrokeProperty(property: string): boolean {
	return property === 'stroke' || property.startsWith('stroke-')
}

function normalizeColor(color: string): string {
	const c = color.trim().toLowerCase()

	if (c === 'black' || c === '#000' || c === '#000000' || c === 'rgb(0,0,0)') {
		return '#000'
	}

	if (/^#([0-9a-f]{3})$/.test(c)) {
		return c.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')
	}

	return c
}

function parseLength(value: string, context: string): number {
	const match = /^([+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)(px)?$/.exec(value.trim())

	if (match === null) {
		throw new Error(`Unsupported length "${value}" in ${context}`)
	}

	return parseFloat(match[1])
}

/**
 * Computes the effective stroke properties of an element from its class
 * declarations followed by inline style declarations, or null if the element
 * is not stroked. Throws on stroke features the outline generator cannot
 * reproduce.
 */
function computeStrokeProperties(declarations: CSSDeclaration[]): StrokeProperties | null {
	let stroke: string | null = null
	let strokeWidth = 1
	let miterLimit = 4

	for (const { property, value } of declarations) {
		switch (property) {
			case 'stroke':
				stroke = value === 'none' ? null : normalizeColor(value)
				break
			case 'stroke-width':
				strokeWidth = parseLength(value, 'stroke-width')
				break
			case 'stroke-miterlimit':
				miterLimit = parseFloat(value)
				break
			case 'stroke-linecap':
				if (value !== 'butt') {
					throw new Error(`Unsupported stroke-linecap: ${value}`)
				}

				break
			case 'stroke-linejoin':
				if (value !== 'miter') {
					throw new Error(`Unsupported stroke-linejoin: ${value}`)
				}

				break
			case 'stroke-dasharray':
				if (value !== 'none') {
					throw new Error(`Unsupported stroke-dasharray: ${value}`)
				}

				break
			case 'stroke-opacity':
				if (parseFloat(value) !== 1) {
					throw new Error(`Unsupported stroke-opacity: ${value}`)
				}

				break
			default:
				if (isStrokeProperty(property)) {
					throw new Error(`Unsupported stroke property: ${property}`)
				}
		}
	}

	if (stroke === null || strokeWidth <= 0) {
		return null
	}

	return { stroke, strokeWidth, miterLimit }
}

// ---------------------------------------------------------------------------
// Path data parsing and flattening
// ---------------------------------------------------------------------------

function distanceToChord(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x
	const dy = b.y - a.y
	const lengthSquared = dx * dx + dy * dy

	if (lengthSquared < EPSILON) {
		return Math.hypot(p.x - a.x, p.y - a.y)
	}

	return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / Math.sqrt(lengthSquared)
}

function flattenCubic(
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
	tolerance: number,
	out: Point[],
): void {
	if (distanceToChord(p1, p0, p3) <= tolerance && distanceToChord(p2, p0, p3) <= tolerance) {
		out.push(p3)

		return
	}

	// De Casteljau subdivision at t = 0.5.
	const p01 = midpoint(p0, p1)
	const p12 = midpoint(p1, p2)
	const p23 = midpoint(p2, p3)
	const p012 = midpoint(p01, p12)
	const p123 = midpoint(p12, p23)
	const p0123 = midpoint(p012, p123)

	flattenCubic(p0, p01, p012, p0123, tolerance, out)
	flattenCubic(p0123, p123, p23, p3, tolerance, out)
}

function midpoint(a: Point, b: Point): Point {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Converts an SVG endpoint-parameterized elliptical arc into cubic Bezier
 * curves appended to `out` (per the SVG implementation notes algorithm). */
function flattenArc(
	p0: Point,
	rx: number,
	ry: number,
	xAxisRotationDegrees: number,
	largeArcFlag: boolean,
	sweepFlag: boolean,
	p1: Point,
	tolerance: number,
	out: Point[],
): void {
	if (Math.abs(p1.x - p0.x) < EPSILON && Math.abs(p1.y - p0.y) < EPSILON) {
		return
	}

	rx = Math.abs(rx)
	ry = Math.abs(ry)

	if (rx < EPSILON || ry < EPSILON) {
		out.push(p1)

		return
	}

	const phi = (xAxisRotationDegrees * Math.PI) / 180
	const cosPhi = Math.cos(phi)
	const sinPhi = Math.sin(phi)
	// Step 1: compute (x1', y1').
	const dx2 = (p0.x - p1.x) / 2
	const dy2 = (p0.y - p1.y) / 2
	const x1p = cosPhi * dx2 + sinPhi * dy2
	const y1p = -sinPhi * dx2 + cosPhi * dy2
	// Correct out-of-range radii.
	const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)

	if (lambda > 1) {
		const scale = Math.sqrt(lambda)

		rx *= scale
		ry *= scale
	}

	// Step 2: compute (cx', cy').
	const rxSq = rx * rx
	const rySq = ry * ry
	const numerator = rxSq * rySq - rxSq * y1p * y1p - rySq * x1p * x1p
	const denominator = rxSq * y1p * y1p + rySq * x1p * x1p
	const coefficient =
		(largeArcFlag === sweepFlag ? -1 : 1) * Math.sqrt(Math.max(0, numerator / denominator))
	const cxp = (coefficient * rx * y1p) / ry
	const cyp = (-coefficient * ry * x1p) / rx
	// Step 3: compute center.
	const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2
	const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2
	// Step 4: compute start and sweep angles.
	const startVectorX = (x1p - cxp) / rx
	const startVectorY = (y1p - cyp) / ry
	const endVectorX = (-x1p - cxp) / rx
	const endVectorY = (-y1p - cyp) / ry
	const theta1 = Math.atan2(startVectorY, startVectorX)
	let deltaTheta = Math.atan2(endVectorY, endVectorX) - theta1

	if (!sweepFlag && deltaTheta > 0) {
		deltaTheta -= 2 * Math.PI
	} else if (sweepFlag && deltaTheta < 0) {
		deltaTheta += 2 * Math.PI
	}

	// Split into segments no larger than a quarter turn and emit cubics.
	const segmentCount = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)))
	const segmentAngle = deltaTheta / segmentCount
	const controlScale = (4 / 3) * Math.tan(segmentAngle / 4)
	const pointAt = (theta: number): Point => ({
		x: cx + rx * Math.cos(theta) * cosPhi - ry * Math.sin(theta) * sinPhi,
		y: cy + rx * Math.cos(theta) * sinPhi + ry * Math.sin(theta) * cosPhi,
	})
	const derivativeAt = (theta: number): Point => ({
		x: -rx * Math.sin(theta) * cosPhi - ry * Math.cos(theta) * sinPhi,
		y: -rx * Math.sin(theta) * sinPhi + ry * Math.cos(theta) * cosPhi,
	})
	let current = p0

	for (let i = 0; i < segmentCount; i++) {
		const thetaA = theta1 + i * segmentAngle
		const thetaB = thetaA + segmentAngle
		const end = i === segmentCount - 1 ? p1 : pointAt(thetaB)
		const dA = derivativeAt(thetaA)
		const dB = derivativeAt(thetaB)

		flattenCubic(
			current,
			{ x: current.x + controlScale * dA.x, y: current.y + controlScale * dA.y },
			{ x: end.x - controlScale * dB.x, y: end.y - controlScale * dB.y },
			end,
			tolerance,
			out,
		)
		current = end
	}
}

const NUMBER_REGEX = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y

/** Parses SVG path data and flattens it into polyline subpaths. */
export function pathDataToSubpaths(d: string, tolerance: number): Subpath[] {
	const subpaths: Subpath[] = []
	let index = 0

	const skipSeparators = (): void => {
		while (index < d.length && /[\s,]/.test(d[index])) {
			index++
		}
	}
	const atNumber = (): boolean => {
		skipSeparators()
		const c = d[index]

		return c !== undefined && /[\d.+-]/.test(c)
	}
	const readNumber = (): number => {
		skipSeparators()
		NUMBER_REGEX.lastIndex = index
		const match = NUMBER_REGEX.exec(d)

		if (match === null || match.index !== index) {
			throw new Error(`Expected number at position ${index} in path data`)
		}

		index += match[0].length

		return parseFloat(match[0])
	}
	const readFlag = (): boolean => {
		skipSeparators()
		const c = d[index]

		if (c !== '0' && c !== '1') {
			throw new Error(`Expected arc flag at position ${index} in path data`)
		}

		index++

		return c === '1'
	}

	let current: Point = { x: 0, y: 0 }
	let subpathStart: Point = { x: 0, y: 0 }
	let points: Point[] = []
	let previousCubicControl: Point | null = null
	let previousQuadraticControl: Point | null = null

	const startSubpath = (p: Point): void => {
		if (points.length > 1) {
			subpaths.push({ points, closed: false })
		}

		points = [p]
		subpathStart = p
		current = p
	}
	const lineTo = (p: Point): void => {
		points.push(p)
		current = p
	}
	const closeSubpath = (): void => {
		if (points.length > 1) {
			subpaths.push({ points, closed: true })
		}

		points = [subpathStart]
		current = subpathStart
	}

	while (true) {
		skipSeparators()

		if (index >= d.length) {
			break
		}

		const command = d[index]

		if (!/[MmLlHhVvCcSsQqAaZz]/.test(command)) {
			throw new Error(`Unsupported path command "${command}" at position ${index}`)
		}

		index++
		const relative = command === command.toLowerCase()
		const base = (): Point => (relative ? current : { x: 0, y: 0 })
		let trackedControl: 'cubic' | 'quadratic' | null = null

		switch (command.toUpperCase()) {
			case 'M': {
				const b = base()

				startSubpath({ x: b.x + readNumber(), y: b.y + readNumber() })
				while (atNumber()) {
					const b2 = base()

					lineTo({ x: b2.x + readNumber(), y: b2.y + readNumber() })
				}
				break
			}
			case 'L':
				do {
					const b = base()

					lineTo({ x: b.x + readNumber(), y: b.y + readNumber() })
				} while (atNumber())
				break
			case 'H':
				do {
					const b = base()

					lineTo({ x: b.x + readNumber(), y: current.y })
				} while (atNumber())
				break
			case 'V':
				do {
					const b = base()

					lineTo({ x: current.x, y: b.y + readNumber() })
				} while (atNumber())
				break
			case 'C':
				do {
					const b = base()
					const c1 = { x: b.x + readNumber(), y: b.y + readNumber() }
					const c2 = { x: b.x + readNumber(), y: b.y + readNumber() }
					const end = { x: b.x + readNumber(), y: b.y + readNumber() }

					flattenCubic(current, c1, c2, end, tolerance, points)
					current = end
					previousCubicControl = c2
				} while (atNumber())
				trackedControl = 'cubic'
				break
			case 'S':
				do {
					const b = base()
					const c1 =
						previousCubicControl === null
							? current
							: {
									x: 2 * current.x - previousCubicControl.x,
									y: 2 * current.y - previousCubicControl.y,
								}
					const c2 = { x: b.x + readNumber(), y: b.y + readNumber() }
					const end = { x: b.x + readNumber(), y: b.y + readNumber() }

					flattenCubic(current, c1, c2, end, tolerance, points)
					current = end
					previousCubicControl = c2
				} while (atNumber())
				trackedControl = 'cubic'
				break
			case 'Q':
				do {
					const b = base()
					const q = { x: b.x + readNumber(), y: b.y + readNumber() }
					const end = { x: b.x + readNumber(), y: b.y + readNumber() }

					flattenQuadratic(current, q, end, tolerance, points)
					current = end
					previousQuadraticControl = q
				} while (atNumber())
				trackedControl = 'quadratic'
				break
			case 'A':
				do {
					const b = base()
					const rx = readNumber()
					const ry = readNumber()
					const rotation = readNumber()
					const largeArc = readFlag()
					const sweep = readFlag()
					const end = { x: b.x + readNumber(), y: b.y + readNumber() }

					flattenArc(current, rx, ry, rotation, largeArc, sweep, end, tolerance, points)
					current = end
				} while (atNumber())
				break
			case 'Z':
				closeSubpath()
				break
			default:
				throw new Error(`Unsupported path command "${command}"`)
		}

		if (trackedControl !== 'cubic') {
			previousCubicControl = null
		}

		if (trackedControl !== 'quadratic') {
			previousQuadraticControl = null
		}
	}

	if (points.length > 1) {
		subpaths.push({ points, closed: false })
	}

	void previousQuadraticControl // T/t is unsupported; kept for parser clarity.

	return subpaths
}

function flattenQuadratic(p0: Point, q: Point, p1: Point, tolerance: number, out: Point[]): void {
	// Exact degree elevation to a cubic.
	flattenCubic(
		p0,
		{ x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) },
		{ x: p1.x + (2 / 3) * (q.x - p1.x), y: p1.y + (2 / 3) * (q.y - p1.y) },
		p1,
		tolerance,
		out,
	)
}

// ---------------------------------------------------------------------------
// Shape-to-subpath conversion
// ---------------------------------------------------------------------------

function rectToSubpaths(attributes: Map<string, string>, tolerance: number): Subpath[] {
	const x = parseFloat(attributes.get('x') ?? '0')
	const y = parseFloat(attributes.get('y') ?? '0')
	const width = parseFloat(attributes.get('width') ?? '0')
	const height = parseFloat(attributes.get('height') ?? '0')
	let rx = attributes.has('rx') ? parseFloat(attributes.get('rx') ?? '0') : NaN
	let ry = attributes.has('ry') ? parseFloat(attributes.get('ry') ?? '0') : NaN

	if (Number.isNaN(rx)) {
		rx = Number.isNaN(ry) ? 0 : ry
	}

	if (Number.isNaN(ry)) {
		ry = rx
	}

	rx = Math.min(rx, width / 2)
	ry = Math.min(ry, height / 2)
	const points: Point[] = [{ x: x + rx, y }]
	const corner = (from: Point, control1Toward: Point, control2Toward: Point, to: Point): void => {
		flattenCubic(
			from,
			{
				x: from.x + KAPPA * (control1Toward.x - from.x),
				y: from.y + KAPPA * (control1Toward.y - from.y),
			},
			{
				x: to.x + KAPPA * (control2Toward.x - to.x),
				y: to.y + KAPPA * (control2Toward.y - to.y),
			},
			to,
			tolerance,
			points,
		)
	}

	points.push({ x: x + width - rx, y })

	if (rx > 0 || ry > 0) {
		corner(
			{ x: x + width - rx, y },
			{ x: x + width, y },
			{ x: x + width, y },
			{ x: x + width, y: y + ry },
		)
	}

	points.push({ x: x + width, y: y + height - ry })

	if (rx > 0 || ry > 0) {
		corner(
			{ x: x + width, y: y + height - ry },
			{ x: x + width, y: y + height },
			{ x: x + width, y: y + height },
			{ x: x + width - rx, y: y + height },
		)
	}

	points.push({ x: x + rx, y: y + height })

	if (rx > 0 || ry > 0) {
		corner(
			{ x: x + rx, y: y + height },
			{ x, y: y + height },
			{ x, y: y + height },
			{ x, y: y + height - ry },
		)
	}

	points.push({ x, y: y + ry })

	if (rx > 0 || ry > 0) {
		corner({ x, y: y + ry }, { x, y }, { x, y }, { x: x + rx, y })
	}

	return [{ points, closed: true }]
}

function ellipseToSubpaths(attributes: Map<string, string>, tolerance: number): Subpath[] {
	const cx = parseFloat(attributes.get('cx') ?? '0')
	const cy = parseFloat(attributes.get('cy') ?? '0')
	const rx = parseFloat(attributes.get('rx') ?? '0')
	const ry = parseFloat(attributes.get('ry') ?? attributes.get('rx') ?? '0')

	if (rx <= 0 || ry <= 0) {
		return []
	}

	const points: Point[] = [{ x: cx + rx, y: cy }]
	const quarters: [Point, Point, Point][] = [
		[
			{ x: cx + rx, y: cy + KAPPA * ry },
			{ x: cx + KAPPA * rx, y: cy + ry },
			{ x: cx, y: cy + ry },
		],
		[
			{ x: cx - KAPPA * rx, y: cy + ry },
			{ x: cx - rx, y: cy + KAPPA * ry },
			{ x: cx - rx, y: cy },
		],
		[
			{ x: cx - rx, y: cy - KAPPA * ry },
			{ x: cx - KAPPA * rx, y: cy - ry },
			{ x: cx, y: cy - ry },
		],
		[
			{ x: cx + KAPPA * rx, y: cy - ry },
			{ x: cx + rx, y: cy - KAPPA * ry },
			{ x: cx + rx, y: cy },
		],
	]
	let current = points[0]

	for (const [c1, c2, end] of quarters) {
		flattenCubic(current, c1, c2, end, tolerance, points)
		current = end
	}

	return [{ points, closed: true }]
}

// ---------------------------------------------------------------------------
// Polyline offsetting (stroke outline generation)
// ---------------------------------------------------------------------------

function deduplicate(points: Point[], closed: boolean): Point[] {
	const out: Point[] = []

	for (const p of points) {
		const last = out[out.length - 1]

		if (last === undefined || Math.hypot(p.x - last.x, p.y - last.y) > EPSILON) {
			out.push(p)
		}
	}

	if (closed && out.length > 1) {
		const first = out[0]
		const last = out[out.length - 1]

		if (Math.hypot(first.x - last.x, first.y - last.y) <= EPSILON) {
			out.pop()
		}
	}

	return out
}

function direction(from: Point, to: Point): Point {
	const length = Math.hypot(to.x - from.x, to.y - from.y)

	return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
}

/** Normal pointing to one consistent side of travel direction. */
function sideNormal(d: Point): Point {
	return { x: d.y, y: -d.x }
}

/**
 * Emits the offset of vertex `p` between incoming direction `d1` and outgoing
 * direction `d2` at radius `r`, applying SVG miter-join rules. When the two
 * offset lines diverge, a miter vertex is inserted unless the miter ratio
 * exceeds `miterLimit` (bevel). When they converge, the offset points are
 * simply connected; the nonzero fill rule absorbs the resulting overlap.
 */
function emitJoin(
	p: Point,
	d1: Point,
	d2: Point,
	r: number,
	miterLimit: number,
	out: Point[],
): void {
	const n1 = sideNormal(d1)
	const n2 = sideNormal(d2)
	const a = { x: p.x + r * n1.x, y: p.y + r * n1.y }
	const b = { x: p.x + r * n2.x, y: p.y + r * n2.y }

	out.push(a)
	const cross = d1.x * d2.y - d1.y * d2.x
	const dot = d1.x * d2.x + d1.y * d2.y

	if (Math.abs(cross) > EPSILON) {
		// Intersection of line(a, d1) and line(b, d2): a + t1*d1 = b + t2*d2.
		const t1 = ((b.x - a.x) * d2.y - (b.y - a.y) * d2.x) / cross

		if (t1 > EPSILON) {
			// Diverging offsets: join needed. Miter ratio is 1/sin(psi/2)
			// where psi is the interior angle between the two segments as
			// rays from the vertex, i.e. between -d1 and d2:
			// cos(psi) = -d1.d2, so sin(psi/2) = sqrt((1 + d1.d2)/2).
			const sinHalf = Math.sqrt(Math.max(0, (1 + dot) / 2))

			if (sinHalf > EPSILON && 1 / sinHalf <= miterLimit) {
				out.push({ x: a.x + t1 * d1.x, y: a.y + t1 * d1.y })
			}
		}
	}

	out.push(b)
}

/** Offsets a closed ring to one side by `r`, walking it in its given order. */
function offsetClosedRing(points: Point[], r: number, miterLimit: number): Point[] {
	const n = points.length
	const out: Point[] = []

	for (let i = 0; i < n; i++) {
		const previous = points[(i - 1 + n) % n]
		const p = points[i]
		const next = points[(i + 1) % n]

		emitJoin(p, direction(previous, p), direction(p, next), r, miterLimit, out)
	}

	return out
}

/** Offsets an open polyline on both sides, closing with butt caps. */
function offsetOpenPolyline(points: Point[], r: number, miterLimit: number): Point[] {
	const out: Point[] = []
	const emitSide = (pts: Point[]): void => {
		const first = sideNormal(direction(pts[0], pts[1]))

		out.push({ x: pts[0].x + r * first.x, y: pts[0].y + r * first.y })

		for (let i = 1; i < pts.length - 1; i++) {
			emitJoin(
				pts[i],
				direction(pts[i - 1], pts[i]),
				direction(pts[i], pts[i + 1]),
				r,
				miterLimit,
				out,
			)
		}
		const lastIndex = pts.length - 1
		const last = sideNormal(direction(pts[lastIndex - 1], pts[lastIndex]))

		out.push({ x: pts[lastIndex].x + r * last.x, y: pts[lastIndex].y + r * last.y })
	}

	emitSide(points)
	// Walking the reversed polyline offsets the other side; the two straight
	// connections between the side ends are exactly the butt caps.
	emitSide(points.slice().reverse())

	return out
}

function formatCoordinate(value: number): string {
	const rounded = value.toFixed(4)

	return rounded.replace(/\.?0+$/, '').replace(/^-0$/, '0')
}

export function ringToPathData(ring: Point[]): string {
	const parts: string[] = []

	for (let i = 0; i < ring.length; i++) {
		parts.push(
			`${i === 0 ? 'M' : 'L'}${formatCoordinate(ring[i].x)} ${formatCoordinate(ring[i].y)}`,
		)
	}
	parts.push('Z')

	return parts.join('')
}

/** Builds the path data of the region a stroke would paint over `subpaths`. */
export function strokeOutlinePathData(
	subpaths: Subpath[],
	strokeWidth: number,
	miterLimit: number,
): string {
	const r = strokeWidth / 2
	const rings: Point[][] = []

	for (const subpath of subpaths) {
		const points = deduplicate(subpath.points, subpath.closed)

		if (points.length < 2) {
			// Zero-length subpath: with butt caps, nothing is painted.
			continue
		}

		if (subpath.closed) {
			// Outer band boundary and inner band boundary; walked in opposite
			// directions their windings cancel between them, leaving exactly
			// the stroke band filled under the nonzero rule.
			rings.push(offsetClosedRing(points, r, miterLimit))
			rings.push(offsetClosedRing(points.slice().reverse(), r, miterLimit))
		} else {
			rings.push(offsetOpenPolyline(points, r, miterLimit))
		}
	}

	return rings.map(ringToPathData).join('')
}

// ---------------------------------------------------------------------------
// SVG document rewriting
// ---------------------------------------------------------------------------

const TAG_ATTRIBUTE_REGEX = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g

function parseAttributes(tag: string): Map<string, string> {
	const attributes = new Map<string, string>()
	let match

	TAG_ATTRIBUTE_REGEX.lastIndex = 0
	while ((match = TAG_ATTRIBUTE_REGEX.exec(tag)) !== null) {
		attributes.set(match[1], match[2])
	}

	return attributes
}

function serializeDeclarations(declarations: CSSDeclaration[]): string {
	return declarations.map(({ property, value }) => `${property}:${value}`).join(';')
}

/**
 * Removes CSS-based strokes from a monochrome SVG, replacing each stroked
 * shape's stroke with an explicit filled outline path so that the document
 * renders identically without any stroke rules.
 */
export function removeCSSOutline(svgBytes: string): string {
	let svg = svgBytes

	// Parse and rewrite <style> rules.
	const strokeOnlyClasses = new Set<string>()
	const classDeclarations = new Map<string, CSSDeclaration[]>()

	svg = svg.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (styleTag, css: string) => {
		const rules = parseCSSRules(css)
		let remaining = ''

		for (const [className, declarations] of rules.classes) {
			classDeclarations.set(
				className,
				(classDeclarations.get(className) ?? []).concat(declarations),
			)
			const kept = declarations.filter(({ property }) => !isStrokeProperty(property))

			if (kept.length === 0) {
				strokeOnlyClasses.add(className)
			} else {
				remaining += `.${className}{${serializeDeclarations(kept)}}`
			}
		}

		return remaining === '' ? '' : styleTag.replace(css, remaining)
	})
	svg = svg.replace(/<defs>\s*<\/defs>/g, '')

	// Rewrite stroked shapes.
	svg = svg.replace(
		/<(path|rect|ellipse)\b[^>]*?\/?>/g,
		(tag, tagName: 'path' | 'rect' | 'ellipse') => {
			const attributes = parseAttributes(tag)
			const className = attributes.get('class')
			const declarations: CSSDeclaration[] = []

			if (className !== undefined) {
				if (/\s/.test(className.trim())) {
					throw new Error(`Unsupported multiple classes: ${className}`)
				}

				declarations.push(...(classDeclarations.get(className.trim()) ?? []))
			}

			const inlineStyle = attributes.get('style')
			const inlineDeclarations = inlineStyle === undefined ? [] : parseDeclarations(inlineStyle)

			declarations.push(...inlineDeclarations)
			const strokeProperties = computeStrokeProperties(declarations)

			// Rebuild the tag without stroke styling.
			let newTag = tag

			if (className !== undefined && strokeOnlyClasses.has(className.trim())) {
				newTag = newTag.replace(/\s+class="[^"]*"/, '')
			}

			let fillNone = false

			if (inlineStyle !== undefined) {
				const kept = inlineDeclarations.filter(({ property }) => !isStrokeProperty(property))

				fillNone = kept.some(({ property, value }) => property === 'fill' && value === 'none')
				newTag =
					kept.length === 0
						? newTag.replace(/\s+style="[^"]*"/, '')
						: newTag.replace(/style="[^"]*"/, `style="${serializeDeclarations(kept)}"`)
			}

			if (strokeProperties === null) {
				return newTag
			}

			// The premise of this tool: the stroke must not introduce a second
			// color. It must match the fill color (or the fill is none, in
			// which case only the stroke is visible at all).
			const fillDeclaration = [...declarations]
				.reverse()
				.find(({ property }) => property === 'fill')
			const fill = attributes.get('fill') ?? (fillDeclaration ? fillDeclaration.value : '#000')

			if (fill !== 'none' && normalizeColor(fill) !== strokeProperties.stroke) {
				throw new Error(
					`Stroke color ${strokeProperties.stroke} differs from fill ${fill}; not a monochrome shape`,
				)
			}

			let subpaths: Subpath[]

			switch (tagName) {
				case 'path': {
					const d = attributes.get('d')

					if (d === undefined) {
						return newTag
					}

					subpaths = pathDataToSubpaths(d, FLATTEN_TOLERANCE)
					break
				}
				case 'rect':
					subpaths = rectToSubpaths(attributes, FLATTEN_TOLERANCE)
					break
				case 'ellipse':
					subpaths = ellipseToSubpaths(attributes, FLATTEN_TOLERANCE)
					break
			}

			const outlineData = strokeOutlinePathData(
				subpaths,
				strokeProperties.strokeWidth,
				strokeProperties.miterLimit,
			)

			if (outlineData === '') {
				return newTag
			}

			// The outline is computed in the element's local coordinates, so it
			// must inherit the element's own transform (ancestor transforms are
			// inherited by staying an adjacent sibling).
			const transform = attributes.get('transform')
			const transformAttribute = transform === undefined ? '' : ` transform="${transform}"`
			const outlineTag = `<path d="${outlineData}"${transformAttribute}/>`

			// A shape with fill:none renders nothing once its stroke is
			// removed, so the outline fully replaces it.
			return fillNone ? outlineTag : newTag + outlineTag
		},
	)

	return svg
}
