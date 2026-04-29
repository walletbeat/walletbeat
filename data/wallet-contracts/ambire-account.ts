import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const ambireAccountContract: SmartWalletContract = {
	name: 'Ambire Smart Account',
	address: '0x0f2aa7bcda3d9d210df69a394b6965cb2566c828',
	eip7702Delegatable: false,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: {
			label: 'Ambire ERC-4337 smart contract',
			url: 'https://github.com/AmbireTech/ambire-common/blob/4cce586884a8224a8ea2a696150207ad37680dc9/contracts/AmbireAccount.sol',
		},
		available: true,
	},
}
