import type { Contributor } from '@/schema/wallet'

import { vultisigEntity } from '../entities/vultisig'

export const realpaaao: Contributor = {
	name: 'realpaaao',
	affiliation: [
		{
			developer: vultisigEntity,
			hasEquity: true,
			role: 'EMPLOYEE',
		},
	],
	url: 'https://github.com/realpaaao',
}
