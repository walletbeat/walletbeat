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
import { LuWallet, LuKey } from 'react-icons/lu';
import type { FC } from 'react';
import { wallets } from '@/data/wallets';
import { hardwareWallets } from '@/data/hardwareWallets';
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
				id: 'hardware-wallets',
				items: [
					{
						title: 'Hardware Wallets',
						icon: <LuKey />,
						href: '/',
						id: 'hardware-wallets',
						children: Object.keys(hardwareWallets).map((key) => {
							const wallet = hardwareWallets[key as keyof typeof hardwareWallets] as Wallet;
							
							// Simplified display names for hardware wallets
							let displayName = wallet.metadata.displayName;
							if (key === 'ledger') displayName = 'Ledger';
							if (key === 'trezor') displayName = 'Trezor';
							if (key === 'gridplus') displayName = 'Grid Plus';
							if (key === 'keystone') displayName = 'Keystone';

							return {
								title: displayName,
								href: `/${key}`,
								id: key,
								icon: <img src={`/images/hardware-wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`} className="size-4" />,
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
				<div className="bg-gradient-to-r from-[var(--banner-gradient-from)] to-[var(--banner-gradient-to)] px-8 py-4 flex justify-between items-center flex-wrap">
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

			<div className="w-full flex flex-col gap-2">
				<h2 className="font-bold">Find a wallet that suits you</h2>
				<div className="flex gap-4 w-full flex-wrap xl:flex-nowrap flex-col xl:flex-row">
					{
						[
							{
								title: '🤷‍♀️ New to Crypto',
								description: 'First time user looking for beginner wallet.',
								id: 'beginner',
							},
							{
								title: '📊 Finance',
								description: 'Looking for a wallet for your crypto portfolio.',
							},
							{
								title: '🛠️ Developer',
								description: 'Looking for a wallet for your crypto portfolio.',
							},
						].map((item) => (
							<div key={item.id} className="flex flex-col gap-2 card flex-1">
								<h3 className="font-bold text-accent">{item.title}</h3>
								<div className="text-secondary">{item.description}</div>
							</div>
						))
					}
				</div>
			</div>

			<div className="w-full flex flex-col gap-2">
				<h2 className="font-bold">Explore all the wallets</h2>
				<WalletTable />
			</div>

		</div>
	</NavigationPageLayout>
);
