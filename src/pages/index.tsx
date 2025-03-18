// Constants
import { betaSiteRoot } from '@/constants'

// Layouts
import Layout from '../layouts/Layout.astro'

// Components
import { IconLink } from '@/ui/atoms/IconLink'
import WalletTable from '@/ui/organisms/WalletTable'

import { Box, Typography } from '@mui/material'
import HelpCenterIcon from '@mui/icons-material/HelpCenter'
import ForumIcon from '@mui/icons-material/Forum'
import FoundationIcon from '@mui/icons-material/Foundation'
import GitHubIcon from '@mui/icons-material/GitHub'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import { navigationAbout, navigationCriteria } from '@/components/navigation'
import { LuWallet, LuKey } from 'react-icons/lu'
import type { FC } from 'react'
import { wallets } from '@/data/wallets'
import { hardwareWallets } from '@/data/hardware-wallets'
import type { Wallet } from '@/schema/wallet'

export const HomePage: FC = () => (
	// hi

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
						children: Object.keys(wallets).map(key => {
							const wallet = wallets[key as keyof typeof wallets] as Wallet

							return {
								title: wallet.metadata.displayName,
								href: `/${key}`,
								id: key,
								icon: (
									<img
										src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
										className="size-4"
									/>
								),
							}
						}),
					},
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
						children: Object.keys(hardwareWallets).map(key => {
							const wallet = hardwareWallets[key as keyof typeof hardwareWallets] as Wallet

							// Simplified display names for hardware wallets
							let displayName = wallet.metadata.displayName
							if (key === 'ledger') {
								displayName = 'Ledger'
							}
							if (key === 'trezor') {
								displayName = 'Trezor'
							}
							if (key === 'gridplus') {
								displayName = 'Grid Plus'
							}
							if (key === 'keystone') {
								displayName = 'Keystone'
							}

							return {
								title: displayName,
								href: `/${key}`,
								id: key,
								icon: (
									<img
										src={`/images/hardware-wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
										className="size-4"
									/>
								),
							}
						}),
					},
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
		<div className="flex flex-col">
			<div>
				<div className="bg-accent px-8 py-6 flex justify-between items-center flex-wrap min-h-96 relative overflow-hidden">
					<div className="absolute inset-0 bg-black/50 z-0"></div>
					<img
						src="/hero.jpg"
						alt="Hero background"
						className="absolute inset-0 w-full h-full object-cover"
					/>
					<div className="flex flex-col gap-2 py-8 relative z-10">
						<h1 className="text-4xl font-bold text-white">Who watches the wallets?</h1>
						<p className="text-white">
							Alpha version; work in progress. For content contributions, please see{' '}
							<a
								href="https://github.com/fluidkey/walletbeat"
								target="_blank"
								rel="noreferrer"
								className="text-white underline"
							>
								GitHub
							</a>
							.
						</p>
					</div>
					{/* <div className="flex items-center">
						<img src="/banner.png" className="h-[210px] w-auto" />
					</div> */}
				</div>
			</div>

			{/* <div className="w-full flex flex-col gap-2">
				<h2 className="font-bold">Find a wallet that suits you</h2>
				<div className="flex gap-4 w-full flex-wrap xl:flex-nowrap flex-col xl:flex-row">
					{[
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
					].map(item => (
						<div key={item.id} className="flex flex-col gap-2 card flex-1">
							<h3 className="font-bold text-accent">{item.title}</h3>
							<div className="text-secondary">{item.description}</div>
						</div>
					))}
				</div>
			</div> */}

			<div className="w-full flex flex-col gap-2 p-4 md:p-8">
				{/* <h2 className="font-bold">Explore all the wallets</h2> */}
				<WalletTable />
			</div>
		</div>
	</NavigationPageLayout>
)
