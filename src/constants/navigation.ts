// Types
import type { ComputedSlice } from '@/components/pie-geometry'
import type { WBIconID } from '@/styles/wbicons'
import { type CollectionPage, collectionPages } from '@/utils/collection-utils'

export type LucideNavigationIcon =
	| 'ICON_AT_SIGN'
	| 'ICON_BELL'
	| 'ICON_BOOK_OPEN'
	| 'ICON_CHART_BAR'
	| 'ICON_EYE_OFF'
	| 'ICON_FARCASTER'
	| 'ICON_FILE_CODE'
	| 'ICON_CHART_PIE'
	| 'ICON_GLOBE'
	| 'ICON_HASH'
	| 'ICON_LAYERS'
	| 'ICON_LOG_IN'
	| 'ICON_PLUG'
	| 'ICON_RADAR'
	| 'ICON_SIGNATURE'
	| 'ICON_STAIRS'
	| 'ICON_TWITTER'
	| 'ICON_USER_COG'
	| 'ICON_WALLET'

export type WalletImageNavigationIcon = `ICON_WALLET_IMG:${string}`

export type NavigationIconID = WBIconID | LucideNavigationIcon | WalletImageNavigationIcon

export type NavigationItem = {
	id: string
	title: string
	icon?: NavigationIconID
	accentColor?: string | null
	href?: string
	sliceStyle?: ComputedSlice['computed'] & { fill?: string; labelBackground?: string }
	children?: NavigationItem[]
}

function walletImageIcon(id: string, ext: string): WalletImageNavigationIcon {
	return `ICON_WALLET_IMG:/images/wallets/${id}.${ext}`
}

// Constants
import { eips } from '@/data/eips'
import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { representativeWalletForType } from '@/data/wallets'
import { mapNonExemptAttributeGroupsInTree } from '@/schema/attribute-groups'
import { attributeTree } from '@/schema/attribute-tree'
import { eipShortLabel } from '@/schema/eips'
import { allVariantsForWalletType, WalletType } from '@/schema/wallet-types'
import { setItems } from '@/types/utils/non-empty'
import { getEipTrackerUrl, getWalletUrl } from '@/utils/urls'

/**
 * Navigation entries for the per-EIP adoption tracker pages, limited to the
 * EIPs that apply to the given wallet type.
 */
function eipTrackerNavigationItems(idPrefix: string, walletType: WalletType): NavigationItem[] {
	const variantsForType = allVariantsForWalletType(walletType)

	return Object.values(eips)
		.filter(eip => setItems(eip.appliesTo).some(v => variantsForType[v]))
		.map(eip => ({
			id: `${idPrefix}-eip-${eip.number}-tracker`,
			title: `${eipShortLabel(eip)} Tracker`,
			href: getEipTrackerUrl(eip),
			icon: eip.icon,
		}))
}

export const navigationRepository = {
	id: 'code-repository',
	icon: 'repository',
	title: 'GitHub',
	href: 'https://github.com/walletbeat/walletbeat',
} as const satisfies NavigationItem

export const navigationTwitter = {
	id: 'twitter',
	icon: 'ICON_TWITTER',
	title: 'X',
	href: 'https://x.com/walletbeat',
} as const satisfies NavigationItem

export const navigationTesting = {
	id: 'testing-page',
	icon: 'wallet_test',
	title: 'Playground',
	href: '/test/',
} as const satisfies NavigationItem

export const navigationFarcasterChannel = {
	id: 'farcaster-channel',
	icon: 'ICON_FARCASTER',
	title: 'Farcaster',
	href: 'https://farcaster.xyz/~/channel/walletbeat',
} as const satisfies NavigationItem

export const navigationNews = {
	id: 'news',
	icon: 'newsletter',
	title: 'Security News',
	href: '/news/',
} as const satisfies NavigationItem

export const navigationWalletEips = {
	id: 'wallet-eips',
	icon: 'transaction_legibility',
	title: 'Standards',
	href: '/wallet-eips/',
} as const satisfies NavigationItem

