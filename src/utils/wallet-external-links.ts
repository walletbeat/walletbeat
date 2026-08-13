import { allEntities, isValidEntityId } from '@/data/entities'
import { type Entity, entityUrl } from '@/schema/entity'
import { getUrl, getUrlLabel, isLabeledUrl, isUrl, labeledUrl, type Url } from '@/schema/url'
import type { RatedWallet, WalletMetadata } from '@/schema/wallet'

export type WalletExternalLink = {
	/** Display label for the link. */
	label: string
	/** Absolute URL. */
	url: string
}

function pushUnique(
	links: WalletExternalLink[],
	seen: Set<string>,
	url: Url | null | undefined,
	label: string,
): void {
	if (url === null || url === undefined) {
		return
	}

	const href = getUrl(url)

	if (seen.has(href)) {
		return
	}

	seen.add(href)
	links.push({ label, url: href })
}

function pushUrlList(
	links: WalletExternalLink[],
	seen: Set<string>,
	urls: Url[] | undefined,
	singularLabel: string,
): void {
	if (urls === undefined || urls.length === 0) {
		return
	}

	if (urls.length === 1) {
		const only = urls[0]
		const label = isLabeledUrl(only) ? only.label : singularLabel

		pushUnique(links, seen, only, label)

		return
	}

	for (const url of urls) {
		pushUnique(links, seen, url, isLabeledUrl(url) ? url.label : getUrlLabel(url))
	}
}

function walletDeveloperEntity(metadata: WalletMetadata): Entity | null {
	for (const contributor of metadata.contributors) {
		if (contributor.affiliation === 'NO_AFFILIATION') {
			continue
		}

		for (const affiliation of contributor.affiliation) {
			if (affiliation.developer.type.walletDeveloper) {
				return affiliation.developer
			}
		}
	}

	if (isValidEntityId(metadata.id)) {
		const entity = allEntities[metadata.id]

		if (entity.type.walletDeveloper) {
			return entity
		}
	}

	return null
}

function privacyPolicyUrl<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
): string | null {
	for (const resolved of Object.values(wallet.variants)) {
		const policy = resolved?.features.privacy.privacyPolicy

		if (typeof policy === 'string' && policy.length > 0) {
			return policy
		}
	}

	const developer = walletDeveloperEntity(wallet.metadata)

	if (developer !== null && isUrl(developer.privacyPolicy)) {
		return getUrl(developer.privacyPolicy)
	}

	return null
}

/**
 * Collect external URLs related to a wallet for display in the wallet page
 * Links dropdown (website, docs, repository, stores, privacy policy, etc.).
 * Social media links are omitted.
 */
export function getWalletExternalLinks<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
): WalletExternalLink[] {
	const links: WalletExternalLink[] = []
	const seen = new Set<string>()
	const urls = wallet.metadata.urls

	if (urls !== undefined) {
		pushUrlList(links, seen, urls.websites, 'Website')
		pushUrlList(links, seen, urls.docs, 'Docs')
		pushUrlList(links, seen, urls.repositories, 'Repository')
		pushUrlList(links, seen, urls.extensions, 'Chrome Web Store')
		pushUnique(links, seen, urls.playstore, 'Google Play')
		pushUnique(links, seen, urls.appstore, 'App Store')
		pushUrlList(links, seen, urls.webapps, 'Web app')
	}

	const privacyPolicy = privacyPolicyUrl(wallet)

	if (privacyPolicy !== null) {
		pushUnique(links, seen, privacyPolicy, 'Privacy policy')
	}

	const developer = walletDeveloperEntity(wallet.metadata)

	if (developer !== null) {
		const companyUrl = entityUrl(developer)

		if (companyUrl !== null) {
			pushUnique(
				links,
				seen,
				companyUrl,
				developer.legalName === 'NOT_A_LEGAL_ENTITY' ? developer.name : developer.legalName.name,
			)
		}
	}

	if (urls?.others !== undefined) {
		for (const other of urls.others) {
			pushUnique(links, seen, other, labeledUrl(other).label)
		}
	}

	return links
}
