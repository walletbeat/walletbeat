import { representativeWalletForType } from '@/data/wallets'
import { mapNonExemptAttributeGroupsInTree } from '@/schema/attribute-groups'
import { attributeTree } from '@/schema/attribute-tree'
import type { WalletType } from '@/schema/wallet-types'

/**
 * Get the attribute group IDs that should be displayed for a given wallet type.
 */
export function displayedAttributeIdsForWalletType(walletType: WalletType): string[] {
	return mapNonExemptAttributeGroupsInTree(
		attributeTree,
		representativeWalletForType(walletType).overall,
		(attrGroup, _evalGroup) => attrGroup.id,
	)
}
