import type { Contributor } from '@/schema/wallet'

import { perpetuaLabs } from '../entities/perpetua-labs'

export const perpetua: Contributor = {
	name: 'perpetua',
	affiliation: [
		{
			developer: perpetuaLabs,
			hasEquity: true,
			role: 'EMPLOYEE',
		},
	],
	url: 'https://github.com/perpetua-engineering',
}
