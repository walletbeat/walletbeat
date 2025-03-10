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
import { navigationAbout, navigationCriteria } from '@/components/navigation';
import { LuWallet } from 'react-icons/lu';
import type { FC } from 'react';
import { wallets } from '@/data/wallets';
import type { Wallet } from '@/schema/wallet';

export const HomePage: FC = () =>
// hi

(
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
						icon: <LuWallet />,
						href: '/',
						children: Object.keys(wallets).map((key) => {
							const wallet = wallets[key as keyof typeof wallets] as Wallet;

							return {
								title: wallet.metadata.displayName,
								href: `/${key}`,
								id: key,
								icon: <img src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`} className="size-4" />,
							}
						}),

					}
				],
				overflow: false,
			},
			{
				id: 'criteria',
				items: [navigationCriteria],
				overflow: false,
			},
			{
				id: 'about',
				items: [navigationAbout],
				overflow: false,
			},
		]}
	>
		<div
			className="flex flex-col mt-10 gap-4"
		>
			<div>
				<div className="w-full px-8 text-inverse bg-accent py-2 text-center">
					Wallets listed on this page are not official endoresements, and are provided for informational purposes only.
				</div>
				<div className="bg-gradient-to-r from-[var(--banner-gradient-from)] to-[var(--banner-gradient-to)] px-8 py-4 flex justify-between items-center">
					<div className="flex flex-col gap-2 py-8">
						<div className="text-sm text-secondary">HOME / WALLETS / <span>FIND WALLET</span></div>
						<h1 className="text-3xl font-bold">Who watches the wallets?</h1>
						<p>Alpha version; work in progress. For content contributions, please see <a href="https://github.com/fluidkey/walletbeat" className="link" target="_blank" rel="noreferrer">GitHub</a>.</p>
					</div>
					<div>
						<img src="/banner.png" className="h-full" />
					</div>
				</div>
			</div>

			<WalletTable />
		</div>
	</NavigationPageLayout>
)
	;
