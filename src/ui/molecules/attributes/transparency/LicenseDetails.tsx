import { Typography } from '@mui/material'
import { FOSS, licenseIsFOSS, licenseName, licenseUrl } from '@/schema/features/license'
import type React from 'react'
import { ExternalLink } from '../../../atoms/ExternalLink'
import { subsectionWeight } from '@/components/constants'
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'
import type { LicenseDetailsProps } from '@/types/content/license-details'
import { ReferenceLinks } from '../../../atoms/ReferenceLinks'
import { refs, refsWithValue } from '@/schema/reference'
import type { Wallet } from '@/schema/wallet'
import { License } from '@/schema/features/license'

export function LicenseDetails({ wallet, value }: LicenseDetailsProps) {
	// First check if wallet is proper RatedWallet with features
	if (!wallet || !value) {
		return <Typography variant="body2">License information unavailable.</Typography>
	}

	// Use the value passed as props since it's already processed
	const licenseValue = value.license;
	let licenseRefs = [];

	// Try to get references if features are available 
	if (wallet.features && wallet.features.license) {
		// Extract references using the enhanced refsWithValue function
		licenseRefs = refsWithValue(wallet.features.license);
	} else if (wallet.metadata && wallet.metadata.repoUrl) {
		// Fallback to repo URL if no specific license references
		licenseRefs = [{
			urls: [{ 
				url: `${wallet.metadata.repoUrl}/blob/master/LICENSE`,
				label: `${wallet.metadata.displayName} License File`
			}],
			explanation: `${wallet.metadata.displayName}'s license file in the source code repository`
		}];
	}
	
	// Use displayName from value instead of hardcoding specific licenses
	const licenseText = value.displayName;

	return (
		<>
			<Typography variant="body2">{licenseText}</Typography>
			{licenseRefs?.length > 0 && <ReferenceLinks refs={licenseRefs} />}
		</>
	)
}
