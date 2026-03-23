import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const rainbowCaliburContract: SmartWalletContract = {
	name: 'Rainbow Calibur',
	address: '0x612373d7003d694220f7800eeaf8e3924c0951d3',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: { label: 'RainbowCalibur', url: 'https://github.com/uniswap/calibur' },
		available: true,
	},
}
