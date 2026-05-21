/**
 * Used for annotate reference information to wallet feature data.
 *
 * It is meant to be loose in the formats it accepts, but returns
 * a consistent type regardless.
 *
 * References can be any of these formats (these are all valid):
 *
 * ```
 * {some: "object", ref: "https://example.com"}
 * {some: "object", ref: {url: "https://example.com"}}
 * {some: "object", ref: {url: "https://example.com", label: "Source code"}}
 * {some: "object", ref: ["https://example.com", "https://example2.com"]}
 * {some: "object", ref: [{url: "https://example.com"}, {url: "https://example2.com"}]}
 * {some: "object", ref: [{url: "https://example.com"}, "https://example2.com"]}
 * ```
 */

import type { CalendarDate } from '@/types/date'
import { isNonEmptyArray, type NonEmptyArray, nonEmptyGet } from '@/types/utils/non-empty'

import {
	getUrlLabel,
	isLabeledUrl,
	isUrl,
	type LabeledUrl,
	labeledUrl,
	mergeLabeledUrls,
	type Url,
} from './url'

/**
 * A loose reference which can be converted to a FullyQualifiedReference.
 */
export type LooseReference = (
	| {
			/** The URL(s) the reference is about. */
			url: NonEmptyArray<Url> | Url
	  }
	| {
			/** The repo-relative filename under public/ (New Field) */
			file: string
	  }
) & {
	/** The text of the link that goes to `url`; defaults to the domain name of `url`. */
	label?: string

	/** A human-readable string that explains what the reference is about. */
	explanation?: string

	/** The date the reference was last retrieved. */
	lastRetrieved?: CalendarDate
}

/** Type predicate for LooseReference. */
export function isLooseReference(x: unknown): x is LooseReference {
	if (x === undefined || x === null || typeof x !== 'object') {
		return false
	}

	if (
		Object.hasOwn(x, 'file') &&
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we verify the "file" field exists.
		typeof (x as { file: unknown }).file === 'string' &&
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just verified "file" is a string.
		(x as { file: string }).file.startsWith('public/')
	) {
		return true
	}

	return (
		Object.hasOwn(x, 'url') &&
		((url: unknown) =>
			isUrl(url) ||
			(Array.isArray(url) && isNonEmptyArray(url) && url.every(u => isUrl(u) || isLabeledUrl(u))))(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just checked the field exists.
			(x as unknown as { url: unknown }).url,
		)
	)
}

/**
 * A fully-qualified reference.
 */
export interface FullyQualifiedReference {
	/** The URLs and labels the reference is about. */
	urls: NonEmptyArray<LabeledUrl>

	/** A human-readable string that explains what the reference is about. */
	explanation?: string

	/** The date the reference was last retrieved. */
	lastRetrieved?: CalendarDate
}

/** Type predicate for FullyQualifiedReference. */
export function isFullyQualifiedReference(x: unknown): x is FullyQualifiedReference {
	return (
		x !== undefined &&
		x !== null &&
		typeof x === 'object' &&
		Object.hasOwn(x, 'urls') &&
		((urls: unknown) => Array.isArray(urls) && isNonEmptyArray(urls) && urls.every(isLabeledUrl))(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just checked the field exists.
			(x as unknown as { urls: unknown }).urls,
		)
	)
}

type Reference = Url | LooseReference | FullyQualifiedReference

/** Type predicate for Reference. */
function isReference(x: unknown): x is Reference {
	return isUrl(x) || isLooseReference(x) || isFullyQualifiedReference(x)
}

/** One or more references. */
export type References = Reference | NonEmptyArray<Reference>

/** An array of zero or more references. */
export type ReferenceArray = Reference[]

/** An object that *must* be annotated with References. */
export type MustRef<T> = T & { ref: References }

/** Placeholder for references that are needed but not provided. */
export const refTodo = { refTodo: true } as const

/** Placeholder for references that are not necessary. */
export const refNotNecessary = { refNotNecessary: true } as const

