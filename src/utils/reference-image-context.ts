import type { ImageMetadata } from 'astro'
import { getContext, setContext } from 'svelte'

/** Intrinsic dimensions keyed by the page's repository image URLs. */
export type ReferenceImageDimensions = Record<string, Pick<ImageMetadata, 'width' | 'height'>>

const contextKey = Symbol('referenceImageDimensions')

/** Provide build-time dimensions to reference images within an island. */
export function setReferenceImageContext(getDimensions: () => ReferenceImageDimensions): void {
	setContext(contextKey, getDimensions)
}

/** Resolve required image geometry without fetching or measuring in the browser. */
export function getReferenceImageDimensions(): (
	url: string,
) => Pick<ImageMetadata, 'width' | 'height'> {
	const getDimensions = getContext<(() => ReferenceImageDimensions) | undefined>(contextKey)

	return url => {
		const dimensions = getDimensions?.()[url]

		if (dimensions === undefined) {
			throw new Error(`Missing reference image dimensions: ${url}`)
		}

		return dimensions
	}
}
