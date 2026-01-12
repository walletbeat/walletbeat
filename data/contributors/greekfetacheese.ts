import type { Contributor } from '@/schema/wallet'

import { zeusEntity } from '../entities/zeus'

export const greekfetacheese: Contributor = {
	name: 'greekfetacheese',
	affiliation: [
		{
			developer: zeusEntity,
			hasEquity: false,
			role: 'FOUNDER',
		},
	],
	url: 'https://github.com/greekfetacheese',
}
