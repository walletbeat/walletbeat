import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity';

export const github: CorporateEntity & OffchainDataProvider = {
  id: 'github',
  name: 'Github',
  legalName: { name: 'GitHub Inc', soundsDifferent: false },
  type: {
    chainDataProvider: false,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: true,
    securityAuditor: false,
    transactionBroadcastProvider: false,
    walletDeveloper: false,
  },
  crunchbase: 'https://www.crunchbase.com/organization/github',
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'UNKNOWN',
  linkedin: 'https://www.linkedin.com/company/github/',
  privacyPolicy:
    'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  repoUrl: 'https://github.com',
  twitter: 'https://x.com/github',
  url: 'https://github.com/',
};
