import type { Contributor } from '@/schema/wallet'

import { dirkJaeckel } from '../entities/dirk-jaeckel'

export const biafra23: Contributor = {
	name: 'biafra23',
	affiliation: [
		{
			developer: dirkJaeckel,
			hasEquity: false,
			role: 'FOUNDER',
		},
	],
	url: 'https://github.com/biafra23',
}
