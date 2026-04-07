declare namespace NodeJS {
	interface ProcessEnv {
		/**
		 * The URL root of the website.
		 */
		WALLETBEAT_URL_ROOT?: string

		/**
		 * Set when running in dev mode.
		 */
		WALLETBEAT_DEV?: string

		/**
		 * Set to 'true' when running as part of precommit hook.
		 * Skips some slow checks.
		 */
		WALLETBEAT_PRECOMMIT_FAST?: string
	}
}

interface ObjectConstructor {
	keys<T extends Record<PropertyKey, unknown>>(obj: T): Array<keyof T>

	values<T extends Record<PropertyKey, unknown>>(obj: T): Array<T[keyof T]>

	entries<T extends Record<PropertyKey, unknown>>(
		obj: T,
	): Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>

	fromEntries<const A extends ReadonlyArray<readonly [PropertyKey, any]>>(
		entries: A,
	): (
		A[number] extends infer E
			? E extends readonly [infer K extends PropertyKey, infer V]
				? { readonly [P in K]: V }
				: never
			: never
	) extends infer U
		? (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void
			? I
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

interface ReadonlyArray<T> {
	map<const Arr extends readonly { readonly id: PropertyKey }[]>(
		this: Arr,
		callbackfn: (
			value: Arr[number],
			index: number,
			array: Arr,
		) => readonly [Arr[number]['id'], Arr[number]],
	): readonly (Arr[number] extends infer O
		? O extends { readonly id: infer K extends PropertyKey }
			? readonly [K, O]
			: never
		: never)[]
	map<const Arr extends readonly PropertyKey[], const M extends Record<Arr[number], unknown>>(
		this: Arr & (number extends Arr['length'] ? never : unknown),
		callbackfn: (
			value: Arr[number],
			index: number,
			array: Arr,
		) => readonly [Arr[number], M[Arr[number]]],
	): readonly (Arr[number] extends infer K
		? K extends PropertyKey
			? readonly [K, M[K]]
			: never
		: never)[]
	map<const Arr extends readonly T[], U>(
		this: Arr,
		callbackfn: (value: Arr[number], index: number, array: Arr) => U,
	): number extends Arr['length'] ? U[] : { readonly [K in keyof Arr]: U }
}
