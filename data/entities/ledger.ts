import type { CorporateEntity, WalletDeveloper } from '@/schema/entity';

export const ledger: CorporateEntity & WalletDeveloper = {
  id: 'ledger',
  name: 'Ledger',
  legalName: { name: 'Ledger SAS', soundsDifferent: false },
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
  crunchbase: 'https://www.crunchbase.com/organization/ledger-2',
  farcaster: 'https://warpcast.com/ledgerofficial',
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'France',
  linkedin: 'https://www.linkedin.com/company/ledgerhq/',
  privacyPolicy: 'https://shop.ledger.com/pages/privacy-policy',
  repoUrl: 'https://github.com/LedgerHQ/',
  twitter: 'https://x.com/Ledger',
  url: 'https://www.ledger.com/',
};