/** No reference provided. */
export type NoRef = typeof refTodo | typeof refNotNecessary

/** Type predicate for `NoRef`. */
export function isNoRef(obj: unknown): obj is NoRef {
	return (
		obj !== undefined &&
		obj !== null &&
		typeof obj === 'object' &&
		(Object.hasOwn(obj, 'refTodo') || Object.hasOwn(obj, 'refNotNecessary'))
	)
}

/** An object that *may or may not* be annotated with References. */
export type WithRef<T> = T & { ref: References | Reference[] | NoRef }

/** Fully qualify any number of `Reference`s in any supported type. */
export function toFullyQualified(
	reference: NoRef | References | ReferenceArray | FullyQualifiedReference[] | undefined,
): FullyQualifiedReference[] {
	if (reference === undefined || isNoRef(reference)) {
		return []
	}

	if (Array.isArray(reference)) {
		const qualified: FullyQualifiedReference[] = []

		for (const ref of reference) {
			qualified.push(...toFullyQualified(ref))
		}

		return mergeRefs(...qualified)
	}

	if (isFullyQualifiedReference(reference)) {
		return [reference]
	}

	if (typeof reference === 'string') {
		return toFullyQualified({ url: reference })
	}

	let explanation: string | undefined = undefined

	if (
		Object.hasOwn(reference, 'explanation') &&
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we verify the "explanation" field exists.
		typeof (reference as { explanation: unknown }).explanation === 'string'
	) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just verified the "explanation" field exists and is a string.
		explanation = (reference as { explanation: string }).explanation
	}

	let lastRetrieved: CalendarDate | undefined = undefined

	if (
		Object.hasOwn(reference, 'lastRetrieved') &&
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we verify the "lastRetrieved" field exists.
		typeof (reference as { lastRetrieved: unknown }).lastRetrieved === 'string'
	) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we verify the "lastRetrieved" field exists, and the only possible string type for it is CalendarDate.
		lastRetrieved = (reference as { lastRetrieved: CalendarDate }).lastRetrieved
	}

	// Handle repo-file references: files committed under public/ in the walletbeat repo.
	if (
		Object.hasOwn(reference, 'file') &&
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we verify the "file" field exists.
		typeof (reference as { file: unknown }).file === 'string'
	) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just verified the "file" field exists and is a string.
		const filePath = (reference as { file: string }).file

		if (!filePath.startsWith('public/')) {
			throw new Error(
				`File path-based references must be a repository-relative path under public/, got: "${filePath}"`,
			)
		}

		const fileUrl = `/${filePath.slice('public/'.length)}`

		const label =
			Object.hasOwn(reference, 'label') &&
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we verify the "label" field exists.
			typeof (reference as { label: unknown }).label === 'string'
				? // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just verified "label" is a string.
					(reference as { label: string }).label
				: (filePath.split('/').pop() ?? 'Document')

		return [
			{
				urls: [{ url: fileUrl, label }],
				explanation,
				lastRetrieved,
			},
		]
	}

	// At this point, the 'file' variant has been handled and returned above.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we've already handled the 'file' variant above.
	const urlRef = reference as { url: NonEmptyArray<Url> | Url } & {
		label?: string
		explanation?: string
		lastRetrieved?: CalendarDate
	}

	if (isLabeledUrl(urlRef)) {
		return [
			{
				urls: [urlRef],
				explanation,
				lastRetrieved,
			},
		]
	}

	if (isUrl(urlRef.url)) {
		return [
			{
				urls: [labeledUrl(urlRef.url, urlRef.label)],
				explanation,
				lastRetrieved,
			},
		]
	}

	if (urlRef.url.length === 1) {
		const url = nonEmptyGet(urlRef.url)

		return [
			{
				urls: [labeledUrl(url, urlRef.label)],
				explanation,
				lastRetrieved,
			},
		]
	}

	const labelCounter = new Map<string, number>()

	return urlRef.url.map(url => {
		if (isLabeledUrl(url)) {
			return {
				urls: [url],
				explanation,
				lastRetrieved,
			}
		}

		const label = getUrlLabel(url)
		const count = labelCounter.get(label) ?? 0

		labelCounter.set(label, count + 1)

		return {
			urls: [
				{
					url,
					label: `${label} ${count + 1}`,
				},
			],
			explanation,
			lastRetrieved,
		}
	})
}

