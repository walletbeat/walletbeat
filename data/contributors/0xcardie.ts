import type { Contributor } from '@/schema/wallet'

import { wallet1337 } from '../entities/wallet1337'

/**
 * GitHub account of the person who maintains 1337.
 * Affiliation is disclosed because this listing is submitted by the wallet author.
 * There is no company, so "equity" here means they control the project.
 */
export const cardiE: Contributor = {
	name: '0xCardiE',
	affiliation: [
		{
			developer: wallet1337,
			hasEquity: true,
			role: 'FOUNDER',
		},
	],
	url: 'https://github.com/0xCardiE',
}
