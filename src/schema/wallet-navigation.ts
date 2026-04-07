import { attributeGroupById } from '@/data/attribute-groups'
import { representativeWalletForType } from '@/data/wallets'
import { mapNonExemptAttributeGroupsInTree } from '@/schema/attribute-groups'
import type { WalletType } from '@/schema/wallet-types'

/**
 * Get the attribute group IDs that should be displayed for a given wallet type.
 */
export function displayedAttributeIdsForWalletType(walletType: WalletType): string[] {
	return mapNonExemptAttributeGroupsInTree(
		attributeGroupById,
		representativeWalletForType(walletType).overall,
		(attrGroup, _evalGroup) => attrGroup.id,
	)
}
