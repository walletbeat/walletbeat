import type { CorporateEntity, TransactionBroadcastProvider } from '@/schema/entity';

export const biconomy: CorporateEntity & TransactionBroadcastProvider = {
  id: 'biconomy',
  name: 'Biconomy',
  legalName: { name: 'Biconomy Labs', soundsDifferent: false },
  type: {
    chainDataProvider: true,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: false,
    securityAuditor: false,
    transactionBroadcastProvider: true,
    walletDeveloper: false,
  },
  crunchbase: 'https://www.crunchbase.com/organization/biconomy',
  farcaster: 'https://warpcast.com/biconomy',
  icon: {
    extension: 'png',
    height: 200,
    width: 200,
  },
  jurisdiction: 'UNKNOWN',
  linkedin: 'https://www.linkedin.com/company/biconomy/',
  privacyPolicy: 'https://biconomy.zendesk.com/hc/en-us/articles/360036040012-Privacy-policy',
  repoUrl: 'https://github.com/bcnmy',
  twitter: 'https://x.com/biconomy',
  url: 'https://www.biconomy.io/',
};
