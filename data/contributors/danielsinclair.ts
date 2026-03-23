import type { Contributor } from '@/schema/wallet'

import { rainbow } from '../entities/rainbow'

export const danielsinclair: Contributor = {
	name: 'danielsinclair',
	affiliation: [
		{
			developer: rainbow,
			hasEquity: false,
			role: 'EMPLOYEE',
		},
	],
	url: 'https://github.com/DanielSinclair',
}
