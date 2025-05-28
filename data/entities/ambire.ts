import type {
  ChainDataProvider,
  CorporateEntity,
  OffchainDataProvider,
  TransactionBroadcastProvider,
  WalletDeveloper,
} from '@/schema/entity';

export const ambireEntity: OffchainDataProvider &
  WalletDeveloper &
  ChainDataProvider &
  CorporateEntity &
  TransactionBroadcastProvider = {
  id: 'ambire',
  name: 'Ambire Wallet',
  legalName: { name: 'Ambire Tech Ltd.', soundsDifferent: false },
  type: {
    chainDataProvider: true,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: true,
    securityAuditor: false,
    transactionBroadcastProvider: true,
    walletDeveloper: true,
  },
  crunchbase: 'https://www.crunchbase.com/organization/adex-03c2',
  farcaster: 'https://warpcast.com/ambirewallet',
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'Bulgaria',
  linkedin: 'https://www.linkedin.com/company/ambiretech',
  privacyPolicy: 'https://www.ambire.com/Ambire%20ToS%20and%20PP%20%2826%20November%202021%29.pdf',
  repoUrl: 'https://github.com/AmbireTech',
  twitter: 'https://x.com/ambireWallet',
  url: 'https://ambire.com/',
};
