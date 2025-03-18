import type { WalletAddressLinkableBy } from '@/beta/schema/attributes/privacy/address-correlation';
import { compareLeakedInfo, leakedInfoName } from '@/beta/schema/features/privacy/data-collection';
import { mergeRefs } from '@/beta/schema/reference';
import { type NonEmptyArray, nonEmptyGet, nonEmptySorted } from '@/beta/types/utils/non-empty';
import { Tooltip, Typography } from '@mui/material';
import type React from 'react';
import { JoinedList } from '../../../atoms/JoinedList';
import { ExternalLink } from '../../../atoms/ExternalLink';
import { ReferenceLinks } from '../../../atoms/ReferenceLinks';
import { subsectionWeight } from '@/beta/components/constants';
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon';
import { isUrl } from '@/beta/schema/url';
import type { AddressCorrelationDetailsProps } from '@/beta/types/content/address-correlation-details';

export function AddressCorrelationDetails({
  wallet,
  value,
  linkables,
}: AddressCorrelationDetailsProps): React.JSX.Element {
  const bySource = new Map<string, NonEmptyArray<WalletAddressLinkableBy>>();
  for (const linkable of nonEmptySorted(
    linkables,
    (linkableA: WalletAddressLinkableBy, linkableB: WalletAddressLinkableBy) => {
      if (linkableA.by === 'onchain') {
        return 1;
      }
      if (linkableB.by === 'onchain') {
        return -1;
      }
      return compareLeakedInfo(linkableA.info, linkableB.info);
    },
    true
  )) {
    const sourceName = typeof linkable.by === 'string' ? linkable.by : linkable.by.name;
    const forSource = bySource.get(sourceName);
    if (forSource === undefined) {
      bySource.set(sourceName, [linkable]);
    } else {
      forSource.push(linkable);
    }
  }
  const leaksList: React.ReactNode[] = [];
  bySource.forEach((linkables, sourceName) => {
    const linkableInfos = (
      <JoinedList
        data={linkables.map(linkable => ({
          key: linkable.info,
          value: <strong>{leakedInfoName(linkable.info, wallet.metadata).long}</strong>,
        }))}
      />
    );
    const refs = mergeRefs(...linkables.flatMap(linkable => linkable.refs));
    const entity = nonEmptyGet(linkables).by;
    if (entity === 'onchain') {
      leaksList.push(
        <li key={sourceName}>
          <Typography>
            An onchain record permanently associates your {linkableInfos} with your wallet address.{' '}
            <ReferenceLinks ref={refs} />
          </Typography>
        </li>
      );
      return;
    }
    let entityName: React.ReactNode | null = null;
    if (entity.legalName === 'NOT_A_LEGAL_ENTITY') {
      entityName = <strong>{entity.name}</strong>;
    } else if (entity.legalName.soundsDifferent) {
      entityName = (
        <Tooltip title={entity.legalName.name} arrow={true}>
          <strong>{entity.name}</strong>
        </Tooltip>
      );
    } else {
      entityName = <strong>{entity.legalName.name}</strong>;
    }
    if (isUrl(entity.url)) {
      entityName = <ExternalLink url={entity.url}>{entityName}</ExternalLink>;
    }
    leaksList.push(
      <li key={sourceName}>
        <Typography>
          {entityName}{' '}
          {isUrl(entity.privacyPolicy) ? (
            <>
              {' ('}
              <ExternalLink url={entity.privacyPolicy} defaultLabel="Privacy policy" />
              {')'}
            </>
          ) : null}{' '}
          may link your wallet address to your {linkableInfos}. <ReferenceLinks ref={refs} />
        </Typography>
      </li>
    );
  });
  return (
    <>
      <WrapRatingIcon rating={value.rating}>
        <Typography fontWeight={subsectionWeight}>
          By default, {wallet.metadata.displayName} allows your wallet address to be correlated with
          your personal information:
        </Typography>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '0px', fontWeight: subsectionWeight }}>
          {leaksList}
        </ul>
      </WrapRatingIcon>
    </>
  );
}
