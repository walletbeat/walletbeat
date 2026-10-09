import type { NonEmptyRecord } from '@/types/utils/non-empty'

import { refNotNecessary, type WithRef } from '../reference'

/** A supported feature. */
export type Supported<T extends object = object> = T & {
	support: 'SUPPORTED'
}

/** The fields of each supported variant of `S`, without the `support` field. */
type SupportedFields<S> = S extends Supported ? Omit<S, 'support'> : never

/**
 * The data that `supported(...)` takes for a feature of type `T`.
 * When `T` is a `Support<...>` type, this is the payload of its supported
 * variants; otherwise `T` is the payload itself.
 */
type SupportedData<T> = [Extract<T, Supported>] extends [never]
	? Extract<T, object>
	: SupportedFields<Extract<T, Supported>>

/**
 * The feature is supported.
 * The type of `supportData` comes from where the result is used rather than
 * from `supportData` itself, so that fields unknown to the schema are flagged.
 */
export function supported<T = object>(
	supportData: NoInfer<SupportedData<T>>,
): Supported<SupportedData<T>> {
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

/** The feature is supported without reference necessary. */
export const featureSupportedNoRef: WithRef<Supported> = {
	support: 'SUPPORTED',
	ref: refNotNecessary,
} as const

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

/** Type predicate for Support<object>. */
export function isMaybeSupported(x: unknown): x is Support<object> {
	if (typeof x !== 'object' || x === undefined || x === null || !Object.hasOwn(x, 'support')) {
		return false
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We checked the property exists.
	const maybeSupport = (x as { support: unknown }).support

	return (
		typeof maybeSupport === 'string' &&
		(maybeSupport === notSupported.support || maybeSupport === featureSupported.support)
	)
}

/** Type predicate for `Supported<T>` */
export function isSupported<T extends object>(support: Support<T>): support is Supported<T> {
	return support.support === 'SUPPORTED'
}

/** Type predicate for `NotSupported`. */
export function isNotSupported<T extends object = object>(x: Support<T>): x is NotSupported {
	return Object.hasOwn(x, 'support') && x.support === 'NOT_SUPPORTED'
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
