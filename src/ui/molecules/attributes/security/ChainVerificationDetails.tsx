import { Typography } from '@mui/material';
import React from 'react';

import { subsectionWeight } from '@/components/constants';
import { ethereumL1LightClientUrl } from '@/schema/features/security/light-client';
import type { ChainVerificationDetailsProps } from '@/types/content/chain-verification-details';
import { nonEmptyMap } from '@/types/utils/non-empty';
import { commaListPrefix } from '@/types/utils/text';

import { ExternalLink } from '../../../atoms/ExternalLink';
import { ReferenceList } from '../../../atoms/ReferenceList';
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon';

export function ChainVerificationDetails({
	wallet,
	value,
	lightClients,
	refs,
}: ChainVerificationDetailsProps): React.JSX.Element {
	return (
		<WrapRatingIcon rating={value.rating}>
			<Typography fontWeight={subsectionWeight}>
				<React.Fragment key='start'>
					{wallet.metadata.displayName} performs L1 chain state verification using
					the{' '}
				</React.Fragment>
				{nonEmptyMap(lightClients, (lightClient, index) => (
					<React.Fragment key={lightClient}>
						{commaListPrefix(index, lightClients.length)}
						<ExternalLink url={ethereumL1LightClientUrl(lightClient)} />
					</React.Fragment>
				))}
				<React.Fragment key='end'>
					{' '}
					light client{lightClients.length === 1 ? '' : 's'}.
				</React.Fragment>
				{refs.length === 0 ? null : (
					<React.Fragment key='refs'>
						{' '}
						<ReferenceList key='refList' ref={refs} />
					</React.Fragment>
				)}
			</Typography>
		</WrapRatingIcon>
	);
}