/** Input type accepted by `toFullyQualified`. */
export type ReferenceInput = Parameters<typeof toFullyQualified>[0]

/** Type predicate for values that are valid reference input (not undefined/null/NoRef). */
export function isReferenceInput(x: unknown): x is ReferenceInput {
	if (x === undefined || x === null || isNoRef(x)) {
		return false
	}

	if (isReference(x)) {
		return true
	}

	if (Array.isArray(x) && x.every(isReference)) {
		return true
	}

	return false
}

/** Type predicate for `WithRef`. */
export function hasRefs(maybeWithRef: unknown): maybeWithRef is WithRef<unknown> {
	return (
		maybeWithRef !== undefined &&
		maybeWithRef !== null &&
		typeof maybeWithRef === 'object' &&
		Object.hasOwn(maybeWithRef, 'ref') &&
		((): boolean => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just checked the field exists.
			const ref = (maybeWithRef as unknown as { ref: unknown }).ref

			return isReference(ref) || isNoRef(ref) || (Array.isArray(ref) && ref.every(isReference))
		})()
	)
}

/** Extract references out of `withRef`. */
export function refs(withRef: WithRef<unknown>): FullyQualifiedReference[] {
	if (isNoRef(withRef.ref)) {
		return []
	}

	let refs = withRef.ref

	if (!Array.isArray(refs)) {
		refs = [refs]
	}

	const qualifiedRefs: FullyQualifiedReference[] = []

	for (const reference of refs) {
		for (const qualRef of toFullyQualified(reference)) {
			qualifiedRefs.push(qualRef)
		}
	}

	return mergeRefs(...qualifiedRefs)
}

/** Extract references out of `withRef` and return an object without them. */
export function popRefs<T>(withRef: WithRef<T>): {
	withoutRefs: T
	refs: FullyQualifiedReference[]
} {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we are reconstructing the object with its prior set of entries.
	const withoutRefs = Object.fromEntries(
		Object.entries(withRef).filter(([key]) => key !== 'ref'),
	) as T

	return { withoutRefs, refs: refs(withRef) }
}

/** Deduplicate and merge references in `refs`. */
export function mergeRefs(
	...refs: Array<References | ReferenceArray | FullyQualifiedReference | NoRef | undefined>
): FullyQualifiedReference[] {
	const qualifiedRefs = []

	for (const ref of refs) {
		if (ref === undefined || isNoRef(ref)) {
			continue
		}

		if (!Array.isArray(ref) && isFullyQualifiedReference(ref)) {
			qualifiedRefs.push(ref)
		} else {
			qualifiedRefs.push(...toFullyQualified(ref))
		}
	}
	const byExplanation = new Map<string, FullyQualifiedReference>()
	const mergedRefs: FullyQualifiedReference[] = []

	for (const ref of qualifiedRefs) {
		if (ref.explanation === undefined) {
			mergedRefs.push(ref)
			continue
		}

		const existing = byExplanation.get(ref.explanation)

		if (existing === undefined) {
			byExplanation.set(ref.explanation, ref)
			continue
		}

		let newUrls = existing.urls

		for (const url of ref.urls) {
			newUrls = mergeLabeledUrls(newUrls, url)
		}
		byExplanation.set(ref.explanation, {
			urls: newUrls,
			explanation: ref.explanation,
			lastRetrieved: existing.lastRetrieved ?? ref.lastRetrieved,
		})
	}
	byExplanation.forEach(ref => {
		mergedRefs.push(ref)
	})

	return mergedRefs
}
