import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'
import { WalletType } from '@/schema/wallet-types'
import { nonEmptySet } from '@/types/utils/non-empty'

export const erc7831: Eip = {
	friendlyName: 'Multi-chain addresses',
	formalTitle: 'Multi-Chain Addressing',
	// Address resolution is a software wallet feature.
	appliesTo: nonEmptySet(WalletType.SOFTWARE),
	icon: 'ICON_GLOBE',
	number: '7831',
	prefix: EipPrefix.ERC,
	status: EipStatus.DRAFT,
	summaryMarkdown: `
		Chain-specific address format that allows specifying both an
		account and the chain on which that account intends to transact.
		Chain-specific addresses take the form of \`user.eth:l2chain\`.
		The target chain is resolved using a registry stored on ENS.
	`,
	whyItMattersMarkdown: `
		This address format ensures Ethereum addresses specify the chain of the
		recipient. This fits well in Ethereum's layer-2 roadmap to reduce user
		errors such as accidentally sending funds on the wrong chain, and for
		wallets to automatically bridge funds to the intended destination chain.
	`,
}
