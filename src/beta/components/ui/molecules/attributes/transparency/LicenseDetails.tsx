import { Typography } from '@mui/material';
import { FOSS, licenseIsFOSS, licenseName, licenseUrl } from '@/beta/schema/features/license';
import type React from 'react';
import { ExternalLink } from '../../../atoms/ExternalLink';
import { subsectionWeight } from '@/beta/components/constants';
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon';
import type { LicenseDetailsProps } from '@/beta/types/content/license-details';

export function LicenseDetails({ wallet, value }: LicenseDetailsProps): React.JSX.Element {
  let name = <strong>{licenseName(value.license)}</strong>;
  const url = licenseUrl(value.license);
  if (url !== null) {
    name = <ExternalLink url={url}>{name}</ExternalLink>;
  }
  const content = ((): React.ReactNode => {
    switch (licenseIsFOSS(value.license)) {
      case FOSS.FOSS:
        return (
          <>
            <strong>{wallet.metadata.displayName}</strong> is licensed under the {name} license,
            which is a Free and Open-Source Software license.
          </>
        );
      case FOSS.FUTURE_FOSS:
        return (
          <>
            While <strong>{wallet.metadata.displayName}</strong> is not currently Free and
            Open-Source Software, it is licensed under the {name} license, which binds it to
            transition to a Free and Open-Source Software license at a later date.
          </>
        );
      case FOSS.NOT_FOSS:
        throw new Error('This component can only render FOSS or FUTURE_FOSS licenses.');
    }
  })();
  return (
    <WrapRatingIcon rating={value.rating}>
      <Typography fontWeight={subsectionWeight}>{content}</Typography>
    </WrapRatingIcon>
  );
}
