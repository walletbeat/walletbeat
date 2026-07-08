import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

// Address verified onchain: live EOAs carry the EIP-7702 delegation
// indicator `0xef0100` followed by this address, and the deployed code exposes
// the isValidSignature (0x1626ba7e) and validateUserOp (0x19822f7c) selectors.
export const rainbowCaliburContract: SmartWalletContract = {
	name: 'Rainbow Calibur',
	address: '0x612373d7003d694220f7800eeaf8e3924c0951d3',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: {
			explanation:
				"Rainbow delegates EOAs to its deployment of Calibur, Uniswap's open-source EIP-7702 smart-wallet delegate contract.",
			label: 'Calibur (Uniswap)',
			url: 'https://github.com/Uniswap/calibur',
		},
		available: true,
	},
}
