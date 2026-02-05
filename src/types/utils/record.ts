/**
 * Type guard to check if a value is a plain object (Record).
 * @param value - The value to check
 * @returns True if the value is a non-null, non-array object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
