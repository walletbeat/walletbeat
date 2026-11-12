export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function expectRecord(v: unknown, at: string): Record<string, unknown> {
	if (!isRecord(v)) {
		throw new Error(`Expected object at ${at}`)
	}

	return v
}

export function expectString(v: unknown, at: string): string {
	if (typeof v !== 'string') {
		throw new Error(`Expected string at ${at}`)
	}

	return v
}

export function expectOptionalString(v: unknown, at: string): string | undefined {
	if (v === undefined) {
		return undefined
	}

	return expectString(v, at)
}

export function expectNumber(v: unknown, at: string): number {
	if (typeof v !== 'number' || Number.isNaN(v)) {
		throw new Error(`Expected number at ${at}`)
	}

	return v
}

export function expectArray(v: unknown, at: string): unknown[] {
	if (!Array.isArray(v)) {
		throw new Error(`Expected array at ${at}`)
	}

	return v
}

export function expectBoolean(v: unknown, at: string): boolean {
	if (typeof v !== 'boolean') {
		throw new Error(`Expected boolean at ${at}, got ${typeof v}`)
	}

	return v
}

/** Returns whether two strings are JSON-equivalent (order-independent). */
export function isSameJson(obj1: string, obj2: string): boolean {
	return stableJSONStringify(JSON.parse(obj1)) === stableJSONStringify(JSON.parse(obj2))
}

export function stableJSONStringify(v: unknown): string {
	if (v === null || typeof v !== 'object') {
		return JSON.stringify(v)
	}

	if (Array.isArray(v)) {
		const items = v.map(item => stableJSONStringify(item)).sort()

		return `[${items.join(',')}]`
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we checked it was an object and not an array.
	const obj = v as Record<string, unknown>
	const keys = Object.keys(obj).sort()

	return `{${keys.map(k => `${JSON.stringify(k)}:${stableJSONStringify(obj[k])}`).join(',')}}`
}
