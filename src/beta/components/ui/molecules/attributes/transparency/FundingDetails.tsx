import { Box } from '@mui/material';
import type React from 'react';
import { subsectionWeight } from '@/beta/components/constants';
import { ReferenceList } from '../../../atoms/ReferenceList';
import {
  monetizationStrategies,
  monetizationStrategyName,
} from '@/beta/schema/features/monetization';
import { JoinedList } from '../../../atoms/JoinedList';
import { refs } from '@/beta/schema/reference';
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon';
import type { FundingDetailsProps } from '@/beta/types/content/funding-details';

export function FundingDetails({
  wallet,
  value,
  monetization,
}: FundingDetailsProps): React.JSX.Element {
  const strategies = monetizationStrategies(monetization)
    .filter(({ strategy, value }) => value === true)
    .map(({ strategy, value }) => strategy);
  const ref = refs(monetization);
  return (
    <WrapRatingIcon rating={value.rating}>
      <Box style={{ fontWeight: subsectionWeight }}>
        <strong>{wallet.metadata.displayName}</strong> is funded by{' '}
        <JoinedList
          data={strategies.map(strategy => ({
            key: strategy,
            value: monetizationStrategyName(strategy),
          }))}
        />
        .{' '}
        {ref.length > 0 && (
          <ReferenceList ref={ref} ulStyle={{ paddingLeft: '1.5rem', marginBottom: '0px' }} />
        )}
      </Box>
    </WrapRatingIcon>
  );
}
