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

	fromEntries<K extends PropertyKey, V>(entries: ReadonlyArray<readonly [K, V]>): Record<K, V>
}

interface Array<T> {
	filter<S extends Exclude<T, undefined>>(
		predicate: (value: T, index: number, array: T[]) => value is S,
		thisArg?: unknown,
	): S[]
}
