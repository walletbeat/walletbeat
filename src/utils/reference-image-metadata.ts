import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

import { imageMetadata } from 'astro/assets/utils'

import type { FullyQualifiedReference } from '@/schema/reference'
import { isRepoImageUrl } from '@/schema/url'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'
import type { ReferenceImageDimensions } from '@/utils/reference-image-context'

/** Read only the referenced local assets at build time, using Astro's image reader. */
export async function referenceImageDimensions(
	references: FullyQualifiedReference[],
): Promise<ReferenceImageDimensions> {
	const publicRoot = resolve(getAstroBuildTimeRepositoryRoot(), 'public')
	const dimensions: ReferenceImageDimensions = {}
	const urls = new Set(
		references.flatMap(ref => ref.urls.map(({ url }) => url)).filter(isRepoImageUrl),
	)

	for (const url of urls) {
		const path = resolve(publicRoot, `.${decodeURIComponent(url.split(/[?#]/)[0])}`)

		if (!path.startsWith(`${publicRoot}${sep}`)) {
			throw new Error(`Reference image is outside public/: ${url}`)
		}

		const { width, height } = await imageMetadata(await readFile(path), url)

		dimensions[url] = { width, height }
	}

	return dimensions
}
