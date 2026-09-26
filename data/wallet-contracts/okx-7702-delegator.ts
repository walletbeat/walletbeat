import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const okx7702DelegatorContract: SmartWalletContract = {
	name: 'OKX EIP-7702 Delegator',
	address: '0xe40ccb2d94975c51bff0c004efdfd9b3a5796fa4',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: {
			explanation:
				"OKX Wallet's EIP-7702 delegate contract. Its source code is verified on the OKX explorer (not on Etherscan).",
			label: 'OKX EIP-7702 Delegator verified source on OKX explorer',
			url: 'https://web3.okx.com/explorer/ethereum/address/0xe40ccb2d94975c51bff0c004efdfd9b3a5796fa4/contract',
		},
		available: true,
	},
}
