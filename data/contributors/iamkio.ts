import type { Contributor } from '@/schema/wallet'

import { pillar } from '../entities/pillar'

export const iamkio: Contributor = {
	name: 'iamkio',
	affiliation: [
		{
			developer: pillar,
			hasEquity: false,
			role: 'EMPLOYEE',
		},
	],
}
