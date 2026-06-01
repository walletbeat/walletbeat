interface ObjectConstructor {
	keys<T extends Record<PropertyKey, unknown>>(obj: T): Array<keyof T>

	values<T extends Record<PropertyKey, unknown>>(obj: T): Array<T[keyof T]>

	entries<T extends Record<PropertyKey, unknown>>(
		obj: T,
	): Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>

	fromEntries<const Entries extends ReadonlyArray<readonly [PropertyKey, unknown]>>(
		entries: Entries,
	): (
		Entries[number] extends infer Entry
			? Entry extends readonly [infer Key extends PropertyKey, infer Value]
				? { readonly [_Key in Key]: Value }
				: never
			: never
	) extends infer Result
		? (Result extends unknown ? (result: Result) => void : never) extends (
				result: infer InferredResult,
			) => void
			? InferredResult
			: never
		: never

	fromEntries<K extends PropertyKey, V>(entries: ReadonlyArray<readonly [K, V]>): Record<K, V>
}

interface Array<T> {
	filter<S extends Exclude<T, undefined>>(
		predicate: (value: T, index: number, array: T[]) => value is S,
		thisArg?: unknown,
	): S[]
}

/** Preserve types of tuples returned from `Array#map` calls. */
interface ReadonlyArray<T> {
	map<const Array extends readonly { readonly id: PropertyKey }[]>(
		this: Array,
		callbackfn: (
			value: Array[number],
			index: number,
			array: Array,
		) => readonly [Array[number]['id'], Array[number]],
	): readonly (Array[number] extends infer Item
		? Item extends { readonly id: infer ItemId extends PropertyKey }
			? readonly [ItemId, Item]
			: never
		: never)[]
	map<
		const Array extends readonly PropertyKey[],
		const EntryMap extends Record<Array[number], unknown>,
	>(
		this: Array & (number extends Array['length'] ? never : unknown),
		callbackfn: (
			value: Array[number],
			index: number,
			array: Array,
		) => readonly [Array[number], EntryMap[Array[number]]],
	): readonly (Array[number] extends infer EntryKey
		? EntryKey extends PropertyKey
			? readonly [EntryKey, EntryMap[EntryKey]]
			: never
		: never)[]
	map<const Array extends readonly T[], U>(
		this: Array,
		callbackfn: (value: Array[number], index: number, array: Array) => U,
	): number extends Array['length'] ? U[] : { readonly [K in keyof Array]: U }
}
