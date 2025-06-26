import type { CorporateEntity, WalletDeveloper } from '@/schema/entity';

export const myetherwalletEntity: CorporateEntity & WalletDeveloper = {
  id: 'myetherwallet',
  name: 'MyEtherWallet',
  legalName: { name: 'MyEtherWallet Inc', soundsDifferent: false },
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
  crunchbase: { type: 'NO_CRUNCHBASE_URL' },
  farcaster: 'https://farcaster.xyz/myetherwallet',
  icon: { extension: 'svg' },
  jurisdiction: 'United States',
  linkedin: 'https://www.linkedin.com/company/myetherwallet/',
  privacyPolicy: 'https://www.myetherwallet.com/privacy-policy',
  repoUrl: 'https://github.com/myetherwallet',
  twitter: 'https://x.com/myetherwallet/',
  url: 'https://www.myetherwallet.com/',
};
