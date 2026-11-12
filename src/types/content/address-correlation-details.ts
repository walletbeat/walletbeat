import type { EvaluationData } from '@/schema/attributes'
import type {
	AddressCorrelationMetadata,
	WalletAddressLinkableBy,
} from '@/schema/attributes/privacy/address-correlation'

import { component, type Content } from '../content'
import type { NonEmptyArray } from '../utils/non-empty'

export interface AddressCorrelationDetailsProps extends EvaluationData<AddressCorrelationMetadata> {
	linkables: NonEmptyArray<WalletAddressLinkableBy>
}

export type AddressCorrelationDetailsBakedProps = Omit<
	AddressCorrelationDetailsProps,
	keyof EvaluationData<AddressCorrelationMetadata>
>

export interface AddressCorrelationDetailsContent {
	component: 'AddressCorrelationDetails'
	componentProps: AddressCorrelationDetailsBakedProps
}

export function addressCorrelationDetailsContent(
	bakedProps: AddressCorrelationDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('AddressCorrelationDetails', bakedProps)
}
