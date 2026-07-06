import { entityById } from '@/data/entities'
import {
	assertValidDomainToEntityIdMapping,
	type DomainMapping,
	type DomainToEntityIdMapping,
	type ResolvedDomain,
} from '@/schema/entity-domains'

import rawData from './entity-domains.json'

let domainToEntityIdMapping = assertValidDomainToEntityIdMapping(rawData)

/**
 * Replace the module-level mapping used by `domainMappingForDomain` and
 * `entitiesForDomain`, which is otherwise loaded from entity-domains.json at
 * import time. Called whenever entity-domains.json is overwritten (by the
 * `mark-domain` / `mark-domain-update` CLI subcommands), and by tests with
 * synthetic mappings.
 */
export function updateDomainMapping(mapping: DomainToEntityIdMapping): void {
	domainToEntityIdMapping = mapping
}

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
