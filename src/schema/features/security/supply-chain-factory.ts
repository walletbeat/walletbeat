import type { WithRef } from '@/schema/reference';

export enum SupplyChainFactoryType {
  PASS = 'PASS',
  PARTIAL = 'PARTIAL',
  FAIL = 'FAIL',
}

export interface SupplyChainFactorySupport {
  type: SupplyChainFactoryType;
  url?: string;
  details?: string;
  factoryOpsecDocs: SupplyChainFactoryType;
  factoryOpsecAudit: SupplyChainFactoryType;
  tamperEvidence: SupplyChainFactoryType;
  hardwareVerification: SupplyChainFactoryType;
  tamperResistance: SupplyChainFactoryType;
  genuineCheck: SupplyChainFactoryType;
}

export type SupplyChainFactoryImplementation = WithRef<SupplyChainFactorySupport>;
