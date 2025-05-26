import type { Contributor } from '@/schema/wallet';

import { exampleWalletDevelopmentCompany } from '../entities/example';

export const exampleContributor: Contributor = {
  name: 'example-contributor',
  affiliation: [
    {
      developer: exampleWalletDevelopmentCompany,
      hasEquity: true,
      role: 'FOUNDER',
    },
  ],
};
