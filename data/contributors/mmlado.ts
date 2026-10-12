import { mmladoDeveloper } from '@/data/entities/mmlado'
import type { Contributor } from '@/schema/wallet'

/**
 * Sole developer of Keycard Pal. Receives development hardware and Keycard
 * marketing material from Logos free of charge; no employment or equity.
 */
export const mmlado: Contributor = {
	name: 'mmlado',
	affiliation: [
		{
			developer: mmladoDeveloper,
			hasEquity: true,
			role: 'FOUNDER',
		},
	],
	url: 'https://github.com/mmlado',
}
