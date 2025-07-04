import type {  NativeAccountAbstraction } from '@/schema/contracts'
import { claveAccountDeployer } from './clave-deployer'

export const claveAccount: NativeAccountAbstraction = {
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
