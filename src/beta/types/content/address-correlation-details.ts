import type {
  AddressCorrelationValue,
  WalletAddressLinkableBy,
} from '@/beta/schema/attributes/privacy/address-correlation';
import type { NonEmptyArray } from '../utils/non-empty';
import type { EvaluationData } from '@/beta/schema/attributes';
import { component, type Renderable } from '../content';

export interface AddressCorrelationDetailsProps extends EvaluationData<AddressCorrelationValue> {
  linkables: NonEmptyArray<WalletAddressLinkableBy>;
}

export interface AddressCorrelationDetailsContent {
  component: 'AddressCorrelationDetails';
  componentProps: AddressCorrelationDetailsProps;
}

export function addressCorrelationDetailsContent(
  bakedProps: Omit<AddressCorrelationDetailsProps, keyof EvaluationData<AddressCorrelationValue>>
): Renderable<EvaluationData<AddressCorrelationValue>> {
  return component<AddressCorrelationDetailsContent, keyof typeof bakedProps>(
    'AddressCorrelationDetails',
    bakedProps
  );
}
