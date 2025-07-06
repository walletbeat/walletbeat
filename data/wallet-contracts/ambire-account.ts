import type { AltMemPoolAccountAbstraction, EVMContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

const baseAmbireAccountContract: EVMContract = {
	name: 'Ambire Smart Account',
	address: '0x0f2aa7bcda3d9d210df69a394b6965cb2566c828',
	chain: 'ethereum',
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
}

const chains = ['ethereum', 'polygon', 'avalanche', 'bnb', 'fantom', 'arbitrum', 'gnosis', 'optimism', 'base', 'scroll', 'metis'] as const

const ambireContractsArray = chains.map(chain => ({
	...baseAmbireAccountContract,
	chain
}))

export const ambireAccounts: AltMemPoolAccountAbstraction = {
	name: 'Ambire Smart Account',
	implementationLogicContracts: ambireContractsArray
}