/**
 * Type-safe Object.entries that preserves key types as a union of tuples.
 * @param obj The object to get entries from
 * @returns Array of [key, value] tuples with precise typing
 */
export const objectEntries = <T extends Record<string, unknown>>(obj: T) => (
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the keys and values match the object structure
	Object.entries(obj) as Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>
)

/**
 * Type-safe Object.keys that preserves key types.
 * @param obj The object to get keys from
 * @returns Array of keys with proper typing
 */
export const objectKeys = <T extends Record<string, unknown>>(obj: T) => (
	Object.keys(obj) as Array<keyof T>
)

/**
 * Type-safe Object.values that preserves value types.
 * @param obj The object to get values from
 * @returns Array of values with proper typing
 */
export const objectValues = <T extends Record<string, unknown>>(obj: T) => (
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the values match the object structure
	Object.values(obj) as Array<T[keyof T]>
)
