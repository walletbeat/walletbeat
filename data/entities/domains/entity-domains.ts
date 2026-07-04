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

	const hasExpectedKeys = (v: object): v is { operator: unknown; intermediaries: unknown } =>
		Object.hasOwn(v, 'operator') && Object.hasOwn(v, 'intermediaries')

	if (keys.toSorted().join(',') !== 'intermediaries,operator' || !hasExpectedKeys(val)) {
		throw invalid('object form must have exactly the keys `operator` and `intermediaries`')
	}

	const { operator, intermediaries } = val

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

	return { operator, intermediaries: intermediaryIds }
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

const domainToEntityIdMapping = assertValidDomainToEntityIdMapping(rawData)

/**
 * The set of entities that see the data sent to a domain.
 */
export interface ResolvedDomain {
	/** The intended recipient of the request data (data controller). */
	operator: Entity

	/**
	 * Entities that see the request data in transit without being its
	 * intended recipient, e.g. TLS-terminating CDNs. Possibly empty.
	 */
	intermediaries: Entity[]
}

/**
 * Look up the domain mapping for a domain within a given mapping.
 * Exact matches take precedence over parent-domain (suffix) matches, so a
 * CDN-fronted subdomain can carry intermediaries without asserting them for
 * the whole apex domain.
 *
 * Parameterized over `mapping` (rather than using the module-level mapping)
 * because the `mark-domain` / `mark-domain-update` CLI subcommands need to
 * resolve against the freshly-read working copy of the file they are editing,
 * which the module-level mapping (loaded at import time) may not reflect.
 * Use `entitiesForDomain` for lookups against the committed data.
 */
export function domainMappingIn(
	mapping: DomainToEntityIdMapping,
	domain: string,
): DomainMapping | null {
	if (Object.hasOwn(mapping, domain)) {
		return mapping[domain]
	}

	// Prefer the longest (most specific) matching parent domain, so that
	// e.g. an intermediary recorded on `sub.example.com` also applies to
	// `deep.sub.example.com` even when `example.com` is mapped too.
	let bestMatch: string | null = null

	for (const d of Object.keys(mapping)) {
		if (domain.endsWith('.' + d) && (bestMatch === null || d.length > bestMatch.length)) {
			bestMatch = d
		}
	}

	return bestMatch === null ? null : mapping[bestMatch]
}

/**
 * Resolve a domain mapping into entities within a given mapping.
 *
 * Parameterized over `mapping` for the same reason as `domainMappingIn`, and
 * so unit tests can exercise resolution precedence with synthetic mappings.
 */
export function entitiesForDomainIn(
	mapping: DomainToEntityIdMapping,
	domain: string,
): ResolvedDomain | null {
	const domainMapping = domainMappingIn(mapping, domain)

	if (domainMapping === null) {
		return null
	}

	if (typeof domainMapping === 'string') {
		return { operator: entityById(domainMapping), intermediaries: [] }
	}

	return {
		operator: entityById(domainMapping.operator),
		intermediaries: domainMapping.intermediaries.map(entityById),
	}
}

/**
 * Look up all entities that see the data sent to a domain.
 *
 * @param domain The domain to look up. Subdomains are OK.
 * @returns The operator and intermediaries the domain is associated with,
 *          or `null` if the domain is not associated with any entity.
 */
export function entitiesForDomain(domain: string): ResolvedDomain | null {
	return entitiesForDomainIn(domainToEntityIdMapping, domain)
}
