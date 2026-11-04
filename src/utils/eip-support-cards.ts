import {
	type EipStatusSupportCard,
	EipSupportStatus,
	ratedWalletEipSupportByStatus,
} from '@/schema/eip-support'
import type { EipNumber } from '@/schema/eips'
import type { RatedWallet } from '@/schema/wallet'
import { getWalletUrl } from '@/utils/urls'
import { compareWalletNames } from '@/utils/wallet-name'

/** Project platform-qualified status cards in wallet-name order. */
export function eipStatusSupportCards<_AttributeGroupId extends string>(
	eipNumber: EipNumber,
	wallets: Array<RatedWallet<_AttributeGroupId>>,
): EipStatusSupportCard[] {
	return wallets
		.flatMap(wallet => {
			const byStatus = ratedWalletEipSupportByStatus(wallet, eipNumber)

			return Object.values(EipSupportStatus).flatMap(status => {
				const entry = byStatus[status]

				return entry === undefined
					? []
					: [
							{
								id: wallet.metadata.id,
								displayName: wallet.metadata.displayName,
								iconExtension: wallet.metadata.iconExtension,
								url: getWalletUrl(wallet),
								status,
								variants: entry.variants,
								references: entry.references,
							},
						]
			})
		})
		.toSorted(compareWalletNames)
}
