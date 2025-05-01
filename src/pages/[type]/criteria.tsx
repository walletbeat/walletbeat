import type React from 'react'
import { LuKey, LuWallet } from 'react-icons/lu'

import { navigationAbout } from '@/components/navigation'
import { unratedHardwareWallet } from '@/data/hardware-wallets'
import { unratedSoftwareWallet } from '@/data/software-wallets'
import { representativeWalletForType } from '@/data/wallets'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import { getAttributeGroupById, mapNonExemptAttributeGroupsInTree } from '@/schema/attribute-groups'
import type { WalletType } from '@/schema/wallet-types'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'
import type { NavigationGroup } from '@/ui/organisms/Navigation'

export const walletNavigationGroups: NavigationGroup[] = [
	{
		id: 'wallets',
		items: [
			{
				title: 'Wallets',
				icon: <LuWallet />,
				href: '/wallet',
				id: 'wallets',
				children: mapNonExemptAttributeGroupsInTree(unratedSoftwareWallet.overall, attr => ({
					title: attr.displayName,
					href: `/wallet/${attr.id}`,
					id: attr.id,
				})),
			},
		],
		overflow: false,
	},
	{
		id: 'hww',
		items: [
			{
				title: 'Hardware Wallets',
				icon: <LuKey />,
				href: '/hww',
				id: 'hww',
				children: mapNonExemptAttributeGroupsInTree(unratedHardwareWallet.overall, attr => ({
					title: attr.displayName,
					href: `/hww/${attr.id}`,
					id: attr.id,
				})),
			},
		],
		overflow: false,
	},
]

export function CriteriaPage({
	walletType,
	attrGroupId,
}: {
	walletType: WalletType
	attrGroupId: string
}): React.JSX.Element {
	const attrGroup = getAttributeGroupById(
		attrGroupId,
		representativeWalletForType(walletType).overall,
	)
	if (attrGroup === null) {
		throw new Error('Invalid attribute group')
	}
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
				...walletNavigationGroups,
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
							<h1 className="text-4xl font-extrabold text-accent">{attrGroup.displayName}</h1>
							<p className="text-secondary">
								<RenderTypographicContent
									content={attrGroup.perWalletQuestion.render({
										displayName: 'your wallet',
									})}
									typography={{
										variant: 'caption',
										fontStyle: 'italic',
									}}
								/>
							</p>
							{Object.values(attrGroup.attributes).map(attr => (
								<div key={attr.id}>
									<h2>{attr.displayName}</h2>
									<p>{attr.id}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	)
}
