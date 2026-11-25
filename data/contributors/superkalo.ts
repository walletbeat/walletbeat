import type { Contributor } from '@/schema/wallet'

import { ambireEntity } from '../entities/ambire'

export const superkalo: Contributor = {
	name: 'superKalo',
	affiliation: [
		{
			developer: ambireEntity,
			hasEquity: true,
			role: 'EMPLOYEE',
		},
	],
	url: 'https://github.com/superKalo',
}
