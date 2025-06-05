import type { CorporateEntity, SecurityAuditor } from '@/schema/entity';

export const leastAuthority: CorporateEntity & SecurityAuditor = {
  id: 'least-authority',
  name: 'Least Authority',
  legalName: { name: 'Least Authority', soundsDifferent: false },
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
  crunchbase: 'https://www.crunchbase.com/organization/least-authority-enterprises',
  farcaster: 'https://warpcast.com/leastauthority',
  icon: {
    extension: 'png',
    height: 1043,
    width: 1246,
  },
  jurisdiction: 'Berlin, Germany',
  linkedin: 'https://www.linkedin.com/company/leastauthority/',
  privacyPolicy: 'https://leastauthority.com/privacy-policy/',
  repoUrl: 'https://github.com/LeastAuthority',
  twitter: 'https://x.com/LeastAuthority',
  url: 'https://leastauthority.com/',
};
