import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const ambireDelegatorContract: SmartWalletContract = {
	name: 'Ambire Delegator',
	address: '0x5a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: {
			label: 'Ambire EIP-7702 smart contract code',
			url: 'https://github.com/AmbireTech/ambire-common/blob/0e74e323e06e6ba30192dcaa93ffb536db9a2156/contracts/AmbireAccount7702.sol',
		},
		available: true,
	},
}
