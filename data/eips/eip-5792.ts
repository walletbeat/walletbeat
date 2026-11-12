import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'
import { allVariantsForWalletType, WalletType } from '@/schema/wallet-types'

export const eip5792: Eip = {
	friendlyName: 'Wallet Call API',
	formalTitle: 'Wallet Call API',
	// The wallet call API is a software wallet feature.
	appliesTo: allVariantsForWalletType(WalletType.SOFTWARE),
	// "Move to Final" commit: https://github.com/ethereum/EIPs/commit/644778e485f0c637ed88cd607c0eda048e50d4f6
	finalizedDate: '2025-05-11',
	icon: 'ICON_LAYERS',
	number: '5792',
	prefix: EipPrefix.EIP,
	status: EipStatus.FINAL,
	summaryMarkdown: `
		JSON-RPC methods for sending multiple calls from the user's wallet, and checking their status.
	`,
	whyItMattersMarkdown: `
		EIP-5792 defines a standard way for apps to request wallets to bundle multiple operations into
		a single onchain transaction. This allows for better user experience for many DeFi applications.
		For example, this allows token approval transactions to be bundled together with the transaction
		that spends those tokens, all signed and executed as a single operation by the user.
	`,
}
