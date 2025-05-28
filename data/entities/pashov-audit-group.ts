import type { SecurityAuditor } from '@/schema/entity';

export const pashov: SecurityAuditor = {
  id: 'pashov-audit-group',
  name: 'Pashov Audit Group',
  // @TODO
  legalName: { name: 'Pashov Audit Group', soundsDifferent: false },
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
  crunchbase: 'https://www.crunchbase.com/person/krum-krasimirov-pashov',
  farcaster: { type: 'NO_FARCASTER_PROFILE' },
  // @TODO
  icon: {
    extension: 'svg',
  },
  // @TODO
  jurisdiction: { type: 'UNKNOWN' },
  linkedin: 'https://www.linkedin.com/in/krum-krasimirov-pashov/',
  // @TODO
  privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
  repoUrl: 'https://github.com/pashov/audits',
  twitter: 'https://x.com/pashovkrum',
  url: 'https://www.pashov.net/',
};
