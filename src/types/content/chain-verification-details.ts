import type { EvaluationData } from '@/schema/attributes';
import type { ChainVerificationValue } from '@/schema/attributes/security/chain-verification';
import type { EthereumL1LightClient } from '@/schema/features/security/light-client';
import type { FullyQualifiedReference } from '@/schema/reference';

import { type Content, component } from '../content';
import type { NonEmptyArray } from '../utils/non-empty';

export interface ChainVerificationDetailsProps extends EvaluationData<ChainVerificationValue> {
  lightClients: NonEmptyArray<EthereumL1LightClient>;
  refs: FullyQualifiedReference[];
}

export interface ChainVerificationDetailsContent {
  component: 'ChainVerificationDetails';
  componentProps: ChainVerificationDetailsProps;
}

export function chainVerificationDetailsContent(
  bakedProps: Omit<ChainVerificationDetailsProps, keyof EvaluationData<ChainVerificationValue>>,
): Content<{ WALLET_NAME: string }> {
  return component<ChainVerificationDetailsContent, keyof typeof bakedProps>(
    'ChainVerificationDetails',
    bakedProps,
  );
}
