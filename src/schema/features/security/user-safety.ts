import type { WithRef } from '@/schema/reference';

export enum UserSafetyType {
  PASS = 'PASS',
  PARTIAL = 'PARTIAL',
  FAIL = 'FAIL',
}

export interface UserSafetySupport {
  type: UserSafetyType;
  url?: string;
  details?: string;
  readableAddress: UserSafetyType;
  contractLabeling: UserSafetyType;
  rawTxReview: UserSafetyType;
  readableTx: UserSafetyType;
  txCoverageExtensibility: UserSafetyType;
  txExpertMode: UserSafetyType;
  rawEip712: UserSafetyType;
  readableEip712: UserSafetyType;
  eip712CoverageExtensibility: UserSafetyType;
  eip712ExpertMode: UserSafetyType;
  riskAnalysis: UserSafetyType;
  riskAnalysisLocal: UserSafetyType;
  fullyLocalRiskAnalysis: UserSafetyType;
  txSimulation: UserSafetyType;
  txSimulationLocal: UserSafetyType;
  fullyLocalTxSimulation: UserSafetyType;
}

export type UserSafetyImplementation = WithRef<UserSafetySupport>;
