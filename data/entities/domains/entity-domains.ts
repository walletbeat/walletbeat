import { entityById, type EntityId, isValidEntityId } from '@/data/entities'
import type { Entity } from '@/schema/entity'
import { isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'

import rawData from './entity-domains.json'

/**
 * The value type for a single domain in entity-domains.json.
 *
 * There is exactly one unambiguous way to represent each mapping:
 * - A bare `EntityId` string when the domain has a sole operator and no
 *   intermediaries.
 * - An object with `operator` and a non-empty `intermediaries` list when
 *   one or more intermediaries (e.g. a TLS-terminating CDN) also see the
 *   request data on its way to the operator.
 */
/* eslint-disable sort-keys-custom-order/type-keys -- `operator` is deliberately listed first */
export type DomainMapping =
	| EntityId
	| {
			/** The intended recipient of the request data (data controller). */
			operator: EntityId

			/**
			 * Entities that see the request data in transit without being its
			 * intended recipient, e.g. TLS-terminating CDNs.
			 * Must be non-empty (use the bare `EntityId` form otherwise), free of
			 * duplicates, sorted alphabetically, and must not contain `operator`.
			 */
			intermediaries: NonEmptyArray<EntityId>
	  }
/* eslint-enable sort-keys-custom-order/type-keys */

/** Type for entity-domains.json */
export type DomainToEntityIdMapping = Record<string, DomainMapping>

function assertValidDomainMapping(domain: string, val: unknown): DomainMapping {
	const invalid = (reason: string): Error =>
		new Error(`entity-domains.json: invalid mapping for domain '${domain}': ${reason}`)

	if (typeof val === 'string') {
		if (!isValidEntityId(val)) {
			throw invalid(
				`unknown entity ID '${val}'; if you've added it, make sure it is also listed in \`/data/entities.ts\` → \`allEntities\`.`,
			)
		}

		return val
	}

	if (typeof val !== 'object' || val === null || Array.isArray(val)) {
		throw invalid('must be an entity ID string or an { operator, intermediaries } object')
	}

	const keys = Object.keys(val)

	const hasExpectedKeys = (v: object): v is { intermediaries: unknown; operator: unknown } =>
		Object.hasOwn(v, 'operator') && Object.hasOwn(v, 'intermediaries')

	if (keys.toSorted().join(',') !== 'intermediaries,operator' || !hasExpectedKeys(val)) {
		throw invalid('object form must have exactly the keys `operator` and `intermediaries`')
	}

	const { intermediaries, operator } = val

	if (typeof operator !== 'string' || !isValidEntityId(operator)) {
		throw invalid(`unknown operator entity ID '${String(operator)}'`)
	}

	if (!Array.isArray(intermediaries) || !intermediaries.every(i => typeof i === 'string')) {
		throw invalid('`intermediaries` must be an array of entity ID strings')
	}

	const intermediaryIds = intermediaries.map(i => {
		if (!isValidEntityId(i)) {
			throw invalid(`unknown intermediary entity ID '${i}'`)
		}

		return i
	})

	if (!isNonEmptyArray(intermediaryIds)) {
		throw invalid(
			'`intermediaries` must be non-empty; use the bare entity ID string form for domains without intermediaries',
		)
	}

	if (new Set(intermediaryIds).size !== intermediaryIds.length) {
		throw invalid('`intermediaries` must not contain duplicates')
	}

	if (intermediaryIds.some((id, i) => i > 0 && id < intermediaryIds[i - 1])) {
		throw invalid('`intermediaries` must be sorted alphabetically')
	}

	if (intermediaryIds.some(id => id === operator)) {
		throw invalid(`operator '${operator}' must not also be listed in \`intermediaries\``)
	}

	return { intermediaries: intermediaryIds, operator }
}

export function assertValidDomainToEntityIdMapping(data: unknown): DomainToEntityIdMapping {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		throw new Error('invalid/malformed data in entity-domains.json')
	}

	const mapping: DomainToEntityIdMapping = {}

	for (const [domain, val] of Object.entries(data)) {
		if (domain === '') {
			throw new Error('entity-domains.json: empty domain key')
		}

		mapping[domain] = assertValidDomainMapping(domain, val)
	}

	return mapping
}

let domainToEntityIdMapping = assertValidDomainToEntityIdMapping(rawData)

/**
 * Replace the module-level mapping used by `domainMappingForDomain` and
 * `entitiesForDomain`, which is otherwise loaded from entity-domains.json at
 * import time. The `mark-domain` / `mark-domain-update` CLI subcommands call
 * this after reading the working copy of the file they edit; tests call it
 * with synthetic mappings.
 */
export function updateDomainMapping(mapping: DomainToEntityIdMapping): void {
	domainToEntityIdMapping = mapping
}

/**
 * The set of entities that see the data sent to a domain.
 */
/* eslint-disable sort-keys-custom-order/type-keys -- `operator` is deliberately listed first */
export interface ResolvedDomain {
	/** The intended recipient of the request data (data controller). */
	operator: Entity

	/**
	 * Entities that see the request data in transit without being its
	 * intended recipient, e.g. TLS-terminating CDNs. Possibly empty.
	 */
	intermediaries: Entity[]
}
/* eslint-enable sort-keys-custom-order/type-keys */

/**
 * Look up the domain mapping for a domain.
 * Exact matches take precedence over parent-domain (suffix) matches, so a
 * CDN-fronted subdomain can carry intermediaries without asserting them for
 * the whole apex domain.
 */
export function domainMappingForDomain(domain: string): DomainMapping | null {
	if (Object.hasOwn(domainToEntityIdMapping, domain)) {
		return domainToEntityIdMapping[domain]
	}

	// Prefer the longest (most specific) matching parent domain, so that
	// e.g. an intermediary recorded on `sub.example.com` also applies to
	// `deep.sub.example.com` even when `example.com` is mapped too.
	let bestMatch: string | null = null

	for (const d of Object.keys(domainToEntityIdMapping)) {
		if (domain.endsWith('.' + d) && (bestMatch === null || d.length > bestMatch.length)) {
			bestMatch = d
		}
	}

	return bestMatch === null ? null : domainToEntityIdMapping[bestMatch]
}

/**
 * Look up all entities that see the data sent to a domain.
 *
 * @param domain The domain to look up. Subdomains are OK.
 * @returns The operator and intermediaries the domain is associated with,
 *          or `null` if the domain is not associated with any entity.
 */
export function entitiesForDomain(domain: string): ResolvedDomain | null {
	const domainMapping = domainMappingForDomain(domain)

	if (domainMapping === null) {
		return null
	}

	if (typeof domainMapping === 'string') {
		return { intermediaries: [], operator: entityById(domainMapping) }
	}

	return {
		intermediaries: domainMapping.intermediaries.map(entityById),
		operator: entityById(domainMapping.operator),
	}
}
