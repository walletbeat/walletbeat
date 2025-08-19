import type { NonEmptyRecord } from '@/types/utils/non-empty'

import type { WithRef } from '../reference'

/** A supported feature. */
export type Supported<T extends object = object> = T & {
	support: 'SUPPORTED'
}

/** The feature is supported. */
export function supported<T extends object = object>(supportData: T): Supported<T> {
	if (Object.hasOwn(supportData, 'support')) {
		throw new Error(
			'Do not include a `support` field in the object passed to `supported(...)`; that field is implicitly added.',
		)
	}

	if (Object.keys(supportData).length === 0) {
		throw new Error(
			'Please use the `featureSupported` helper rather than `supported({})` for simple features that are/are not supported',
		)
	}

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

/** The feature is unsupported but still carries additional data. */
export function notSupportedWith<T = object>(obj: T): NotSupported & T {
	return { ...obj, ...notSupported }
}

/** The feature is unsupported but carries reference data. */
export function notSupportedWithRef(withRef: WithRef<unknown>): WithRef<NotSupported> {
	return { ref: withRef.ref, ...notSupported }
}

/** A feature that may or may not be supported. */
export type Support<T extends object = object> = NotSupported | Supported<T>

/** Type predicate for `Supported<T>` */
export function isSupported<T extends object>(support: Support<T>): support is Supported<T> {
	return support.support === 'SUPPORTED'
}

/**
 * A non-empty record where at least one member must be supported.
 */
export type AtLeastOneSupported<K extends string, T extends object = object> = NonEmptyRecord<
	K,
	Support<T>
> &
	{
		[V in K]: Record<V, Supported<T>> & Partial<Record<Exclude<K, V>, Support<T>>>
	}[K]
