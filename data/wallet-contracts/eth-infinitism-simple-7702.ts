import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const ethInfinitismSimple7702Contract: SmartWalletContract = {
	name: 'eth-infinitism Simple7702Account',
	address: '0xe6cae83bde06e4c305530e199d7217f42808555b',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: [
			{
				explanation:
					'Zeus delegates to this implementation instead of shipping its own smart account contract. It is a minimal account intended for EIP-7702 batching and ERC-4337 gas sponsoring, and it implements ERC-1271 signature validation and ERC-4337 user operation validation.',
				url: 'https://github.com/eth-infinitism/account-abstraction/blob/f54584edd4c627e084d04c315dcabda48a6b9ea9/contracts/accounts/Simple7702Account.sol',
			},
		],
		available: true,
	},
}
