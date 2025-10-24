import { mtpelerin } from '@/data/entities/mtpelerin'
import type { Contributor } from '@/schema/wallet'

export const sigri: Contributor = {
	name: 'sigri',
	affiliation: [
		{
			developer: mtpelerin,
			hasEquity: false,
			role: 'CONSULTANT',
		},
	],
	url: 'https://github.com/sigri44',
}
