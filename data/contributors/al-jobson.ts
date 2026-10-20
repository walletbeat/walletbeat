import type { Contributor } from '@/schema/wallet'

import { veyrnoxEntity } from '../entities/veyrnox'

export const alJobson: Contributor = {
	name: 'al-jobson',
	affiliation: [
		{
			developer: veyrnoxEntity,
			hasEquity: true,
			role: 'FOUNDER',
		},
	],
}
