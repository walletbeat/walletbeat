import { oathEntity } from '@/data/entities/oath'
import type { Contributor } from '@/schema/wallet'

export const devdasx: Contributor = {
	name: 'devdasx',
	affiliation: [{ developer: oathEntity, hasEquity: true, role: 'FOUNDER' }],
	url: 'https://github.com/devdasx',
}
