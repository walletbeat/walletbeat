// Types
export type NavigationItem = {
	id: string
	title: string
	icon?: string
	href?: string
	children?: NavigationItem[]
}

// Icons
import BadgeCheckIcon from 'lucide-static/icons/badge-check.svg?raw'
import ChartBarIcon from 'lucide-static/icons/chart-bar.svg?raw'
import ChartPieIcon from 'lucide-static/icons/chart-pie.svg?raw'
import WalletIcon from 'lucide-static/icons/wallet.svg?raw'

// Constants
import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { representativeWalletForType } from '@/data/wallets'
import { mapNonExemptAttributeGroupsInTree } from '@/schema/attribute-groups'
import { WalletType } from '@/schema/wallet-types'
import { getWalletUrl } from '@/utils/wallet-url'

// Constants
export const navigationHome = {
	id: 'home',
	title: 'Wallets',
	href: '/',
	icon: WalletIcon,
} as const satisfies NavigationItem

export const navigationFaq = {
	id: 'faq',
	icon: 'faq',
	title: 'faq',
	href: '/faq/',
} as const satisfies NavigationItem

export const navigationAbout = {
	id: 'about',
	icon: 'about',
	title: 'about',
	href: '/about/',
} as const satisfies NavigationItem

export const navigationCriteria = {
	id: 'criteria',
	icon: BadgeCheckIcon,
	title: 'Evaluation Criteria',
	href: '/#criteria',
} as const satisfies NavigationItem

export const navigationRepository = {
	id: 'code-repository',
	icon: 'repository',
	title: 'code',
	href: 'https://github.com/walletbeat/walletbeat',
} as const satisfies NavigationItem

export const navigationTesting = {
	id: 'testing-page',
	icon: 'wallet_test',
	title: 'Test your wallet',
	href: '/test',
} as const satisfies NavigationItem
export const navigationFarcasterChannel = {
	id: 'farcaster-channel',
	icon: 'discuss',
	title: 'farcaster',
	href: 'https://farcaster.xyz/~/channel/walletbeat',
} as const satisfies NavigationItem

export const navigationNews = {
	id: 'news',
	icon: 'newsletter',
	title: 'Wallet Security News',
	href: '/news',
} as const satisfies NavigationItem

export const topbarNavigationItems = [
	navigationAbout,
	navigationFaq,
	navigationRepository,
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
				icon: ChartPieIcon,
				children: mapNonExemptAttributeGroupsInTree(
					representativeWalletForType(WalletType.SOFTWARE).overall,
					attrGroup => ({
						id: `software-${attrGroup.id}`,
						title: attrGroup.displayName,
						icon: attrGroup.icon,
						href: `/wallet/${attrGroup.id}/`,
					}),
				),
			},
			{
				id: 'software-by-wallet',
				title: 'By Wallet',
				icon: WalletIcon,
				children: Object.entries(softwareWallets).map(([key, wallet]) => ({
					id: key,
					title: wallet.metadata.displayName,
					href: getWalletUrl(wallet),
					icon: `<img src="/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}" alt="" />`,
				})),
			},
			{
				id: 'eip-7702-tracker',
				title: 'EIP-7702 Tracker',
				href: '/wallet/7702/',
				icon: ChartBarIcon,
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
				icon: ChartPieIcon,
				children: [
					...mapNonExemptAttributeGroupsInTree(
						representativeWalletForType(WalletType.HARDWARE).overall,
						attrGroup => ({
							id: `hardware-${attrGroup.id}`,
							title: attrGroup.displayName,
							icon: attrGroup.icon,
							href: `/hww/${attrGroup.id}/`,
						}),
					),
				],
			},
			{
				id: 'hardware-by-wallet',
				title: 'By Wallet',
				icon: WalletIcon,
				children: Object.entries(hardwareWallets).map(([key, wallet]) => ({
					id: key,
					title: wallet.metadata.displayName.replace(' Wallet', ''),
					href: getWalletUrl(wallet),
					icon: `<img src="/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}" alt="" />`,
				})),
			},
		],
	},
	navigationNews,
	navigationTesting,
] as const satisfies NavigationItem[]
