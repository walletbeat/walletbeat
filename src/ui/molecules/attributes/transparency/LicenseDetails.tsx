import { Typography } from '@mui/material'
import { FOSS, License, licenseIsFOSS, licenseName, licenseUrl } from '@/schema/features/license'
import type { LicenseDetailsProps } from '@/types/content/license-details'
import { ExternalLink } from '@/ui/atoms/ExternalLink'

export function LicenseDetails({ wallet, value }: LicenseDetailsProps) {
	switch (value.license) {
		case License.PROPRIETARY:
			return (
				<Typography variant="body2">
					{wallet.metadata.displayName} is licensed under a proprietary non-open-source license.
				</Typography>
			)
		case License.UNLICENSED_VISIBLE:
			return (
				<Typography variant="body2">
					{wallet.metadata.displayName} has no visible license information. Consequently, it should
					be assumed to be proprietary (not open-source).
				</Typography>
			)
		default:
			const url = licenseUrl(value.license)
			if (url === null) {
				throw new Error(`Invalid license: ${value.license}`)
			}
			const fossText = ((): string => {
				switch (licenseIsFOSS(value.license)) {
					case FOSS.FOSS:
						return 'a Free and Open-Source (FOSS) license.'
					case FOSS.FUTURE_FOSS:
						return 'a non-open-source (non-FOSS) license. However, its license stipulates that it must transition to a Free and Open-Source (FOSS) license in the future.'
					case FOSS.NOT_FOSS:
						return 'a non-open-source (non-FOSS) license.'
				}
			})()
			return (
				<Typography variant="body2">
					{wallet.metadata.displayName} is licensed under the{' '}
					<ExternalLink url={url} defaultLabel={licenseName(value.license)} /> license, {fossText}
				</Typography>
			)
	}
}
