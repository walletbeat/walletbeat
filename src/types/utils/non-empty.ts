import { remap } from './remap'

/**
 * A Partial<Record<K, V>> that is guaranteed to have at least one element.
 */
export type NonEmptyRecord<K extends string | number | symbol, V> = {
	[P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, V>>
}[K]

/**
 * An array that is guaranteed to have at least one element.
 */
export type NonEmptyArray<T> = T[] & ([T, ...T[]] | [...T[], T])

/** Type predicate for NonEmptyArray. */
export function isNonEmptyArray<T>(arr: T[]): arr is NonEmptyArray<T> {
	return arr.length > 0
}

/** Throws error if the given array is empty. */
export function assertNonEmptyArray<T>(arr: T[]): NonEmptyArray<T> {
	if (!isNonEmptyArray(arr)) {
		throw new Error('Got an empty array when we expected at least one entry.')
	}

	return arr
}

/**
 * Like Object.keys but guarantees at least one key.
 * @param rec The record to get the keys from.
 * @returns A non-empty array of keys.
 */
export function nonEmptyKeys<
	K extends string | number | symbol,
	V,
	R extends NonEmptyRecord<K, V> = NonEmptyRecord<K, V>,
>(rec: R): NonEmptyArray<keyof R> {
	return Object.keys(rec) as NonEmptyArray<keyof R> // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the input record was non-empty.
}

/**
 * Returns the set of keys of the given record.
 */
export function nonEmptyKeySet<K extends string | number | symbol>(
	rec: NonEmptyRecord<K, unknown>,
): NonEmptySet<K> {
	return nonEmptySetFromArray(nonEmptyKeys(rec))
}

/**
 * Like Object.values but guarantees at least one value.
 * @param rec The record to get the values from.
 * @returns A non-empty array of values.
 */
export function nonEmptyValues<K extends string | number | symbol, V>(
	rec: NonEmptyRecord<K, V>,
): NonEmptyArray<V> {
	return Object.values(rec) as NonEmptyArray<V> // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the input record was non-empty.
}

/**
 * Like Object.entries but guarantees at least one entry.
 * @param rec The record to get the entries from.
 * @returns A non-empty array of entries.
 */
export function nonEmptyEntries<
	K extends string | number | symbol,
	V,
	R extends NonEmptyRecord<K, V> = NonEmptyRecord<K, V>,
>(rec: R): NonEmptyArray<[keyof R, V]> {
	return Object.entries(rec) as NonEmptyArray<[keyof R, V]> // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the input record was non-empty.
}

/**
 * Like Array.map but guarantees at least one element.
 * @param arr The array to map over.
 * @param fn A mapping function that is guaranteed to be called at least once.
 */
export function nonEmptyMap<T, R>(
	arr: NonEmptyArray<T>,
	fn: (val: T, index: number) => R,
): NonEmptyArray<R> {
	return arr.map(fn) as NonEmptyArray<R> // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the input array was non-empty.
}

/**
 * Apply a map function to each element of a NonEmptyRecord.
 * @param rec The non-empty record to apply `map` to.
 * @param map The map function.
 * @returns A non-empty record with the same keys as `rec` and mapped values.
 */
export function nonEmptyRemap<K extends string | number | symbol, V1, V2>(
	rec: NonEmptyRecord<K, V1>,
	map: (k: K, v: V1) => V2,
): NonEmptyRecord<K, V2> {
	return remap(rec, map)
}

/**
 * Filter an array, asserting that it is non-empty even after filtering.
 * Will throw an error if this is not true.
 */
export function nonEmptyFilter<T>(
	arr: NonEmptyArray<T>,
	fn: (val: T, index: number) => boolean,
): NonEmptyArray<T> {
	const filtered = arr.filter(fn)

	if (!isNonEmptyArray(filtered)) {
		throw new Error('Non-empty array was unexpectedly filtered down to an empty array')
	}

	return filtered
}

/**
 * Get an element of the array. Guaranteed to be defined since the array is
 * non-empty.
 * @param arr The array from which to get the element.
 * @returns An element of the array.
 */
export function nonEmptyGet<T>(arr: NonEmptyArray<T>): T {
	return arr[0]
}

/** Return a sorted copy of the array. */
export function nonEmptySorted<T>(
	arr: NonEmptyArray<T>,
	compare: (a: T, b: T) => number,
	reverse?: boolean,
): NonEmptyArray<T> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the input array was non-empty.
	const arrCopy = [...arr] as NonEmptyArray<T>

	arrCopy.sort(reverse === true ? (a, b) => compare(b, a) : compare)

	return arrCopy
}

