import type { CorporateEntity, DataBroker } from '@/schema/entity';

export const honeycomb: CorporateEntity & DataBroker = {
  id: 'honeycomb',
  name: 'Honeycomb',
  legalName: { name: 'Hound Technology, Inc', soundsDifferent: true },
  type: {
    chainDataProvider: false,
    corporate: true,
    dataBroker: true,
    exchange: false,
    offchainDataProvider: false,
    securityAuditor: false,
    transactionBroadcastProvider: false,
    walletDeveloper: false,
  },
  crunchbase: 'https://www.crunchbase.com/organization/honeycombio',
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'San Francisco, California, United States',
  linkedin: 'https://www.linkedin.com/company/honeycomb.io',
  privacyPolicy: 'https://www.honeycomb.io/privacy',
  repoUrl: 'https://github.com/honeycombio',
  twitter: 'https://x.com/honeycombio',
  url: 'https://www.honeycomb.io/',
};
