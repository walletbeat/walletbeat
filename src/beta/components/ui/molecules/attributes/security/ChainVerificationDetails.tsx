import { Typography } from '@mui/material';
import React from 'react';
import { ExternalLink } from '../../../atoms/ExternalLink';
import { subsectionWeight } from '@/beta/components/constants';
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon';
import { nonEmptyMap } from '@/beta/types/utils/non-empty';
import { ethereumL1LightClientUrl } from '@/beta/schema/features/security/light-client';
import { ReferenceList } from '../../../atoms/ReferenceList';
import type { ChainVerificationDetailsProps } from '@/beta/types/content/chain-verification-details';
import { commaListPrefix } from '@/beta/types/utils/text';

export function ChainVerificationDetails({
  wallet,
  value,
  lightClients,
  refs,
}: ChainVerificationDetailsProps): React.JSX.Element {
  return (
    <WrapRatingIcon rating={value.rating}>
      <Typography fontWeight={subsectionWeight}>
        <React.Fragment key="start">
          {wallet.metadata.displayName} performs L1 chain state verification using the{' '}
        </React.Fragment>
        {nonEmptyMap(lightClients, (lightClient, index) => (
          <React.Fragment key={lightClient}>
            {commaListPrefix(index, lightClients.length)}
            <ExternalLink url={ethereumL1LightClientUrl(lightClient)} />
          </React.Fragment>
        ))}
        <React.Fragment key="end">
          {' '}
          light client{lightClients.length === 1 ? '' : 's'}.
        </React.Fragment>
        {refs.length === 0 ? null : (
          <React.Fragment key="refs">
            {' '}
            <ReferenceList key="refList" ref={refs} />
          </React.Fragment>
        )}
      </Typography>
    </WrapRatingIcon>
  );
}
