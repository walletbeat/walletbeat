import type { SmartWalletContract } from '@/schema/contracts';
import { featureSupported } from '@/schema/features/support';

export const ambireDelegatorContract: SmartWalletContract = {
	address: '0x5a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		available: true,
		ref: {
			label: 'Ambire EIP-7702 smart contract code',
			url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount7702.sol',
		},
	},
};
