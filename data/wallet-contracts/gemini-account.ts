import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const geminiAccountContract: SmartWalletContract = {
	name: 'Gemini Smart Account',
	address: '0x00e58df70fab983a324c4c068c82d20407579fac',
	eip7702Delegatable: false,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		available: true,
		ref: {
			label: 'Gemini ERC-7579/4337 smart contract',
			url: 'https://www.gemini.com/blog/launching-the-gemini-wallet-a-simple-and-secure-way-to-go-onchain',
		},
	},
}
