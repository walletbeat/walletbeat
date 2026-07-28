import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'
import { allVariantsForWalletType, WalletType } from '@/schema/wallet-types'

export const erc7828: Eip = {
	friendlyName: 'Chain-specific addresses using ENS',
	formalTitle: 'Chain-specific addresses using ENS',
	// Address resolution is a software wallet feature.
	appliesTo: allVariantsForWalletType(WalletType.SOFTWARE),
	icon: 'ICON_AT_SIGN',
	number: '7828',
	prefix: EipPrefix.ERC,
	status: EipStatus.REVIEW,
	summaryMarkdown: `
		Chain-specific address format that allows specifying both an
		account and the chain on which that account intends to transact.
		Chain-specific addresses take the form of \`user@chain.eth\`.
		The target chain is resolved using a registry stored on ENS.
	`,
	whyItMattersMarkdown: `
		This address format ensures Ethereum addresses specify the chain of the
		recipient. This fits well in Ethereum's layer-2 roadmap to reduce user
		errors such as accidentally sending funds on the wrong chain, and for
		wallets to automatically bridge funds to the intended destination chain.
	`,
}
