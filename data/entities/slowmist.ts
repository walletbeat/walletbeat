import type { CorporateEntity, SecurityAuditor } from '@/schema/entity';

export const slowMist: CorporateEntity & SecurityAuditor = {
  id: 'slowmist',
  name: 'SlowMist',
  legalName: { name: 'SlowMist Ltd', soundsDifferent: false },
  type: {
    chainDataProvider: false,
    corporate: true,
    dataBroker: false,
    exchange: false,
    offchainDataProvider: false,
    securityAuditor: true,
    transactionBroadcastProvider: false,
    walletDeveloper: false,
  },
  crunchbase: 'https://www.crunchbase.com/organization/slowmist',
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  icon: {
    extension: 'png',
    height: 375,
    width: 375,
  },
  jurisdiction: 'China',
  linkedin: 'https://www.linkedin.com/company/slowmist',
  privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
  repoUrl: 'https://github.com/slowmist',
  twitter: 'https://x.com/SlowMist_Team',
  url: 'https://www.slowmist.com/',
};
