import chalk from 'chalk'

export interface ChalkLike {
	(text: string): string
	bold: ChalkLike
	gray: ChalkLike
	green: ChalkLike
	yellow: ChalkLike
	blue: ChalkLike
	cyan: ChalkLike
	whiteBright: ChalkLike
	yellowBright: ChalkLike
	bgRed: ChalkLike
	bgBlue: ChalkLike
}

// ---------------------------------------------------------------------------
// Noop chalk — passes strings through unchanged; every style property returns
// itself so chaining works.
// ---------------------------------------------------------------------------

function buildNoop(): ChalkLike {
	const fn = (text: string): string => text

	// eslint-disable-next-line prefer-const, @typescript-eslint/no-unsafe-type-assertion
	let result = fn as ChalkLike // prettier-ignore

	for (const prop of [
		'bold',
		'gray',
		'green',
		'yellow',
		'blue',
		'cyan',
		'whiteBright',
		'yellowBright',
		'bgRed',
		'bgBlue',
	]) {
		Object.defineProperty(fn, prop, {
			get(): ChalkLike {
				return result
			},
			enumerable: true,
			configurable: true,
		})
	}

	return result
}

export const noopChalk: ChalkLike = buildNoop()

// ---------------------------------------------------------------------------
// Real chalk — chalk v5's default export is already a ChalkLike-compatible
// callable with style properties.
// ---------------------------------------------------------------------------

const RealChalk: ChalkLike = chalk

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return a `ChalkLike` instance.
 *
 * When `enabled` is `true` (human or CI), returns the real `chalk` instance
 * that emits ANSI color/style escape codes.
 *
 * When `enabled` is `false` (agent), returns a no-op instance that passes
 * strings through unchanged, keeping agent output clean and parseable.
 */
export function getChalk(enabled: boolean): ChalkLike {
	return enabled ? RealChalk : noopChalk
}
