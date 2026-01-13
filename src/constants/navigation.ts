// Types
export type NavigationItem = {
	id: string
	title: string
	icon?: string
	href?: string
	children?: NavigationItem[]
}

// Icons
import AppWindowIcon from 'lucide-static/icons/app-window.svg?raw'
import BadgeCheckIcon from 'lucide-static/icons/badge-check.svg?raw'
import BuildingIcon from 'lucide-static/icons/building-2.svg?raw'
import ChartBarIcon from 'lucide-static/icons/chart-bar.svg?raw'
import ChartPieIcon from 'lucide-static/icons/chart-pie.svg?raw'
import HelpCircleIcon from 'lucide-static/icons/circle-help.svg?raw'
import CpuIcon from 'lucide-static/icons/cpu.svg?raw'
import FlaskConical from 'lucide-static/icons/flask-conical.svg?raw'
import GithubIcon from 'lucide-static/icons/github.svg?raw'
import KeyIcon from 'lucide-static/icons/key.svg?raw'
import MessageCircleIcon from 'lucide-static/icons/message-circle-heart.svg?raw'
import NewsPaperIcon from 'lucide-static/icons/newspaper.svg?raw'
import WalletIcon from 'lucide-static/icons/wallet.svg?raw'

// Constants
import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { representativeWalletForType } from '@/data/wallets'
import { mapNonExemptAttributeGroupsInTree } from '@/schema/attribute-groups'
import { WalletType } from '@/schema/wallet-types'

// Constants
export const navigationHome = {
	id: 'home',
	title: 'Wallets',
	href: '/',
	icon: WalletIcon,
} as const satisfies NavigationItem

export const navigationFaq = {
	id: 'faq',
	icon: HelpCircleIcon,
	title: 'FAQ',
	href: '/faq/',
} as const satisfies NavigationItem

export const navigationAbout = {
	id: 'about',
	icon: BuildingIcon,
	title: 'About Walletbeat',
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
	icon: GithubIcon,
	title: 'Contribute on GitHub',
	href: 'https://github.com/walletbeat/walletbeat',
} as const satisfies NavigationItem

export const navigationTesting = {
	id: 'testing-page',
	icon: FlaskConical,
	title: 'Test your wallet',
	href: '/test',
} as const satisfies NavigationItem
export const navigationFarcasterChannel = {
	id: 'farcaster-channel',
	icon: MessageCircleIcon,
	title: 'Discuss on Farcaster',
	href: 'https://farcaster.xyz/~/channel/walletbeat',
} as const satisfies NavigationItem

export const navigationNews = {
	id: 'news',
	icon: NewsPaperIcon,
	title: 'Wallet Security News',
	href: '/news',
} as const satisfies NavigationItem

export const defaultNavigationItems = [
	// {
	// 	...navigationHome,
	// 	children: [
	{
		id: 'software-wallets',
		title: 'Software Wallets',
		href: '/wallet/summary/',
		icon: AppWindowIcon,
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
					href: `/${key}/`,
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
		icon: KeyIcon,
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
					href: `/${key}/`,
					icon: `<img src="/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}" alt="" />`,
				})),
			},
		],
	},
	{
		id: 'embedded-wallets',
		title: 'Embedded Wallets',
		href: '/embedded/summary/',
		icon: CpuIcon,
		children: [
			{
				id: 'embedded-by-rating',
				title: 'By Rating',
				icon: ChartPieIcon,
				children: [
					...mapNonExemptAttributeGroupsInTree(
						representativeWalletForType(WalletType.EMBEDDED).overall,
						attrGroup => ({
							id: `embedded-${attrGroup.id}`,
							title: attrGroup.displayName,
							icon: attrGroup.icon,
							href: `/embedded/${attrGroup.id}/`,
						}),
					),
				],
			},
		],
	},
	// 	],
	// },
	navigationNews,
	navigationAbout,
	navigationFaq,
	navigationRepository,
	navigationTesting,
	navigationFarcasterChannel,
] as const satisfies NavigationItem[]
