import type { FC } from 'react'
import { LuGithub } from 'react-icons/lu'

import { walletNavigationGroups } from '@/components/CriteriaPage'
import { navigationAbout } from '@/components/navigation'
import { repositoryUrl } from '@/constants'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import { ExternalLink } from '@/ui/atoms/ExternalLink'
import WalletTable from '@/ui/organisms/WalletTable'

export const HomePage: FC<{ selectedGroupId?: string }> = ({ selectedGroupId }) => (
	<NavigationPageLayout
		groups={[
			// {
			// 	id: 'home',
			// 	items: [
			// 		{
			// 			title: 'Summary',
			// 			href: '/#summary',
			// 			id: 'summary',
			// 			icon: undefined,
			// 		},
			// 	],
			// 	overflow: false,
			// },
			...walletNavigationGroups,
			{
				id: 'about',
				items: [navigationAbout],
				overflow: false,
			},
		]}
		selectedGroupId={selectedGroupId}
		selectedItemId={'summary'}
	>
		<div className='max-w-screen-xl 3xl:max-w-screen-2xl mx-auto w-full'>
			<div className='flex flex-col lg:mt-10 gap-4'>
				<div className='px-8 py-6 flex justify-between items-start flex-wrap min-h-96 relative flex-col md:flex-row'>
					<div className='flex flex-col gap-4 py-8 flex-1'>
						<div className='flex gap-2'>
							<div className='bg-primary border px-2 py-1 rounded-md hover:bg-primary'>
								<div className='flex flex-row gap-2 items-center' key='repo'>
									<LuGithub />
									<ExternalLink
										url={repositoryUrl}
										defaultLabel='GitHub Repository'
										style={{
											fontWeight: 500,
											color: 'var(--text-primary)',
											fontSize: '0.9rem',
										}}
									/>
								</div>
							</div>
						</div>
						<h1 className='text-4xl font-extrabold text-accent'>Who watches the wallets?</h1>
						<p className='text-secondary'>
							This website is still in beta. It aims to provide a comprehensive list of wallets,
							their functionality, practices, and support for certain standards.
						</p>
						<p className='text-secondary'>
							We welcome contributions via the{' '}
							<ExternalLink
								url={repositoryUrl}
								defaultLabel='GitHub Repository'
								style={{
									fontWeight: 500,
									color: 'var(--text-primary)',
									fontSize: '0.9rem',
								}}
							/>
							.
						</p>
					</div>
					<div className='flex-1 flex justify-center items-center'>
						<img src='/robot.png' alt='Walletbeat Robot' className='h-80 w-auto object-contain' />
					</div>
				</div>
			</div>

			<div className='w-full flex flex-col gap-2 p-4 md:p-8'>
				<div className='text-2xl font-bold text-accent' id='summary'>
					Summary
				</div>
				<WalletTable />
			</div>
		</div>
	</NavigationPageLayout>
)
