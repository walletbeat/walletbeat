import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const coinbaseSmartWalletContract: SmartWalletContract = {
	name: 'Coinbase Smart Wallet',
	address: '0x00000110dcdedc9581cb5ecb8467282f2926534d',
	eip7702Delegatable: false,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: {
			label: 'Coinbase Smart Wallet (audited commit 9edcf7f1)',
			url: 'https://github.com/coinbase/smart-wallet/blob/9edcf7f174c3ebef100a4400e6a17c746ea521a4/src/CoinbaseSmartWallet.sol',
		},
		available: true,
	},
}
