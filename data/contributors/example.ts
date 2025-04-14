import type { Contributor } from '@/schema/wallet'
import { exampleWalletDevelopmentCompany } from '../entities/example'

export const exampleContributor: Contributor = {
	name: 'example-contributor',
	affiliation: [
		{
			developer: exampleWalletDevelopmentCompany,
			role: 'FOUNDER',
			hasEquity: true,
		},
	],
}
