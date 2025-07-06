import type { NativeAccountAbstractionContract } from '@/schema/contracts'

import { claveAccountDeployer } from './clave-deployer'

export const claveAccount: NativeAccountAbstractionContract = {
	name: 'Clave Account',
	chain: 'zksyncEra',
	deployer: claveAccountDeployer,
	eip7702Delegatable: false,
	sourceCode: {
		available: true,
		ref: {
			label: 'Clave smart contracts',
			url: 'https://github.com/getclave/clave-contracts',
		},
	},
}
