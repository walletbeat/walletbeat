import type { ChainDataProvider, OffchainDataProvider } from '@/schema/entity';

export const lifi: ChainDataProvider & OffchainDataProvider = {
  id: 'lifi',
  name: 'LiFi',
  legalName: { name: 'LI.FI Service GmbH', soundsDifferent: true },
  type: {
    chainDataProvider: true,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: true,
    securityAuditor: false,
    transactionBroadcastProvider: false,
    walletDeveloper: false,
  },
  crunchbase: 'https://www.crunchbase.com/organization/li-finance-fbae',
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  icon: {
    extension: 'png',
    height: 200,
    width: 200,
  },
  jurisdiction: 'UNKNOWN',
  linkedin: 'https://www.linkedin.com/company/lifiprotocol/',
  privacyPolicy: 'https://li.fi/legal/privacy-policy/',
  repoUrl: 'https://github.com/lifinance',
  twitter: 'https://x.com/lifiprotocol',
  url: 'https://li.fi/',
};
