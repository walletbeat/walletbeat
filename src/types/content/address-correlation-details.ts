import type { EvaluationData } from '@/schema/attributes';
import type {
  AddressCorrelationValue,
  WalletAddressLinkableBy,
} from '@/schema/attributes/privacy/address-correlation';

import { component, type Content } from '../content';
import type { NonEmptyArray } from '../utils/non-empty';

export interface AddressCorrelationDetailsProps extends EvaluationData<AddressCorrelationValue> {
  linkables: NonEmptyArray<WalletAddressLinkableBy>;
}

export interface AddressCorrelationDetailsContent {
  component: 'AddressCorrelationDetails';
  componentProps: AddressCorrelationDetailsProps;
}

export function addressCorrelationDetailsContent(
  bakedProps: Omit<AddressCorrelationDetailsProps, keyof EvaluationData<AddressCorrelationValue>>,
): Content<{ WALLET_NAME: string }> {
  return component<AddressCorrelationDetailsContent, keyof typeof bakedProps>(
    'AddressCorrelationDetails',
    bakedProps,
  );
}
