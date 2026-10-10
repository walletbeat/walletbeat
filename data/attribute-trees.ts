import type { AttributeTree } from '@/schema/attribute-groups'
import { AttributeGroupId, attributeTreeForIds } from '@/schema/attribute-tree'

/*
 * The attribute groups rated for each wallet type.
 *
 * These live apart from the wallet lists (`software-wallets.ts` etc.) so that
 * code which only needs a tree, such as rating a single wallet in the browser,
 * does not load every wallet's data.
 */

const softwareWalletAttributeGroupIds = [
	AttributeGroupId.Security,
	AttributeGroupId.Privacy,
	AttributeGroupId.SelfSovereignty,
	AttributeGroupId.Transparency,
	AttributeGroupId.Ecosystem,
] as const

export type SoftwareAttributeGroupId = (typeof softwareWalletAttributeGroupIds)[number]

export const softwareWalletAttributeTree = attributeTreeForIds(
	softwareWalletAttributeGroupIds,
) satisfies AttributeTree<SoftwareAttributeGroupId>

const hardwareWalletAttributeGroupIds = [
	AttributeGroupId.Security,
	AttributeGroupId.Privacy,
	AttributeGroupId.SelfSovereignty,
	AttributeGroupId.Transparency,
	AttributeGroupId.Ecosystem,
	AttributeGroupId.Maintenance,
] as const

export type HardwareAttributeGroupId = (typeof hardwareWalletAttributeGroupIds)[number]

export const hardwareWalletAttributeTree = attributeTreeForIds(
	hardwareWalletAttributeGroupIds,
) satisfies AttributeTree<HardwareAttributeGroupId>

const embeddedWalletAttributeGroupIds = [
	AttributeGroupId.Security,
	AttributeGroupId.Privacy,
	AttributeGroupId.SelfSovereignty,
	AttributeGroupId.Transparency,
	AttributeGroupId.Ecosystem,
	AttributeGroupId.Maintenance,
] as const

export type EmbeddedAttributeGroupId = (typeof embeddedWalletAttributeGroupIds)[number]

export const embeddedWalletAttributeTree = attributeTreeForIds(
	embeddedWalletAttributeGroupIds,
) satisfies AttributeTree<EmbeddedAttributeGroupId>
