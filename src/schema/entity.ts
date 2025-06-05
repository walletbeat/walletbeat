import { type DomainUrl, isUrl, markdownUrlLink, type Url } from './url'

export enum EntityType {
	chainDataProvider = 'chainDataProvider',
	corporate = 'corporate',
	dataBroker = 'dataBroker',
	exchange = 'exchange',
	offchainDataProvider = 'offchainDataProvider',
	transactionBroadcastProvider = 'transactionBroadcastProvider',
	walletDeveloper = 'walletDeveloper',
	securityAuditor = 'securityAuditor',
}

/**
 * An entity, typically corporate.
 *
 * `Ts` is a set of entity types that the entity must have.
 */
export interface Entity<Ts extends EntityType[] = []> {
	/** The ID of the entity. */
	id: string

	/** The name of the entity. */
	name: string

	/**
	 * Legal name of the entity, if any.
	 *
	 * `soundsDifferent` indicates whether the legal name sounds significantly
	 * different from `name`, such that most people may not be able to tell that
	 * these names refer to the same entity.
	 */
	legalName: { name: string; soundsDifferent: boolean } | 'NOT_A_LEGAL_ENTITY'

	/* Type(s) of the entity. */
	type: {
		[K in EntityType]: K extends Ts[number] ? true : boolean
	}

	/**
	 * The entity's icon, if any.
	 * If specified, there must exist an icon file at
	 * `/public/images/entities/${id}.${icon.extension}`.
	 */
	icon:
		| 'NO_ICON'
		| {
				extension: 'png'
				width: number
				height: number
		  }
		| { extension: 'svg' }

	/**
	 * Website of the entity.
	 */
	url: Url | { type: 'NO_WEBSITE' }

	/**
	 * Repository URL of the entity (like GitHub).
	 */
	repoUrl: DomainUrl<'github.com' | 'bitbucket.org' | 'radicle.xyz'> | { type: 'NO_REPO' }

	/**
	 * The jurisdiction in which the entity is located.
	 *
	 * 'GLOBAL' should be used when an entity exists in such a manner that
	 * no single jurisdiction has singular control over it.
	 */
	jurisdiction: string | { type: 'GLOBAL' | 'UNKNOWN' }

	/**
	 * The privacy policy URL of the entity.
	 */
	privacyPolicy: Url | { type: 'NO_PRIVACY_POLICY' }

	/** The Crunchbase URL of the entity, if any. */
	crunchbase: DomainUrl<'crunchbase.com'> | { type: 'NO_CRUNCHBASE_URL' }

	/** The LinkedIn URL of the entity, if any. */
	linkedin: DomainUrl<'linkedin.com'> | { type: 'NO_LINKEDIN_URL' }

	/** The Twitter/X URL of the entity, if any. */
	twitter: DomainUrl<'x.com'> | { type: 'NO_TWITTER_URL' }

	/** The Farcaster profile name of the entity, as a Warpcast URL, if any. */
	farcaster: DomainUrl<'warpcast.com'> | { type: 'NO_FARCASTER_PROFILE' }
}

type EntityWithType<T extends EntityType> = Entity & Entity<[T]>

export type ChainDataProvider = EntityWithType<EntityType.chainDataProvider>
export type CorporateEntity = EntityWithType<EntityType.corporate>
export type DataBroker = EntityWithType<EntityType.dataBroker>
export type Exchange = EntityWithType<EntityType.exchange>
export type OffchainDataProvider = EntityWithType<EntityType.offchainDataProvider>
export type TransactionBroadcastProvider = EntityWithType<EntityType.transactionBroadcastProvider>
export type SecurityAuditor = EntityWithType<EntityType.securityAuditor>
export type WalletDeveloper = EntityWithType<EntityType.walletDeveloper>

/**
 * A Markdown link to an Entity.
 */
export function entityMarkdownLink(entity: Entity): string {
	const url = entityUrl(entity)

	if (url === null) {
		return `**${entity.name}**`
	}

	return markdownUrlLink(url, { forceLabel: entity.name, bold: true })
}

/**
 * Returns the most relevant URL associated with an entity.
 */
export function entityUrl(entity: Entity): Url | null {
	for (const maybeUrl of [
		entity.url,
		entity.repoUrl,
		entity.twitter,
		entity.farcaster,
		entity.crunchbase,
		entity.linkedin,
	]) {
		if (isUrl(maybeUrl)) {
			return maybeUrl
		}
	}

	return null
}
