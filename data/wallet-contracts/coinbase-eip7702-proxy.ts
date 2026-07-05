import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

export const coinbaseEip7702ProxyContract: SmartWalletContract = {
	name: 'Coinbase EIP-7702 Proxy',
	address: '0x7702cb554e6bfb442cb743a7df23154544a7176c',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: {
			label: 'Coinbase EIP-7702 Proxy (`base/eip-7702-proxy`)',
			url: 'https://github.com/base/eip-7702-proxy/blob/429ba3c76186a72949235e23cc84267bf456b48a/src/EIP7702Proxy.sol',
		},
		available: true,
	},
}
