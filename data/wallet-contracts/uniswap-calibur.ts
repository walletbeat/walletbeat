import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const uniswapCalibur: SmartWalletContract = {
	name: 'Calibur (Uniswap)',
	address: '0x000000005c84f8fd50b21cac312528a64437030e',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: {
			explanation:
				"Calibur is Uniswap's EIP-7702 smart-wallet delegate contract. It inherits `ERC4337Account` (implementing `validateUserOp`) and `ERC1271` (implementing `isValidSignature`) alongside `ERC7821` batching, key management, and other modules.",
			label: 'Calibur (Uniswap)',
			url: 'https://github.com/Uniswap/calibur',
		},
		available: true,
	},
}
