import type { Contributor } from '@/schema/wallet';

import { myetherwalletEntity } from '../entities/myetherwallet';

export const abyscuit: Contributor = {
  name: 'abyscuit',
  affiliation: [
    {
      developer: myetherwalletEntity,
      hasEquity: false,
      role: 'EMPLOYEE',
    },
  ],
  url: 'https://github.com/abyscuit',
};
