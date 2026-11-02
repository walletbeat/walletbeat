import type { Contributor } from '@/schema/wallet'

import { protofire } from '../entities/protofire'

export const msvstj: Contributor = {
	name: 'msvstj',
	affiliation: [
		{
			developer: protofire,
			hasEquity: false,
			role: 'CONSULTANT',
		},
	],
	url: 'https://github.com/msvstj',
}
