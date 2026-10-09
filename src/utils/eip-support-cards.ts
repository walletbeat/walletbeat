import type { AttributeTree } from '@/schema/attribute-groups'
import {
	type EipStatusSupportCard,
	EipSupportStatus,
	ratedWalletEipSupportByStatus,
} from '@/schema/eip-support'
import type { EipNumber } from '@/schema/eips'
import type { RatedWallet } from '@/schema/wallet'
import { sortEipSupportCards } from '@/utils/eip-support-sort'
import { getWalletUrl } from '@/utils/urls'

/**
 * The per-status EIP support cards of `wallets`, ordered by earliest
 * evidence of support and then by the homepage order.
 */
export function eipStatusSupportCards<_AttributeGroupId extends string>(
	eipNumber: EipNumber,
	attributeTree: AttributeTree<_AttributeGroupId>,
	wallets: Array<RatedWallet<_AttributeGroupId>>,
): EipStatusSupportCard[] {
	const entries = wallets.flatMap(wallet => {
		const byStatus = ratedWalletEipSupportByStatus(wallet, eipNumber)

		return Object.values(EipSupportStatus).flatMap(status => {
			const entry = byStatus[status]

			return entry === undefined
				? []
				: [
						{
							wallet,
							card: {
								id: wallet.metadata.id,
								displayName: wallet.metadata.displayName,
								iconExtension: wallet.metadata.iconExtension,
								url: getWalletUrl(wallet),
								status,
								variants: entry.variants,
								references: entry.references,
							},
						},
					]
		})
	})

	return sortEipSupportCards(attributeTree, entries)
}
