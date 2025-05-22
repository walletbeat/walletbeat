import type { CorporateEntity, WalletDeveloper } from '@/schema/entity';

export const keystone: CorporateEntity & WalletDeveloper = {
  id: 'keystone',
  name: 'Keystone',
  legalName: { name: 'Yanssie HK Limited', soundsDifferent: true },
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
  crunchbase: 'https://www.crunchbase.com/organization/kesytone',
  farcaster: 'https://warpcast.com/keystonewallet',
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'Hong Kong',
  linkedin: 'https://www.linkedin.com/company/keystonehardwarewallet/',
  privacyPolicy: 'https://keyst.one/privacy-policy',
  repoUrl: 'https://github.com/KeystoneHQ',
  twitter: 'https://x.com/KeystoneWallet',
  url: 'https://keyst.one/',
};
