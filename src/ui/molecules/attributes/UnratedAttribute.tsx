import { WrapRatingIcon } from '../../atoms/WrapRatingIcon'
import { Rating, type Value } from '@/schema/attributes'
import { Typography } from '@mui/material'
import { ExternalLink } from '../../atoms/ExternalLink'
import type { UnratedAttributeProps } from '@/types/content/unrated-attribute'

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
				<ExternalLink url="https://github.com/fluidkey/walletbeat" rel="">
					our repository
				</ExternalLink>
				!
			</Typography>
		</WrapRatingIcon>
	)
}
