import type { RatedWallet } from '@/schema/wallet'
import { Typography } from '@mui/material'
import type React from 'react'
import { ExternalLink } from '../../../atoms/ExternalLink'
import { subsectionWeight } from '@/components/constants'
import type { SourceVisibilityValue } from '@/schema/attributes/transparency/source-visibility'
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'

export function SourceVisibilityDetails({
	wallet,
	value,
}: {
	wallet: RatedWallet
	value: SourceVisibilityValue
}): React.JSX.Element {
	if (wallet.metadata.repoUrl === null) {
		throw new Error('This component can only render wallets with valid repository URLs.')
	}
	return (
		<WrapRatingIcon rating={value.rating}>
			<Typography fontWeight={subsectionWeight}>
				The source code for <strong>{wallet.metadata.displayName}</strong> is{' '}
				<ExternalLink url={wallet.metadata.repoUrl}>publicly viewable here</ExternalLink>.
			</Typography>
		</WrapRatingIcon>
	)
}
