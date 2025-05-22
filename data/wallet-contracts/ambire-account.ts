import type { SmartWalletContract } from '@/schema/contracts';
import { featureSupported } from '@/schema/features/support';

export const ambireAccountContract: SmartWalletContract = {
  address: '0x0f2aa7bcda3d9d210df69a394b6965cb2566c828',
  eip7702Delegatable: false,
  methods: {
    isValidSignature: featureSupported,
    validateUserOp: featureSupported,
  },
  sourceCode: {
    available: true,
    ref: {
      label: 'Ambire ERC-4337 smart contract',
      url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount.sol',
    },
  },
};
