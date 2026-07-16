// Types
import type { WBIconID } from '@/styles/wbicons'

export type LucideNavigationIcon =
	| 'ICON_CHART_BAR'
	| 'ICON_FARCASTER'
	| 'ICON_CHART_PIE'
	| 'ICON_TWITTER'
	| 'ICON_WALLET'

export type WalletImageNavigationIcon = `ICON_WALLET_IMG:${string}`

export type NavigationIconID = WBIconID | LucideNavigationIcon | WalletImageNavigationIcon

export type NavigationItem = {
	id: string
	title: string
	icon?: NavigationIconID
	iconVariant?: 'emoji'
	accentColor?: string | null
	href?: string
	sliceStyle?: {
		totalAngle: number
		midAngle: number
		offset: number
		gap: number
		outerR: number
		innerR: number
		outerCornerRadius: number
		innerCornerRadius: number
		labelSize: number
	}
	children?: NavigationItem[]
}

function walletImageIcon(id: string, ext: string): WalletImageNavigationIcon {
	return `ICON_WALLET_IMG:/images/wallets/${id}.${ext}`
}

// Constants
import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { representativeWalletForType } from '@/data/wallets'
import { mapNonExemptAttributeGroupsInTree } from '@/schema/attribute-groups'
import { attributeTree } from '@/schema/attribute-tree'
import { WalletType } from '@/schema/wallet-types'
import { getWalletUrl } from '@/utils/wallet-url'

export const navigationFaq = {
	id: 'faq',
	icon: 'faq',
	title: 'FAQ',
	href: '/faq/',
} as const satisfies NavigationItem

export const navigationAbout = {
	id: 'about',
	icon: 'about',
	title: 'About',
	href: '/about/',
} as const satisfies NavigationItem

export const navigationRepository = {
	id: 'code-repository',
	icon: 'repository',
	title: 'GitHub',
	href: 'https://github.com/walletbeat/walletbeat',
} as const satisfies NavigationItem

export const navigationTwitter = {
	id: 'twitter',
	icon: 'ICON_TWITTER',
	title: 'X/Twitter',
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

export const topbarNavigationItems = [
	navigationAbout,
	navigationFaq,
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
				id: 'eip-7702-tracker',
				title: 'EIP-7702 Tracker',
				href: '/wallet/7702/',
				icon: 'ICON_CHART_BAR',
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
		],
	},
	{
		id: 'embedded-wallets',
		title: 'Embedded Wallets',
		href: '/embedded/summary/',
		icon: 'wallet_embedded',
		children: [
			{
				id: 'embedded-by-rating',
				title: 'By Rating',
				icon: 'ICON_CHART_PIE',
				children: mapNonExemptAttributeGroupsInTree(
					attributeTree,
					representativeWalletForType(WalletType.EMBEDDED).overall,
					(attrGroup, _evalGroup) => ({
						id: `embedded-${attrGroup.id}`,
						title: attrGroup.displayName,
						icon: attrGroup.icon,
						iconVariant: 'emoji' as const,
						href: `/embedded/${attrGroup.id}/`,
					}),
				),
			},
		],
	},
	navigationNews,
	navigationWalletEips,
	navigationTesting,
] as const satisfies NavigationItem[]
