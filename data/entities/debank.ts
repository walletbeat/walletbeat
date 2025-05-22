import type {
  ChainDataProvider,
  CorporateEntity,
  TransactionBroadcastProvider,
  WalletDeveloper,
} from '@/schema/entity';

export const deBank: ChainDataProvider &
  CorporateEntity &
  TransactionBroadcastProvider &
  WalletDeveloper = {
  id: 'debank',
  name: 'DeBank',
  legalName: { name: 'DeBank Global PTE Ltd', soundsDifferent: false },
  type: {
    chainDataProvider: true,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: false,
    securityAuditor: false,
    transactionBroadcastProvider: true,
    walletDeveloper: true,
  },
  crunchbase: 'https://www.crunchbase.com/organization/debank',
  farcaster: 'https://warpcast.com/debankdefi',
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'Singapore',
  linkedin: { type: 'NO_LINKEDIN_URL' },
  privacyPolicy: 'https://rabby.io/docs/privacy/',
  repoUrl: 'https://github.com/DeBankDeFi',
  twitter: 'https://x.com/DebankDeFi',
  url: 'https://debank.com/',
};
