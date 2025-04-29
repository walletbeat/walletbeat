import type { FC } from 'react'
import { LuKey, LuWallet } from 'react-icons/lu'

import { navigationAbout, navigationCriteria } from '@/components/navigation'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import { getAttributeGroupById, getValidAttributeGroups } from '@/schema/attribute-groups'
import type { WalletMetadata } from '@/schema/wallet'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'

export const CriteriaPage: FC<{
	criteria: string
}> = ({ criteria }) => {
	const criteriaData = getAttributeGroupById(criteria)
	return (
		<NavigationPageLayout
			groups={[
				{
					id: 'home',
					items: [
						{
							title: 'Summary',
							href: '/#summary',
							id: 'summary',
							icon: undefined,
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
							id: 'wallets',
							children: getValidAttributeGroups(false).map(attr => ({
								title: attr.displayName,
								href: `/criteria/hardware/${attr.id}`,
								id: attr.id,
							})),
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
							children: getValidAttributeGroups(true).map(attr => ({
								title: attr.displayName,
								href: `/criteria/hardware/${attr.id}`,
								id: attr.id,
							})),
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
			<div className="max-w-screen-xl 3xl:max-w-screen-2xl mx-auto w-full">
				<div className="flex flex-col lg:mt-10 mt-24 gap-4">
					<div className="px-8 py-6 flex justify-between items-start flex-wrap min-h-96 relative">
						<div className="flex flex-col gap-4 py-8 flex-1">
							{criteriaData != null && (
								<>
									<h1 className="text-4xl font-extrabold text-accent">
										{criteriaData.icon}
										{criteriaData.displayName}
									</h1>
									<p className="text-secondary">
										<RenderTypographicContent
											// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- We only need a subset of WalletMetadata
											content={criteriaData.perWalletQuestion.render({
												displayName: 'your wallet',
											} as WalletMetadata)}
											typography={{
												variant: 'caption',
												fontStyle: 'italic',
											}}
										/>
									</p>
								</>
							)}
						</div>
						<div className="flex-1 flex justify-center items-center">
							<img src="/robot.png" alt="Walletbeat Robot" className="h-80 w-auto object-contain" />
						</div>
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	)
}
