import sharp from 'sharp'

/**
 * Threshold on the smooth-region 8x8 blockiness ratio above which an image is
 * considered to be a low-quality JPEG.
 *
 * The blockiness ratio compares the mean absolute luminance step at 8-pixel
 * JPEG block boundaries against the mean step away from those boundaries,
 * measured only inside smooth (low local-variance) regions. A genuine lossless
 * image hovers around 1.0 (boundaries are no more discontinuous than interior).
 * A JPEG-derived image shows elevated discontinuity exactly at block boundaries
 * in smooth regions, pushing the ratio well above 1.0.
 *
 * Calibrated against the walletbeat asset corpus (see tests/image-integrity.test.ts):
 *   - Genuine clean image (flat logos, gradients, lossless screenshots): ~0.0 - 1.12
 *   - Text/UI-heavy lossless screenshots (false-positive risk): up to ~1.45
 *   - Obvious JPEG-derived images: > 2.0
 */
export const BLOCKY_JPEG_THRESHOLD = 1.5

/** Minimum dimensions (px) required for a reliable blockiness measurement. */
const MIN_DIMENSION = 16

/** JPEG DCT block size. */
const BLOCK_SIZE = 8

/** Local variance window radius (a 3x3 neighborhood). */
const VARIANCE_RADIUS = 1

/** Result of analyzing a single image. */
export interface JpegBlockinessResult {
	/** Smooth-region blockiness ratio (>= 0). */
	score: number
	/** Whether the image is judged to be a low-quality blocky JPEG. */
	isTooBlocky: boolean
}

/**
 * Compute the smooth-region 8x8 blockiness ratio for raw RGB/RGBA pixel data.
 *
 * The metric isolates JPEG's hallmark 8x8 DCT block grid from real image
 * content by only counting luminance steps inside smooth regions (where local
 * variance is below the image median). In such regions a genuine lossless
 * image has essentially no structure, so block boundaries are no more
 * discontinuous than interior pixels (ratio ~ 1.0). A JPEG-derived image,
 * however, quantizes each 8x8 block independently, so even smooth regions show
 * a step at every block boundary (ratio well above 1.0). Restricting to smooth
 * regions also avoids false positives on flat logos whose sharp edges happen
 * to align with the block grid.
 *
 * @param data      Raw pixel bytes (RGB or RGBA, tightly packed).
 * @param width     Image width in pixels.
 * @param height    Image height in pixels.
 * @param channels  Number of channels per pixel (3 or 4).
 * @returns The blockiness ratio, or 0 if the image is too small to measure.
 */
export function computeBlockinessScore(
	data: Uint8Array,
	width: number,
	height: number,
	channels: number,
): number {
	if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
		return 0
	}

	const pixelCount = width * height

	// --- Luminance (Rec. 601) ---
	const lum = new Float32Array(pixelCount)

	for (let i = 0; i < pixelCount; i++) {
		const offset = i * channels

		lum[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]
	}

	// --- 3x3 local variance via an integral image ---
	const integralWidth = width + 1
	const integralHeight = height + 1
	const sum = new Float64Array(integralWidth * integralHeight)
	const sumSq = new Float64Array(integralWidth * integralHeight)

	for (let y = 0; y < height; y++) {
		let rowSum = 0
		let rowSq = 0

		for (let x = 0; x < width; x++) {
			const value = lum[y * width + x]

			rowSum += value
			rowSq += value * value

			const idx = (y + 1) * integralWidth + (x + 1)

			sum[idx] = sum[y * integralWidth + (x + 1)] + rowSum
			sumSq[idx] = sumSq[y * integralWidth + (x + 1)] + rowSq
		}
	}

	const windowSum = (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		integral: Float64Array,
	): number => {
		return (
			integral[y1 * integralWidth + x1] -
			integral[y0 * integralWidth + x1] -
			integral[y1 * integralWidth + x0] +
			integral[y0 * integralWidth + x0]
		)
	}

	const variance = new Float32Array(pixelCount)
	const medianValues: number[] = []

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const x0 = Math.max(0, x - VARIANCE_RADIUS)
			const x1 = Math.min(width, x + VARIANCE_RADIUS + 1)
			const y0 = Math.max(0, y - VARIANCE_RADIUS)
			const y1 = Math.min(height, y + VARIANCE_RADIUS + 1)
			const count = (x1 - x0) * (y1 - y0)
			const s = windowSum(x0, y0, x1, y1, sum)
			const sq = windowSum(x0, y0, x1, y1, sumSq)
			const value = Math.max(0, (sq - (s * s) / count) / count)

			variance[y * width + x] = value
			medianValues.push(value)
		}
	}

	medianValues.sort((a, b) => a - b)
	const median = medianValues[Math.floor(medianValues.length / 2)]

	// Smooth mask: local variance below the image median.
	const smooth = new Uint8Array(pixelCount)

	for (let i = 0; i < pixelCount; i++) {
		smooth[i] = variance[i] < median + 1e-9 ? 1 : 0
	}

	// --- Accumulate boundary vs interior mean luminance steps in smooth regions ---
	let xBoundarySum = 0
	let xBoundaryCount = 0
	let xInteriorSum = 0
	let xInteriorCount = 0
	let yBoundarySum = 0
	let yBoundaryCount = 0
	let yInteriorSum = 0
	let yInteriorCount = 0

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width - 1; x++) {
			const isSmooth = smooth[y * width + x] !== 0 || smooth[y * width + x + 1] !== 0

			if (!isSmooth) {
				continue
			}

			const step = Math.abs(lum[y * width + x + 1] - lum[y * width + x])

			if (x % BLOCK_SIZE === BLOCK_SIZE - 1) {
				xBoundarySum += step
				xBoundaryCount++
			} else {
				xInteriorSum += step
				xInteriorCount++
			}
		}
	}

	for (let y = 0; y < height - 1; y++) {
		for (let x = 0; x < width; x++) {
			const isSmooth = smooth[y * width + x] !== 0 || smooth[(y + 1) * width + x] !== 0

			if (!isSmooth) {
				continue
			}

			const step = Math.abs(lum[(y + 1) * width + x] - lum[y * width + x])

			if (y % BLOCK_SIZE === BLOCK_SIZE - 1) {
				yBoundarySum += step
				yBoundaryCount++
			} else {
				yInteriorSum += step
				yInteriorCount++
			}
		}
	}

	if (
		xBoundaryCount === 0 ||
		xInteriorCount === 0 ||
		yBoundaryCount === 0 ||
		yInteriorCount === 0
	) {
		// No measurable structure (e.g. a perfectly flat image).
		return 0
	}

	const xRatio = xBoundarySum / xBoundaryCount / (xInteriorSum / xInteriorCount + 1e-9)
	const yRatio = yBoundarySum / yBoundaryCount / (yInteriorSum / yInteriorCount + 1e-9)

	return (xRatio + yRatio) / 2
}

/**
 * Detect an image with low-quality JPEG-like residual 8x8 blockiness in smooth regions.
 *
 * @param buffer The image file bytes.
 * @returns The blockiness score and a boolean classification.
 */
export async function detectBlockyJpeg(buffer: Uint8Array): Promise<JpegBlockinessResult> {
	const { data, info } = await sharp(Buffer.from(buffer))
		.raw()
		.toBuffer({ resolveWithObject: true })

	const score = computeBlockinessScore(data, info.width, info.height, info.channels)

	return {
		score,
		isTooBlocky: score >= BLOCKY_JPEG_THRESHOLD,
	}
}
