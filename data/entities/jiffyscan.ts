import type { ChainDataProvider, OffchainDataProvider } from '@/schema/entity';

export const jiffylabs: ChainDataProvider & OffchainDataProvider = {
  id: 'jiffylabs',
  name: 'Jiffy Labs',
  legalName: { name: 'Jiffy Labs', soundsDifferent: false },
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
  crunchbase: { type: 'NO_CRUNCHBASE_URL' },
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  icon: {
    extension: 'png',
    height: 200,
    width: 200,
  },
  jurisdiction: 'UNKNOWN',
  linkedin: 'https://www.linkedin.com/company/jiffylabs/',
  privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
  repoUrl: 'https://github.com/jiffy-labs/',
  twitter: 'https://x.com/JiffyScan',
  url: 'https://jiffyscan.xyz/',
};
