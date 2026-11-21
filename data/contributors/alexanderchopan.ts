import type { Contributor } from '@/schema/wallet'

import { casberi } from '../entities/casberi'

export const alexanderchopan: Contributor = {
	name: 'alexanderchopan',
	affiliation: [
		{
			developer: casberi,
			hasEquity: true,
			role: 'FOUNDER',
		},
	],
	url: 'https://github.com/alexanderchopan',
}
