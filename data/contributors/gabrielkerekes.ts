import type { Contributor } from '@/schema/wallet'

import { nufi } from '../entities/nufi'

export const gabrielkerekes: Contributor = {
	name: 'gabrielkerekes',
	affiliation: [
		{
			developer: nufi,
			hasEquity: false,
			role: 'EMPLOYEE',
		},
	],
	url: 'https://github.com/gabrielkerekes',
}
