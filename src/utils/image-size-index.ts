import { getContext, setContext } from 'svelte'

/** Pixel dimensions of an image file. */
export interface ImageSize {
	width: number
	height: number
}

/**
 * Dimensions of repo-hosted images, keyed by the root-relative URL that
 * references use for them.
 *
 * Pages build the subset they render with image-size-store.ts (build time
 * only) and hand it to their island, which provides it to `ReferenceLinks`
 * via `setImageSizeContext`.
 */
export type ImageSizeIndex = Record<string, ImageSize>

const imageSizeContextKey = Symbol('imageSizes')

/**
 * Provide the image dimensions an island renders to its descendant
 * components. Call during component initialization in the island's root
 * component.
 */
export function setImageSizeContext(getIndex: () => ImageSizeIndex): void {
	setContext(imageSizeContextKey, getIndex)
}

/**
 * Get a lookup resolving image URLs to the dimensions provided by the nearest
 * `setImageSizeContext` ancestor. URLs resolve to undefined when no ancestor
 * provides them. Call during component initialization.
 */
export function getImageSizeLookup(): (url: string) => ImageSize | undefined {
	const getIndex = getContext<(() => ImageSizeIndex) | undefined>(imageSizeContextKey)

	return url => getIndex?.()[url]
}
