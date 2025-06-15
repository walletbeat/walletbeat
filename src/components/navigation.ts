// Types/constants
export type NavigationItem = {
	id: string
	title: string
	icon?: string
	href?: string
	children?: NavigationItem[]
	defaultIsCollapsed?: boolean
}


// Images
import HomeIcon from 'lucide-static/icons/house.svg?raw'
import HelpCircleIcon from 'lucide-static/icons/circle-help.svg?raw'
import BuildingIcon from 'lucide-static/icons/building-2.svg?raw'
import BadgeCheckIcon from 'lucide-static/icons/badge-check.svg?raw'
import GithubIcon from 'lucide-static/icons/github.svg?raw'
import MessageCircleIcon from 'lucide-static/icons/message-circle.svg?raw'


export const navigationHome: NavigationItem = {
	id: 'wallet-table',
	icon: HomeIcon,
	title: 'Walletbeat',
	href: '/#',
}

export const navigationFaq: NavigationItem = {
	id: 'faq',
	icon: HelpCircleIcon,
	title: 'FAQ',
	href: '/faq',
}

export const navigationAbout: NavigationItem = {
	id: 'about',
	icon: BuildingIcon,
	title: 'About Walletbeat',
	href: '/about',
}

export const navigationCriteria: NavigationItem = {
	id: 'criteria',
	icon: BadgeCheckIcon,
	title: 'Evaluation Criteria',
	href: '/#criteria',
}

export const navigationRepository: NavigationItem = {
	id: 'code-repository',
	icon: GithubIcon,
	title: 'Contribute on GitHub',
	href: 'https://github.com/walletbeat/walletbeat',
}

export const navigationFarcasterChannel: NavigationItem = {
	id: 'farcaster-channel',
	icon: MessageCircleIcon,
	title: 'Discuss on Farcaster',
	href: 'https://farcaster.xyz/~/channel/walletbeat',
}
