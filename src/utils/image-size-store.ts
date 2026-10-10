import { existsSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'

import type { AttributeGroupId } from '@/schema/attribute-tree'
import { collectWalletRefs, type FullyQualifiedReference } from '@/schema/reference'
import { isRepoImageUrl } from '@/schema/url'
import type { BaseWallet } from '@/schema/wallet'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'
import type { ImageSize, ImageSizeIndex } from '@/utils/image-size-index'

/**
 * Read the displayed dimensions of the `public/` file a repo image URL points
 * to, or undefined if there is no such file. Build time only.
 */
async function repoImageSize(url: string): Promise<ImageSize | undefined> {
	const filePath = join(
		getAstroBuildTimeRepositoryRoot(),
		'public',
		decodeURI(url.split(/[?#]/)[0]),
	)

	if (!existsSync(filePath)) {
		return undefined
	}

	const { autoOrient } = await sharp(filePath).metadata()

	return { width: autoOrient.width, height: autoOrient.height }
}

/** The dimensions of every repo-hosted image among `references`. Build time only. */
export async function imageSizesForReferences(
	references: FullyQualifiedReference[],
): Promise<ImageSizeIndex> {
	const urls = new Set(
		references
			.flatMap(reference => reference.urls.map(({ url }) => url))
			.filter(url => isRepoImageUrl(url)),
	)

	const index: ImageSizeIndex = {}

	for (const url of urls) {
		const size = await repoImageSize(url)

		if (size !== undefined) {
			index[url] = size
		}
	}

	return index
}

/** The dimensions of every repo-hosted image in a wallet's data refs. Build time only. */
export async function imageSizesForWallet(
	walletName: string,
	wallet: BaseWallet<AttributeGroupId>,
): Promise<ImageSizeIndex> {
	return await imageSizesForReferences(
		collectWalletRefs(walletName, wallet).flatMap(collected => collected.fullyQualifiedRefs),
	)
}
