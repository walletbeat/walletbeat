import type { WithRef } from '@/schema/reference';

export enum ReputationType {
  PASS = 'PASS',
  PARTIAL = 'PARTIAL',
  FAIL = 'FAIL',
}

export interface ReputationSupport {
  type: ReputationType;
  url?: string;
  details?: string;
  originalProduct: ReputationType;
  availability: ReputationType;
  warrantySupportRisk: ReputationType;
  disclosureHistory: ReputationType;
  bugBounty: ReputationType;
}

export type ReputationImplementation = WithRef<ReputationSupport>;
