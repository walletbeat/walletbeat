import BlockIcon from '@mui/icons-material/Block';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Link, Typography } from '@mui/material';
import type React from 'react';

import { betaSiteRoot } from '@/constants';
import type { Variant } from '@/schema/variants';
import type { ResolvedWallet } from '@/schema/wallet';
import { nonEmptyKeys, nonEmptyMap } from '@/types/utils/non-empty';

import { expandedRowHeight, shortRowHeight } from '../../components/constants';
import theme from '../../components/ThemeRegistry/theme';
import { variantToIcon, variantToTooltip, variantUrlQuery } from '../../components/variants';
import { ExternalLink } from '../atoms/ExternalLink';
import { IconButton } from '../atoms/IconButton';
import { IconLink } from '../atoms/IconLink';
import { RenderTypographicContent } from '../atoms/RenderTypographicContent';
import { Tooltip } from '../atoms/Tooltip';
import { type PickableVariant, VariantPicker } from '../atoms/VariantPicker';
import { WalletIcon } from '../atoms/WalletIcon';
import type { WalletRowStateHandle } from '../WalletTableState';

const walletIconSize = shortRowHeight * 0.5;

function CrossedOutVariant({ variant }: { variant: Variant }): React.JSX.Element {
	const Icon = variantToIcon(variant);
	return (
		<Tooltip content={`No ${variant} version`}>
			<div className="flex items-center justify-center relative">
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
			</div>
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
		}),
	);
	return (
		<div className="flex flex-col justify-start items-start">
			<div
				className="flex flex-row items-center justify-start gap-4 w-full"
				style={{
					height: shortRowHeight + 40,
				}}
			>
				<div
					className="flex flex-col justify-center"
					style={{
						height: shortRowHeight + 40,
					}}
				>
					<IconButton size="small" onClick={row.toggleExpanded.bind(row)}>
						{row.expanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
					</IconButton>
				</div>
				<Link
					href={`${betaSiteRoot}/${row.wallet.metadata.id}/${variantUrlQuery(row.wallet.variants, row.table.variantSelected)}`}
					color="text.primary"
					underline="hover"
					display="flex"
					flex="1"
					gap="inherit"
					sx={row.rowWideStyle}
				>
					<div className="flex flex-col justify-center">
						<WalletIcon wallet={row.wallet} iconSize={walletIconSize} />
					</div>
					<div style={row.rowWideStyle} className="flex-1 flex items-center">
						<h2 className="text-primary" style={{ fontSize: '1.04rem' }}>
							{row.wallet.metadata.tableName}
						</h2>
						{/* <Typography variant="h2"></Typography> */}
					</div>
				</Link>

				<div className="flex flex-row gap-0">
					{row.table.variantSelected !== null &&
					row.wallet.variants[row.table.variantSelected] === undefined ? (
						<CrossedOutVariant variant={row.table.variantSelected} />
					) : null}
					<VariantPicker
						pickerId="walletVariants"
						variants={walletVariants}
						pickedVariant={row.table.variantSelected}
					/>
				</div>
			</div>
			{row.expanded ? (
				<div
					className="flex flex-col"
					style={{
						height: expandedRowHeight - (shortRowHeight + 40),
						...row.rowWideStyle,
						lineHeight: 1,
						whiteSpace: 'normal',
						color: 'var(--text-primary)',
					}}
				>
					<div className="flex-1">
						{row.table.variantSelected !== null &&
						row.wallet.variants[row.table.variantSelected] === undefined ? (
							<Typography
								variant="body1"
								marginBottom="0.5rem"
								sx={{ color: 'var(--text-primary)' }}
							>
								{row.wallet.metadata.displayName} does not have a {row.table.variantSelected}{' '}
								version.
							</Typography>
						) : (
							<RenderTypographicContent
								content={row.wallet.metadata.blurb.render({})}
								typography={{
									variant: 'body1',
									marginBottom: '0.5rem',
									color: 'var(--text-primary)',
								}}
							/>
						)}
					</div>
					<Typography
						variant="body2"
						display="flex"
						flexDirection="row"
						alignItems="baseline"
						gap="6px"
						paddingBottom="10px"
						sx={{
							color: 'var(--text-primary)',
							'& a': {
								color: 'var(--text-primary)',
							},
						}}
					>
						<IconLink
							href={`${betaSiteRoot}/${row.wallet.metadata.id}/${variantUrlQuery(row.wallet.variants, row.table.variantSelected)}`}
							IconComponent={InfoOutlinedIcon}
							color="text.primary"
						>
							Learn more
						</IconLink>
						|
						<ExternalLink
							url={row.wallet.metadata.url}
							defaultLabel={`${row.wallet.metadata.displayName} website`}
							color="text.primary"
						/>
						|
						{row.wallet.metadata.repoUrl === null ? null : (
							<ExternalLink
								url={row.wallet.metadata.repoUrl}
								defaultLabel="GitHub"
								color="text.primary"
							/>
						)}
					</Typography>
				</div>
			) : null}
		</div>
	);
}
