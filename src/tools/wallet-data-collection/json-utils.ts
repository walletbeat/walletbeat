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

/** Returns whether two strings are JSON-equivalent. */
export function isSameJson(obj1: string, obj2: string): boolean {
	return JSON.stringify(JSON.parse(obj1)) === JSON.stringify(JSON.parse(obj2))
}
