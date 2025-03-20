// Components
import WalletTable from '@/ui/organisms/WalletTable'

import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import { navigationAbout, navigationCriteria } from '@/components/navigation'
import { LuWallet, LuKey } from 'react-icons/lu'
import type { FC } from 'react'
import { wallets } from '@/data/wallets'
import { hardwareWallets } from '@/data/hardware-wallets'

// Type-safe object key access
type WalletsKey = keyof typeof wallets
type HardwareWalletsKey = keyof typeof hardwareWallets

export const HomePage: FC = () => (
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
						id: 'wallets-nav',
						children: Object.keys(wallets).map(key => {
							// Using type-safe keys
							const safeKey = key as WalletsKey
							const wallet = wallets[safeKey]

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
							// Using type-safe keys
							const safeKey = key as HardwareWalletsKey
							const wallet = hardwareWallets[safeKey]

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
				<div className="px-8 py-6 flex justify-between items-center flex-wrap min-h-96 relative">
					<div className="flex flex-col gap-2 py-8 flex-1">
						<h1 className="text-5xl font-extrabold text-accent">Who watches the wallets?</h1>
						<p className="text-secondary">
							Alpha version; work in progress. For content contributions, please see{' '}
							<a
								href="https://github.com/fluidkey/walletbeat"
								target="_blank"
								rel="noreferrer"
								className="text-accent underline"
							>
								GitHub
							</a>
							.
						</p>
					</div>
					<div className="flex-1 flex justify-center items-center">
						<img src="robot.png" alt="Walletbeat Robot" className="h-80 w-auto object-contain" />
					</div>
				</div>
			</div>

			<div className="w-full flex flex-col gap-2 p-4 md:p-8">
				<WalletTable />
			</div>
		</div>
	</NavigationPageLayout>
)