export const navigationStages = {
	id: 'stages',
	icon: 'ICON_STAIRS',
	title: 'Stages',
	href: '/stages/',
} as const satisfies NavigationItem

/**
 * Navigation entries for a collection. The collection root is always present;
 * descendant pages appear only when they opt in by declaring a
 * `shortTitle`, and attach to their nearest included ancestor.
 */
const collectionNavigationChildren = (page: CollectionPage): NavigationItem[] =>
	page.children.flatMap(child => {
		if (child.shortTitle === undefined) {
			return collectionNavigationChildren(child)
		}

		return [
			{
				id: child.href,
				title: child.shortTitle,
				href: child.href,
				icon: child.icon,
				children: collectionNavigationChildren(child),
			},
		]
	})

const collectionNavigationItem = (page: CollectionPage): NavigationItem => ({
	id: page.href,
	title: page.shortTitle ?? page.listTitle,
	href: page.href,
	icon: page.icon,
	children: collectionNavigationChildren(page),
})

export const topbarNavigationItems = [
	...collectionPages.map(collectionNavigationItem),
	navigationRepository,
	navigationTwitter,
	navigationFarcasterChannel,
] as const satisfies NavigationItem[]

export const defaultNavigationItems = [
	{
		id: 'software-wallets',
		title: 'Software Wallets',
		href: '/wallet/summary/',
		icon: 'wallet_software',
		children: [
			{
				id: 'software-by-rating',
				title: 'By Rating',
				icon: 'ICON_CHART_PIE',
				children: mapNonExemptAttributeGroupsInTree(
					attributeTree,
					representativeWalletForType(WalletType.SOFTWARE).overall,
					(attrGroup, _evalGroup) => ({
						id: `software-${attrGroup.id}`,
						title: attrGroup.displayName,
						icon: attrGroup.icon,
						iconVariant: 'emoji' as const,
						href: `/wallet/${attrGroup.id}/`,
					}),
				),
			},
			{
				id: 'software-by-wallet',
				title: 'By Wallet',
				icon: 'ICON_WALLET',
				children: Object.entries(softwareWallets).map(([key, wallet]) => ({
					id: key,
					title: wallet.metadata.displayName,
					href: getWalletUrl(wallet),
					icon: walletImageIcon(wallet.metadata.id, wallet.metadata.iconExtension),
				})),
			},
			{
				id: 'software-eip-trackers',
				title: 'EIP Trackers',
				icon: 'ICON_CHART_BAR',
				children: eipTrackerNavigationItems('software', WalletType.SOFTWARE),
			},
		],
	},
	{
		id: 'hardware-wallets',
		title: 'Hardware Wallets',
		href: '/hww/summary/',
		icon: 'wallet_hardware',
		children: [
			{
				id: 'hardware-by-rating',
				title: 'By Rating',
				icon: 'ICON_CHART_PIE',
				children: [
					...mapNonExemptAttributeGroupsInTree(
						attributeTree,
						representativeWalletForType(WalletType.HARDWARE).overall,
						(attrGroup, _evalGroup) => ({
							id: `hardware-${attrGroup.id}`,
							title: attrGroup.displayName,
							icon: attrGroup.icon,
							iconVariant: 'emoji' as const,
							href: `/hww/${attrGroup.id}/`,
						}),
					),
				],
			},
			{
				id: 'hardware-by-wallet',
				title: 'By Wallet',
				icon: 'ICON_WALLET',
				children: Object.entries(hardwareWallets).map(([key, wallet]) => ({
					id: key,
					title: wallet.metadata.displayName.replace(' Wallet', ''),
					href: getWalletUrl(wallet),
					icon: walletImageIcon(wallet.metadata.id, wallet.metadata.iconExtension),
				})),
			},
			{
				id: 'hardware-eip-trackers',
				title: 'EIP Trackers',
				icon: 'ICON_CHART_BAR',
				children: eipTrackerNavigationItems('hardware', WalletType.HARDWARE),
			},
		],
	},
	navigationStages,
	navigationNews,
	navigationWalletEips,
	navigationTesting,
] as const satisfies NavigationItem[]
