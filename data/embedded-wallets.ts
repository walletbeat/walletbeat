import { rateWallet } from '@/schema/wallet';

import { unratedEmbeddedTemplate } from './embedded-wallets/unrated.tmpl';

/** The unrated embedded wallet as a rated wallet. */
export const unratedEmbeddedWallet = rateWallet(unratedEmbeddedTemplate);
