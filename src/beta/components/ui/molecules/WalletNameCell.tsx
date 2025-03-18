import type { ResolvedWallet } from '@/beta/schema/wallet';
import { UnfoldLess, UnfoldMore } from '@mui/icons-material';
import { Box, Link, Tooltip, Typography } from '@mui/material';
import type React from 'react';
import { shortRowHeight, expandedRowHeight } from '../../constants';
import { ExternalLink } from '../atoms/ExternalLink';
import { type PickableVariant, VariantPicker } from '../atoms/VariantPicker';
import { nonEmptyKeys, nonEmptyMap } from '@/beta/types/utils/non-empty';
import type { Variant } from '@/beta/schema/variants';
import BlockIcon from '@mui/icons-material/Block';
import type { WalletRowStateHandle } from '../WalletTableState';
import { IconButton } from '../atoms/IconButton';
import theme from '../../ThemeRegistry/theme';
import { WalletIcon } from '../atoms/WalletIcon';
import { IconLink } from '../atoms/IconLink';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { variantToIcon, variantToTooltip, variantUrlQuery } from '../../variants';
import { RenderTypographicContent } from '../atoms/RenderTypographicContent';
import { betaSiteRoot } from '@/beta/constants';

const walletIconSize = shortRowHeight / 2;

function CrossedOutVariant({ variant }: { variant: Variant }): React.JSX.Element {
  const Icon = variantToIcon(variant);
  return (
    <Tooltip title={`No ${variant} version`} arrow={true} disableInteractive={true}>
      <Box display="flex" alignItems="center" justifyContent="center" position="relative">
        <IconButton disabled={true}>
          <Icon />
        </IconButton>
        <BlockIcon
          sx={{
            position: 'absolute',
            top: '80%',
            left: '80%',
            width: '16px',
            height: '16px',
            transform: 'translate(-50%, -50%)',
            color: theme.palette.error.main,
          }}
        />
      </Box>
    </Tooltip>
  );
}

/** The first column's cell in the wallet comparison table. */
export function WalletNameCell({ row }: { row: WalletRowStateHandle }): React.JSX.Element {
  const walletVariants = nonEmptyMap(
    nonEmptyKeys<Variant, ResolvedWallet>(row.wallet.variants),
    (variant): PickableVariant<Variant> => ({
      id: variant,
      icon: variantToIcon(variant),
      tooltip:
        row.table.variantSelected === variant
          ? 'Remove version filter'
          : variantToTooltip(row.wallet.variants, variant),
      click: () => {
        row.table.variantClick(variant);
      },
    })
  );
  return (
    <Box display="flex" justifyContent="flex-start" alignItems="flex-start" flexDirection="column">
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        justifyContent="flex-start"
        gap="8px"
        width="100%"
        height={shortRowHeight}
      >
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          height={shortRowHeight}
          sx={row.rowWideStyle}
        >
          <IconButton size="small" onClick={row.toggleExpanded.bind(row)}>
            {row.expanded ? <UnfoldLess /> : <UnfoldMore />}
          </IconButton>
        </Box>
        <Link
          href={`${betaSiteRoot}/wallet/${row.wallet.metadata.id}/${variantUrlQuery(row.wallet.variants, row.table.variantSelected)}`}
          color="text.primary"
          underline="hover"
          display="flex"
          flex="1"
          gap="inherit"
          sx={row.rowWideStyle}
        >
          <Box display="flex" flexDirection="column" justifyContent="center">
            <WalletIcon walletMetadata={row.wallet.metadata} iconSize={walletIconSize} />
          </Box>
          <Box flex="1" sx={row.rowWideStyle}>
            <Typography variant="h2">{row.wallet.metadata.displayName}</Typography>
          </Box>
        </Link>

        <Box display="flex" flexDirection="row" gap="0px">
          {row.table.variantSelected !== null &&
          row.wallet.variants[row.table.variantSelected] === undefined ? (
            <CrossedOutVariant variant={row.table.variantSelected} />
          ) : null}
          <VariantPicker
            pickerId="walletVariants"
            variants={walletVariants}
            pickedVariant={row.table.variantSelected}
          />
        </Box>
      </Box>
      {row.expanded ? (
        <Box
          display="flex"
          flexDirection="column"
          height={expandedRowHeight - shortRowHeight}
          sx={{ ...row.rowWideStyle, lineHeight: 1, whiteSpace: 'normal' }}
        >
          <Box flex="1">
            {row.table.variantSelected !== null &&
            row.wallet.variants[row.table.variantSelected] === undefined ? (
              <Typography variant="body1" marginBottom="0.5rem">
                {row.wallet.metadata.displayName} does not have a {row.table.variantSelected}{' '}
                version.
              </Typography>
            ) : (
              <RenderTypographicContent
                content={row.wallet.metadata.blurb.render({})}
                typography={{
                  variant: 'body1',
                  marginBottom: '0.5rem',
                }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            display="flex"
            flexDirection="row"
            alignItems="baseline"
            gap="6px"
            paddingBottom="10px"
          >
            <IconLink
              href={`${betaSiteRoot}/wallet/${row.wallet.metadata.id}/${variantUrlQuery(row.wallet.variants, row.table.variantSelected)}`}
              IconComponent={InfoOutlinedIcon}
            >
              Learn more
            </IconLink>
            |
            <ExternalLink
              url={row.wallet.metadata.url}
              defaultLabel={`${row.wallet.metadata.displayName} website`}
            />
            |
            {row.wallet.metadata.repoUrl === null ? null : (
              <ExternalLink url={row.wallet.metadata.repoUrl} defaultLabel="Code" />
            )}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
