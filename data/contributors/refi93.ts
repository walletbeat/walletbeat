import type { Contributor } from '@/schema/wallet'

import { nufi } from '../entities/nufi'

export const refi93: Contributor = {
	name: 'refi93',
	affiliation: [
		{
			developer: nufi,
			hasEquity: false,
			role: 'FOUNDER',
		},
	],
	url: 'https://github.com/refi93',
}
