import type { CorporateEntity, SecurityAuditor } from '@/schema/entity';

export const veridise: CorporateEntity & SecurityAuditor = {
  id: 'veridise',
  name: 'Veridise',
  legalName: { name: 'Veridise Inc', soundsDifferent: false },
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
  crunchbase: 'https://www.crunchbase.com/organization/veridise',
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  icon: {
    extension: 'svg',
  },
  jurisdiction: 'Austin, Texas, United States',
  linkedin: 'https://www.linkedin.com/company/veridise',
  privacyPolicy: 'https://veridise.com/privacy-policy/',
  repoUrl: 'https://github.com/Veridise',
  twitter: 'https://x.com/VeridiseInc',
  url: 'https://veridise.com/',
};
