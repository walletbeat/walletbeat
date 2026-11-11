import { micromark } from 'micromark'

import { allWallets } from '@/data/wallets'
import type { AttributeGroupId } from '@/schema/attribute-tree'
import type { BaseWallet } from '@/schema/wallet'
import { renderTypographicContentToString } from '@/types/content'
import { slugifyCamelCase } from '@/types/utils/text'
import { getWalletUrl } from '@/utils/urls'

export const prerender = true

export function GET() {
	return Response.json(
		Object.values(allWallets).flatMap((wallet: BaseWallet<AttributeGroupId>) => {
			const notes = Object.values(wallet.overrides?.attributes ?? {}).flatMap(group =>
				Object.entries(group ?? {}).flatMap(([id, override]) =>
					override?.note
						? [
								{
									id: slugifyCamelCase(id),
									html: micromark(
										renderTypographicContentToString(override.note, {
											WALLET_NAME: wallet.metadata.displayName,
										}),
									),
									specificImprovement: !!override.howToImprove,
								},
							]
						: [],
				),
			)

			return notes.length ? [{ url: getWalletUrl(wallet), notes }] : []
		}),
	)
}