/**
 * Get the first element of the array as sorted by the given comparison
 * function. Does not modify the original array.
 * @param arr The array from which to get the element.
 * @param compare The comparison function.
 * @param reverse Whether to sort in descending order.
 * @returns The first element of the array if it was sorted.
 */
export function nonEmptyFirst<T>(
	arr: NonEmptyArray<T>,
	compare: (a: T, b: T) => number,
	reverse?: boolean,
): T {
	return nonEmptySorted(arr, compare)[reverse === true ? arr.length - 1 : 0]
}

/**
 * Concatenate a non-empty array and an array together.
 */
export function nonEmptyConcat<T>([arr, rest]:
	| [T[], NonEmptyArray<T>]
	| [NonEmptyArray<T>, T[]]): NonEmptyArray<T> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know one of the two input arrays was non-empty.
	return arr.concat(...rest) as NonEmptyArray<T>
}

/**
 * Flatten a non-empty array of non-empty arrays into a flat non-empty array.
 */
export function nonEmptyFlatten<T>(arr: NonEmptyArray<NonEmptyArray<T>>): NonEmptyArray<T> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the input arrays were non-empty.
	return arr.flat() as NonEmptyArray<T>
}

/**
 * Deduplicate a non-empty array.
 * Use the provided `eqFn` as equality function if provided, otherwise use `===`.
 */
export function nonEmptyDedup<T>(
	arr: NonEmptyArray<T>,
	eqFn?: (v1: T, v2: T) => boolean,
): NonEmptyArray<T> {
	const result: NonEmptyArray<T> = [arr[0]]
	const eq = eqFn === undefined ? (v1: T, v2: T) => v1 === v2 : eqFn

	for (const item of arr) {
		if (!result.some(v => eq(v, item))) {
			result.push(item)
		}
	}

	return result
}

/**
 * A set that contains at least one true element.
 */
export type NonEmptySet<K extends string | number | symbol> = NonEmptyRecord<K, true>

/**
 * Type predicate for NonEmptySet.
 */
export function isNonEmptySet<K extends string | number | symbol>(
	obj: Partial<Record<K, unknown>>,
): obj is NonEmptySet<K> {
	if (Object.keys(obj).length === 0) {
		return false
	}

	let oneTrue = false

	for (const val of Object.values(obj)) {
		if (typeof val !== 'boolean') {
			return false
		}

		oneTrue ||= val
	}

	return oneTrue
}

/**
 * Initialize a non-empty set from at least one key.
 */
export function nonEmptySet<K extends string | number | symbol>(
	key: K,
	...keys: K[]
): NonEmptySet<K> {
	return nonEmptySetFromArray([key, ...keys])
}

/**
 * Initialize a non-empty set from a non-empty array of keys.
 */
export function nonEmptySetFromArray<K extends string | number | symbol>(
	keys: NonEmptyArray<K>,
): NonEmptySet<K> {
	return Object.fromEntries(nonEmptyMap<K, [K, true]>(keys, key => [key, true])) as NonEmptySet<K>
}

/**
 * Returns whether `set` contains `key` with a `true` value.
 */
export function setContains<K extends string | number | symbol>(
	set: NonEmptySet<K>,
	key: K,
): boolean {
	return Object.hasOwn(set, key) && set[key]
}

/**
 * Iterates over the items in the set. Guaranteed to be non-empty.
 */
export function setItems<K extends string | number | symbol>(
	set: NonEmptySet<K>,
): NonEmptyArray<K> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know the input set was non-empty and contained at least one true value.
	return Object.entries(set)
		.filter(([_, v]): boolean => v as boolean)
		.map(([k, _]) => k) as NonEmptyArray<K>
}

/**
 * Returns the union of one or more non-empty sets.
 */
export function setUnion<K extends string | number | symbol>(
	sets: NonEmptyArray<NonEmptySet<K>>,
): NonEmptySet<K> {
	const union = new Map<K, true>()

	for (const set of sets) {
		for (const item of setItems(set)) {
			union.set(item, true)
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we had at least one set as input and each set was non-empty.
	return Object.fromEntries(union.entries()) as NonEmptySet<K>
}
