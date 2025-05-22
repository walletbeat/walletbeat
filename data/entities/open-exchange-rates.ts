import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity';

export const openExchangeRates: CorporateEntity & OffchainDataProvider = {
  id: 'open-exchange-rates',
  name: 'Open Exchange Rates',
  legalName: { name: 'Open Exchange Rates Ltd', soundsDifferent: false },
  type: {
    chainDataProvider: false,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: true,
    securityAuditor: false,
    transactionBroadcastProvider: false,
    walletDeveloper: false,
  },
  crunchbase: 'https://www.crunchbase.com/organization/open-exchange-rates',
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  icon: 'NO_ICON',
  jurisdiction: { type: 'UNKNOWN' }, // Unclear
  linkedin: { type: 'NO_LINKEDIN_URL' },
  privacyPolicy: 'https://openexchangerates.org/privacy',
  repoUrl: 'https://github.com/openexchangerates',
  twitter: { type: 'NO_TWITTER_URL' },
  url: 'https://openexchangerates.org/',
};
