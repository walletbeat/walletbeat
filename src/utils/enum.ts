import {
	assertNonEmptyArray,
	type NonEmptyArray,
	type NonEmptyRecord,
	type NonEmptySet,
	nonEmptySetFromArray,
	setContains,
	setItems,
	setUnion,
} from '@/types/utils/non-empty'

/**
 * Helper class for enums.
 */
export class Enum<E extends string> {
	/** A complete list of enum values. */
	public readonly items: NonEmptyArray<E>

	/** A complete set of enum values. */
	public readonly set: NonEmptySet<E>

	constructor(record: Record<E, true>) {
		this.items = assertNonEmptyArray<E>(Object.keys(record))
		this.set = nonEmptySetFromArray<E>(this.items)
	}

	/**
	 * @returns Whether the given object is an enum value.
	 */
	public is(obj: unknown): obj is E {
		if (typeof obj !== 'string') {
			return false
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because this is exactly what we are trying to establish
		return setContains(this.set, obj as E)
	}

	/**
	 * @returns `obj` typecasted to `E`, or throws an error if `obj` is not an enum member.
	 */
	public assert(obj: unknown): E {
		if (!this.is(obj)) {
			throw new Error(`Attempted to typecast object of type ${typeof obj} to enum`)
		}

		return obj
	}

	/** Reorder an array of enums using the canonical enum order. */
	public reorder(arr: E[]): E[] {
		return Array.from(this.items.filter(e => arr.includes(e)))
	}

	/** Reorder a non-empty array of enums using the canonical enum order. */
	public reorderNonEmpty(arr: NonEmptyArray<E>): NonEmptyArray<E> {
		return assertNonEmptyArray(this.reorder(arr))
	}

	/**
	 *
	 * @returns The set of keys in the given `rec`, preserving type information.
	 */
	public recordKeys(rec: Partial<Record<E, unknown>>): E[] {
		return this.reorder(Object.keys(rec))
	}

	/**
	 * Filter a Record<E, whatever> with a given predicate, preserving type information.
	 */
	public filterRecord<T>(
		rec: Partial<Record<E, T>>,
		predicate: (e: E, t: T) => boolean,
	): Partial<Record<E, T>> {
		return this.reorderPartialRecord(
			Object.fromEntries(
				Object.entries(rec).filter((entry): entry is [E, T] =>
					entry?.[1] === undefined ? false : predicate(this.assert(entry[0]), entry[1]),
				),
			) as Partial<Record<E, T>>,
		)
	}

	/**
	 * @returns A non-Partial Record<E, T> containing the non-undefined entries of `rec`, and `defaultValue` for all other keys.
	 */
	public fullRecord<T>(rec: Partial<Record<E, T>>, defaultValue: T): Record<E, T> {
		return Object.fromEntries(this.items.map(e => [e, rec[e] ?? defaultValue]))
	}

	/** Reorder a non-empty array of enums using the canonical enum order. */
	public reorderRecord<T>(rec: Record<E, T>): Record<E, T> {
		return Object.fromEntries(this.items.map(e => [e, rec[e]]))
	}

	/** Reorder a non-empty array of enums using the canonical enum order. */
	public reorderNonEmptyRecord<T>(rec: NonEmptyRecord<E, T>): NonEmptyRecord<E, T> {
		return Object.fromEntries(this.items.filter(e => Object.hasOwn(rec, e)).map(e => [e, rec[e]]))
	}

	/** Reorder a non-empty array of enums using the canonical enum order. */
	public reorderPartialRecord<T>(rec: Partial<Record<E, T>>): Partial<Record<E, T>> {
		return Object.fromEntries(this.items.filter(e => Object.hasOwn(rec, e)).map(e => [e, rec[e]]))
	}
}

/**
 * Merge two enum classes together into a larger enum class.
 */
export function mergeEnums<E1 extends string, E2 extends string>(
	e1: Enum<E1>,
	e2: Enum<E2>,
): Enum<E1 | E2> {
	const mergedSet = setUnion<E1 | E2>([
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because E1|E2 is a superset of E1.
		e1.set as NonEmptySet<E1 | E2>,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because E1|E2 is a superset of E2.
		e2.set as NonEmptySet<E1 | E2>,
	])
	const mergedRecord = Object.fromEntries(setItems(mergedSet).map(e => [e, true as const]))

	return new Enum<E1 | E2>(mergedRecord)
}
