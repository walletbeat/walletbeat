// Types
export interface NavigationLinkItem {
	id: string
	title: string
	icon: string
	href: string
	children?: NavigationLinkItem[]
}


// Images
import HomeIcon from 'lucide-static/icons/house.svg?raw'
import HelpCircleIcon from 'lucide-static/icons/circle-help.svg?raw'
import BuildingIcon from 'lucide-static/icons/building-2.svg?raw'
import BadgeCheckIcon from 'lucide-static/icons/badge-check.svg?raw'
import GithubIcon from 'lucide-static/icons/github.svg?raw'
import MessageCircleIcon from 'lucide-static/icons/message-circle.svg?raw'


export const navigationHome: NavigationLinkItem = {
	id: 'wallet-table',
	icon: HomeIcon,
	title: 'Walletbeat',
	href: '/#',
}

export const navigationFaq: NavigationLinkItem = {
	id: 'faq',
	icon: HelpCircleIcon,
	title: 'FAQ',
	href: '/faq',
}

export const navigationAbout: NavigationLinkItem = {
	id: 'about',
	icon: BuildingIcon,
	title: 'About Walletbeat',
	href: '/about',
}

export const navigationCriteria: NavigationLinkItem = {
	id: 'criteria',
	icon: BadgeCheckIcon,
	title: 'Evaluation Criteria',
	href: '/#criteria',
}

export const navigationRepository: NavigationLinkItem = {
	id: 'code-repository',
	icon: GithubIcon,
	title: 'Contribute on GitHub',
	href: 'https://github.com/walletbeat/walletbeat',
}

export const navigationFarcasterChannel: NavigationLinkItem = {
	id: 'farcaster-channel',
	icon: MessageCircleIcon,
	title: 'Discuss on Farcaster',
	href: 'https://farcaster.xyz/~/channel/walletbeat',
}
