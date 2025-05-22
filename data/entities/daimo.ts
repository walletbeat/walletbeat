import type { CorporateEntity, WalletDeveloper } from '@/schema/entity';

export const daimoInc: CorporateEntity & WalletDeveloper = {
  id: 'daimo',
  name: 'Daimo',
  legalName: { name: 'Daimo, Inc', soundsDifferent: false },
  type: {
    chainDataProvider: false,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: false,
    securityAuditor: false,
    transactionBroadcastProvider: false,
    walletDeveloper: true,
  },
  crunchbase: 'https://www.crunchbase.com/organization/daimo',
  farcaster: 'https://warpcast.com/daimo',
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'United States',
  linkedin: { type: 'NO_LINKEDIN_URL' },
  privacyPolicy: 'https://daimo.com/privacy',
  repoUrl: 'https://github.com/daimo-eth',
  twitter: 'https://x.com/daimo_eth',
  url: 'https://daimo.com/',
};
