import { Typography } from '@mui/material'
import type { LicenseDetailsProps } from '@/types/content/license-details'
import { ReferenceLinks } from '../../../atoms/ReferenceLinks'

export function LicenseDetails({ value, licenseRefs }: LicenseDetailsProps) {
	return (
		<>
			<Typography variant="body2">{value.displayName}</Typography>
			<ReferenceLinks references={licenseRefs} />
		</>
	)
}
