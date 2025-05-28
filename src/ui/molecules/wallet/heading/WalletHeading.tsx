import GitHubIcon from '@mui/icons-material/GitHub';
import LanguageIcon from '@mui/icons-material/Language';
import { Typography } from '@mui/material';
import { type FC, Fragment } from 'react';
import React from 'react';

import { variantToName, variantToRunsOn } from '@/components/variants';
import { HardwareIcon } from '@/icons/devices/HardwareIcon';
import { hasVariant, Variant } from '@/schema/variants';
import type { RatedWallet } from '@/schema/wallet';
import { nonEmptyKeys, nonEmptyMap } from '@/types/utils/non-empty';
import { commaListPrefix } from '@/types/utils/text';
import { ExternalLink } from '@/ui/atoms/ExternalLink';
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent';

export const WalletHeading: FC<{
  wallet: RatedWallet;
  pickedVariant: Variant | null;
  singleVariant: Variant | null;
}> = ({ wallet, pickedVariant, singleVariant }) => {
  const needsVariantFiltering = singleVariant === null;

  return (
    <div data-testid='wallet-blurb' className='break-words whitespace-normal'>
      <div className='flex flex-row gap-2 mt-2 mb-[24px] items-center flex-wrap p-[2px]'>
        {[
          <div className='flex flex-row gap-2 items-center' key='website'>
            <LanguageIcon fontSize='small' sx={{ color: 'var(--text-primary)' }} />
            <ExternalLink
              url={wallet.metadata.url}
              defaultLabel={'{{WALLET_NAME}} website'}
              style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}
            />
          </div>,
          wallet.metadata.repoUrl !== null ? (
            <div className='flex flex-row gap-2 items-center' key='repo'>
              <GitHubIcon fontSize='small' sx={{ color: 'var(--text-primary)' }} />
              <ExternalLink
                url={wallet.metadata.repoUrl}
                defaultLabel='GitHub Repository'
                style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}
              />
            </div>
          ) : undefined,
          hasVariant(wallet.variants, Variant.HARDWARE) ? (
            <div className='flex flex-row gap-2 items-center' key='hardware'>
              <HardwareIcon fontSize='small' />
            </div>
          ) : undefined,
        ]
          .filter(Boolean)
          .map(
            value =>
              value !== undefined && (
                <div
                  key={value.key ?? 'hi'}
                  className='bg-primary border px-2 py-1 rounded-md hover:bg-primary'
                >
                  {value}
                </div>
              ),
          )}
      </div>
      <div className='break-words whitespace-normal'>
        <RenderTypographicContent
          content={wallet.metadata.blurb}
          typography={{ variant: 'body1' }}
          strings={{
            WALLET_NAME: wallet.metadata.displayName,
          }}
        />
      </div>
      <Typography fontSize='0.9rem' marginTop='3rem'>
        <React.Fragment key='begin'>
          <span style={{ color: 'var(--accent)' }}>Platforms: </span>
        </React.Fragment>
        {nonEmptyMap(nonEmptyKeys(wallet.variants), (variant, variantIndex) => (
          <React.Fragment key={variant}>
            {commaListPrefix(variantIndex, Object.keys(wallet.variants).length)}
            <strong>{variantToRunsOn(variant)}</strong>
          </React.Fragment>
        ))}
        <Fragment key='afterVariants'>.</Fragment>
        {/* TODO: Is this ever actually shown for the heading? */}
        {needsVariantFiltering && (
          <React.Fragment key='variantSpecifier'>
            <React.Fragment key='variantDisclaimer'>
              {' '}
              The ratings below vary depending on the version.{' '}
            </React.Fragment>
            {pickedVariant === null ? (
              <React.Fragment key='variantReminder'>
                Select a version to see version-specific ratings.
              </React.Fragment>
            ) : (
              <React.Fragment key='variantReminder'>
                You are currently viewing the ratings for the{' '}
                <strong>{variantToName(pickedVariant, false)}</strong> version.
              </React.Fragment>
            )}
          </React.Fragment>
        )}
      </Typography>
    </div>
  );
};
