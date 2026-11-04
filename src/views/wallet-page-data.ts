import type { AttributeTree } from '@/schema/attribute-groups'
import { attributeTree } from '@/schema/attribute-tree'
import { allWalletLadders, type WalletLadderType } from '@/schema/ladders'
import { type BaseWallet, type RatedWallet, rateWallet } from '@/schema/wallet'

/** Authored facts; the schema owns their derived evaluations and stages. */
export interface WalletPageData {
	wallet: BaseWallet<string>
	attributeGroups: string[]
	ladderTypes: WalletLadderType[]
}

export function walletPageData(
	wallet: RatedWallet<string>,
	source: BaseWallet<string>,
): WalletPageData {
	return {
		wallet: source,
		attributeGroups: Object.keys(wallet.overall),
		ladderTypes: Object.keys(allWalletLadders).filter((type): type is WalletLadderType =>
			Object.hasOwn(wallet.ladders, type),
		),
	}
}

export function walletPageAttributeTree(data: WalletPageData): AttributeTree<string> {
	const hasGroup = (id: string): id is keyof typeof attributeTree =>
		Object.hasOwn(attributeTree, id)

	return Object.fromEntries(
		data.attributeGroups.map(id => {
			if (!hasGroup(id)) {
				throw new Error(`Unknown attribute group: ${id}`)
			}

			return [id, attributeTree[id]]
		}),
	)
}

/** Evaluate the transported facts through the canonical rating pipeline. */
export function restoreWalletPageData(data: WalletPageData): RatedWallet<string> {
	return rateWallet(
		walletPageAttributeTree(data),
		Object.fromEntries(data.ladderTypes.map(type => [type, allWalletLadders[type]])),
		data.wallet,
	)
}
