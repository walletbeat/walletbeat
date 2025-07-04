import type { AADeployer } from '@/schema/contracts'

export const claveAccountDeployer: AADeployer = {
	name: 'Clave Account Factory',
	address: '0x2b196aab35184aa539e3d8360258caf8d8309ebc',
	chain: 'zksyncEra',
	sourceCode: {
		available: true,
		ref: {
			label: 'Clave smart contracts',
			url: 'https://github.com/getclave/clave-contracts',
		},
	},
}
