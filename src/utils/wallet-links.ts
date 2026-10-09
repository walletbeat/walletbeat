import type { Entity } from '@/schema/entity'
import { entityUrl } from '@/schema/entity'
import { getDomain, getUrlLabel, isLabeledUrl, type Url } from '@/schema/url'
import type { RatedWallet, WalletMetadata } from '@/schema/wallet'

/** One external link in the wallet page's Links menu. */
export interface WalletLink {
	/** What the link is ("Website", "App Store", ...). */
	label: string

	/** Where the link goes, shown as a secondary hint (domain or `org/repo`). */
	hint: string

	/** Absolute URL. */
	url: string
}

/** A titled section of the Links menu. */
export interface WalletLinkGroup {
	id: 'wallet' | 'download' | 'developer' | 'social'
	label: string
	links: WalletLink[]
}

/** Social platforms, in display order. */
const socialLabels: Record<string, string> = {
	x: 'X',
	farcaster: 'Farcaster',
	discord: 'Discord',
	telegram: 'Telegram',
	youtube: 'YouTube',
	reddit: 'Reddit',
	linkedin: 'LinkedIn',
	instagram: 'Instagram',
	tiktok: 'TikTok',
	facebook: 'Facebook',
}

/** Compare URLs loosely, so `https://www.example.com/` and `https://example.com` count as one link. */
function urlKey(url: string): string {
	const parsed = new URL(url)

	return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`
}

function toLink(url: Url, label: string): WalletLink | null {
	const href = isLabeledUrl(url) ? url.url : url

	if (!URL.canParse(href) || !/^https?:$/.test(new URL(href).protocol)) {
		return null
	}

	const linkLabel = isLabeledUrl(url) ? url.label : label
	const hint = isLabeledUrl(url) ? getDomain(url) : getUrlLabel(href)

	return {
		label: linkLabel,
		hint: hint === linkLabel ? getDomain(href) : hint,
		url: href,
	}
}

/**
 * The wallet's developer, as declared by contributors affiliated with it.
 * Contributors only declare an affiliation with the company behind the wallet
 * they contribute to, so the first walletDeveloper affiliation is that company.
 */
function walletDeveloper(metadata: WalletMetadata): Entity | null {
	for (const contributor of metadata.contributors) {
		if (contributor.affiliation === 'NO_AFFILIATION') {
			continue
		}

		for (const { developer } of contributor.affiliation) {
			if (developer.type.walletDeveloper) {
				return developer
			}
		}
	}

	return null
}

/**
 * Collect the external links for a wallet (website, source code, app stores,
 * privacy policy, developer, socials), grouped for the wallet page's Links
 * menu. Duplicate URLs keep their first occurrence; empty groups are dropped.
 */
export function getWalletLinkGroups<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
): WalletLinkGroup[] {
	const urls = wallet.metadata.urls
	const seen = new Set<string>()

	type Entry = readonly [Url | null | undefined, string]

	const each = (list: Url[] | undefined, label: string): Entry[] =>
		(list ?? []).map(url => [url, label] as const)

	const collect = (entries: Entry[]): WalletLink[] =>
		entries.flatMap(([url, label]) => {
			const link = url === null || url === undefined ? null : toLink(url, label)

			if (link === null || seen.has(urlKey(link.url))) {
				return []
			}

			seen.add(urlKey(link.url))

			return [link]
		})

	const privacyPolicies = Object.values(wallet.variants).map(
		resolved => resolved?.features.privacy.privacyPolicy,
	)
	const developer = walletDeveloper(wallet.metadata)
	const developerName =
		developer === null || developer.legalName === 'NOT_A_LEGAL_ENTITY'
			? developer?.name
			: developer.legalName.name

	const groups: WalletLinkGroup[] = [
		{
			id: 'wallet',
			label: 'Wallet',
			links: collect([
				...each(urls?.websites, 'Website'),
				...each(urls?.webapps, 'Web app'),
				...each(urls?.docs, 'Documentation'),
				...each(urls?.repositories, 'Source code'),
				...each(urls?.others, 'Other'),
			]),
		},
		{
			id: 'download',
			label: 'Download',
			links: collect([
				...each(urls?.extensions, 'Chrome Web Store'),
				[urls?.playstore, 'Google Play'],
				[urls?.appstore, 'App Store'],
			]),
		},
		{
			id: 'developer',
			label: 'Developer',
			links: collect([
				[developer === null ? null : entityUrl(developer), developerName ?? 'Developer'],
				...privacyPolicies.map(url => [url, 'Privacy policy'] as const),
			]),
		},
		{
			id: 'social',
			label: 'Social',
			links: collect(
				Object.entries(socialLabels).map(([platform, label]) => [urls?.socials?.[platform], label]),
			),
		},
	]

	return groups.filter(group => group.links.length > 0)
}
