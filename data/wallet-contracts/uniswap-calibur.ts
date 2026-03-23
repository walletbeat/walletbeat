import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const uniswapCaliburContract: SmartWalletContract = {
	name: 'Calibur',
	address: '0x000000009b1d0af20d8c6d0a44e162d11f9b8f00',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: { label: 'Calibur', url: 'https://github.com/uniswap/calibur' },
		available: true,
	},
}
