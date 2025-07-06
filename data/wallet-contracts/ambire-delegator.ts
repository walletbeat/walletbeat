import type { AltMemPoolAccountAbstraction, EVMContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'

const baseAmbireDelegatorContract: EVMContract = {
	name: 'Ambire Delegator',
	address: '0x5a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d',
	chain: 'ethereum',
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
}

const chains = ['ethereum', 'polygon', 'avalanche', 'bnb', 'fantom', 'arbitrum', 'gnosis', 'optimism', 'base', 'scroll', 'metis'] as const

const ambireDelegatorContractsArray = chains.map(chain => ({
	...baseAmbireDelegatorContract,
	chain
}))

export const ambireDelegators: AltMemPoolAccountAbstraction = {
	name: 'Ambire Delegator',
	implementationLogicContracts: ambireDelegatorContractsArray
}