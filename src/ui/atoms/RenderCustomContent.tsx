import type { CustomContent } from '@/types/content'
import { AddressCorrelationDetails } from '@/ui/molecules/attributes/privacy/AddressCorrelationDetails'
import { ChainVerificationDetails } from '@/ui/molecules/attributes/security/ChainVerificationDetails'
import { ScamAlertDetails } from '@/ui/molecules/attributes/security/ScamAlertDetails'
import { SecurityAuditsDetails } from '@/ui/molecules/attributes/security/SecurityAuditsDetails'
import { TransactionInclusionDetails } from '@/ui/molecules/attributes/self-sovereignty/TransactionInclusionDetails'
import { FundingDetails } from '@/ui/molecules/attributes/transparency/FundingDetails'
import { LicenseDetails } from '@/ui/molecules/attributes/transparency/LicenseDetails'
import { SourceVisibilityDetails } from '@/ui/molecules/attributes/transparency/SourceVisibilityDetails'
import { UnratedAttribute } from '@/ui/molecules/attributes/UnratedAttribute'

import { PrivateTransfersDetails } from '../molecules/attributes/privacy/PrivateTransfersDetails'

export function RenderCustomContent<CustomContent_ extends CustomContent>({
	content,
	...otherProps
}: {
	content: CustomContent_
} & CustomContent_['component']['componentProps']) {
	const { component, componentProps } = content.component

	switch (component) {
		case 'AddressCorrelationDetails':
			return <AddressCorrelationDetails {...componentProps} {...otherProps} />
		case 'ChainVerificationDetails':
			return <ChainVerificationDetails {...componentProps} {...otherProps} />
		case 'FundingDetails':
			return <FundingDetails {...componentProps} {...otherProps} />
		case 'LicenseDetails':
			return <LicenseDetails {...componentProps} {...otherProps} />
		case 'PrivateTransfersDetails':
			return <PrivateTransfersDetails {...componentProps} {...otherProps} />
		case 'ScamAlertDetails':
			return <ScamAlertDetails {...componentProps} {...otherProps} />
		case 'SecurityAuditsDetails':
			return <SecurityAuditsDetails {...componentProps} {...otherProps} />
		case 'SourceVisibilityDetails':
			return <SourceVisibilityDetails {...componentProps} {...otherProps} />
		case 'TransactionInclusionDetails':
			return <TransactionInclusionDetails {...componentProps} {...otherProps} />
		case 'UnratedAttribute':
			return <UnratedAttribute {...componentProps} {...otherProps} />
	}
}
