import { Typography } from '@mui/material'

import { repositoryUrl } from '@/constants'
import { Rating, type Value } from '@/schema/attributes'
import type { UnratedAttributeProps } from '@/types/content/unrated-attribute'

import { ExternalLink } from '../../atoms/ExternalLink'
import { WrapRatingIcon } from '../../atoms/WrapRatingIcon'

export function UnratedAttribute<V extends Value>({
	wallet,
}: UnratedAttributeProps<V>): React.JSX.Element {
	return (
		<WrapRatingIcon rating={Rating.UNRATED}>
			<Typography>
				Walletbeat&apos;s database does not have the necessary information on{' '}
				{wallet.metadata.displayName} to assess this question.
			</Typography>
			<Typography>
				Please help us by contributing your knowledge on{' '}
				<ExternalLink url={repositoryUrl} rel=''>
					our repository
				</ExternalLink>
				!
			</Typography>
		</WrapRatingIcon>
	)
}
