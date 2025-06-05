import type { NonEmptyRecord } from '@/types/utils/non-empty'

/** A supported feature. */
export type Supported<T = object> = T & {
	support: 'SUPPORTED'
}

/** The feature is supported. */
export function supported<T = object>(supportData: T): Supported<T> {
	return {
		support: 'SUPPORTED',
		...supportData,
	}
}

/** An unsupported feature. */
export interface NotSupported {
	support: 'NOT_SUPPORTED'
}

/** The feature is unsupported. */
export const notSupported: NotSupported = { support: 'NOT_SUPPORTED' } as const

/** The feature is supported. */
export const featureSupported: Supported = { support: 'SUPPORTED' } as const

/** A feature that may or may not be supported. */
export type Support<T = object> = NotSupported | Supported<T>

/** Type predicate for `Supported<T>` */
export function isSupported<T>(support: Support<T>): support is Supported<T> {
	return support.support === 'SUPPORTED'
}

/**
 * A non-empty record where at least one member must be supported.
 */
export type AtLeastOneSupported<K extends string, T = object> = NonEmptyRecord<K, Support<T>> &
	{
		[V in K]: Record<V, Supported<T>> & Partial<Record<Exclude<K, V>, Support<T>>>
	}[K]
