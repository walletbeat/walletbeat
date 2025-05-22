import type React from 'react';
import { LuCpu, LuKey, LuWallet } from 'react-icons/lu';

import { navigationAbout } from '@/components/navigation';
import { allRatedWallets, representativeWalletForType } from '@/data/wallets';
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout';
import {
	getAttributeGroupById,
	getAttributeGroupInTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups';
import type { RatedWallet } from '@/schema/wallet';
import { mapWalletTypes, WalletType, walletTypeToUrlSlug } from '@/schema/wallet-types';
import { RenderContent } from '@/ui/atoms/RenderContent';
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent';
import type { NavigationGroup } from '@/ui/organisms/Navigation';

export const walletNavigationGroups: NavigationGroup[] = Object.values(
	mapWalletTypes(
		(walletType: WalletType): NavigationGroup => ({
			id: walletTypeToUrlSlug(walletType),
			items: [
				{
					title: ((): string => {
						switch (walletType) {
							case WalletType.SOFTWARE:
								return 'Wallets';
							case WalletType.HARDWARE:
								return 'Hardware Wallets';
							case WalletType.EMBEDDED:
								return 'Embedded Wallets';
						}
					})(),
					icon: ((): React.ReactNode => {
						switch (walletType) {
							case WalletType.SOFTWARE:
								return <LuWallet />;
							case WalletType.HARDWARE:
								return <LuKey />;
							case WalletType.EMBEDDED:
								return <LuCpu />;
						}
					})(),
					href: `/${walletTypeToUrlSlug(walletType)}`,
					id: `${walletTypeToUrlSlug(walletType)}s`,
					children: [
						{
							title: 'Summary',
							id: `summary`,
							href: `/${walletTypeToUrlSlug(walletType)}/summary`,
						},
						...mapNonExemptAttributeGroupsInTree(
							representativeWalletForType(walletType).overall,
							attr => ({
								title: attr.displayName,
								href: `/${walletTypeToUrlSlug(walletType)}/${attr.id}`,
								id: attr.id,
							}),
						),
					],
				},
			],
			overflow: false,
		}),
	),
);

export function getStaticPathsForWalletType(walletType: WalletType) {
	return (): Array<{ params: { attrGroupId: string } }> =>
		mapNonExemptAttributeGroupsInTree(
			representativeWalletForType(walletType).overall,
			attrGroup => ({
				params: {
					attrGroupId: attrGroup.id,
				},
			}),
		);
}

export function CriteriaPage({
	walletType,
	attrGroupId,
}: {
	walletType: WalletType;
	attrGroupId: string;
}): React.JSX.Element {
	const representativeWallet = representativeWalletForType(walletType);
	const attrGroup = getAttributeGroupById(attrGroupId, representativeWallet.overall);
	if (attrGroup === null) {
		throw new Error('Invalid attribute group');
	}
	const evalGroup = getAttributeGroupInTree(representativeWallet.overall, attrGroup);
	const wallets = Object.values(allRatedWallets).filter(wallet => {
		if (wallet.types[walletType]) {
			return true;
		}
		return false;
	});

	return (
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
			selectedItemId={attrGroupId}
			// wallets, hww, embedded
			selectedGroupId={walletTypeToUrlSlug(walletType).toLowerCase().replace('s', '')}
		>
			<div className="max-w-screen-xl 3xl:max-w-screen-2xl mx-auto w-full">
				<div className="flex flex-col lg:mt-10 gap-4">
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
							<AttributeGroupSummary wallets={wallets} />
							{mapNonExemptGroupAttributes(evalGroup, evalAttr => (
								<div key={evalAttr.attribute.id} className="space-y-2">
									<h2 className="text-2xl font-extrabold text-accent">
										{evalAttr.attribute.displayName}
									</h2>
									<div className="card">
										<RenderContent
											content={evalAttr.attribute.why.render({})}
											typography={{ variant: 'body2' }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	);
}

export const AttributeGroupSummary = ({
	wallets,
}: {
	wallets: RatedWallet[];
}): React.JSX.Element => (
	<div className="whitespace-pre-wrap">
		Attribute group summary
		<div>{wallets.map(wallet => wallet.metadata.displayName)}</div>
	</div>
);
