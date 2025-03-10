// Constants
import { betaSiteRoot } from '@/constants';

// Layouts
import Layout from '../layouts/Layout.astro';

// Components
import { IconLink } from '@/ui/atoms/IconLink';
import WalletTable from '@/ui/organisms/WalletTable';

import { Box, Typography } from '@mui/material';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import ForumIcon from '@mui/icons-material/Forum';
import FoundationIcon from '@mui/icons-material/Foundation';
import GitHubIcon from '@mui/icons-material/GitHub';
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout';
import { navigationAbout } from '@/components/navigation';
import { LuWallet } from 'react-icons/lu';
import type { FC } from 'react';

export const HomePage: FC = () => {
	// hi

	return (
		<NavigationPageLayout
			groups={[
				{
					id: 'home',
					items: [
						{
							title: 'Summary',
							href: '/',
							id: 'summary',
							icon: '',
						},
					],
					overflow: false,
				},
				{
					id: 'wallets',
					items: [
						{
							title: 'Wallets',
							href: '/',
							icon: LuWallet,
							children: [
								{
									title: 'Coinbase Wallet',
									href: '/coinbase',
								},
							],
						},
					],
					overflow: false,
				},
				{
					id: 'about',
					items: [navigationAbout],
					overflow: false,
				},
			]}
		>
			<Box
				minHeight="100vh"
				maxWidth="100vw"
				display="flex"
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				px={2}
			>
				<Typography
					variant="h1"
					fontWeight={600}
					mt={1}
					maxWidth="90vw"
					style={{
						wordBreak: 'break-word',
					}}>Walletbeat</Typography
				>
				<Typography
					variant="caption"
					sx={{
						fontStyle: 'italic',
						opacity: 0.75,
						wordBreak: 'break-word',
					}}
					maxWidth="90vw">Who watches the wallets?</Typography
				>
				<Typography variant="caption" mt={1} maxWidth="90vw">
					Beta version; work in progress. Get in touch on Farcaster or GitHub if you wish to
					contribute.
				</Typography>
				<Box display="flex" flexDirection="row" alignItems="center" mt={1} mb={1}>
					<Typography component="div" variant="caption">
						<IconLink href={`${betaSiteRoot}/faq`} IconComponent={HelpCenterIcon}>
							Frequently asked questions
						</IconLink>
					</Typography>
					<Typography component="div" minWidth="1.5rem" textAlign="center" variant="caption">
						|
					</Typography>
					<Typography component="div" variant="caption">
						<IconLink href={`${betaSiteRoot}/about`} IconComponent={FoundationIcon}>
							About Walletbeat
						</IconLink>
					</Typography>
					<Typography component="div" minWidth="1.5rem" textAlign="center" variant="caption">
						|
					</Typography>
					<Typography component="div" variant="caption">
						<IconLink
							href="https://github.com/fluidkey/walletbeat"
							target="_blank"
							IconComponent={GitHubIcon}
						>
							Contribute on GitHub
						</IconLink>
					</Typography>
					<Typography component="div" minWidth="1.5rem" textAlign="center" variant="caption">
						|
					</Typography>
					<Typography component="div" variant="caption">
						<IconLink
							href="https://warpcast.com/~/channel/walletbeat"
							target="_blank"
							IconComponent={ForumIcon}
						>
							Discuss on Farcaster
						</IconLink>
					</Typography>
				</Box>
				<WalletTable />
			</Box>
		</NavigationPageLayout>
	);
};
