import { entityById, type EntityId, isValidEntityId } from '@/data/entities'
import type { Entity } from '@/schema/entity'

import rawData from './entity-domains.json'

/** Type for entity-domains.json */
export type DomainToEntityIdMapping = Record<string, EntityId>

/** Type predicate for DomainToEntityIdMapping. */
export function isValidDomainToEntityMapping(data: unknown): data is DomainToEntityIdMapping {
	if (typeof data !== 'object' || data === null) {
		return false
	}

	for (const [key, val] of Object.entries(data)) {
		if (
			typeof key !== 'string' ||
			key === '' ||
			typeof val !== 'string' ||
			val === '' ||
			!isValidEntityId(val)
		) {
			return false
		}
	}

	return true
}

export function assertValidDomainToEntityIdMapping(data: unknown): DomainToEntityIdMapping {
	if (!isValidDomainToEntityMapping(data)) {
		throw new Error('invalid/malformed data in entity-domains.json')
	}

	return data
}

const domainToEntityIdMapping = assertValidDomainToEntityIdMapping(rawData)

function assertEntityId(entityId: string): EntityId {
	if (!isValidEntityId(entityId)) {
		throw new Error(
			`Unknown entity ID \`${entityId}\` in \`entity-domain.json\`; if you've added it, make sure it is also listed in \`/data/entities.ts\` → \`allEntities\`.`,
		)
	}

	return entityId
}

/**
 * Look up the entity ID associated with a domain.
 */
function entityIdForDomain(domain: string): EntityId | null {
	if (Object.hasOwn(domainToEntityIdMapping, domain)) {
		return domainToEntityIdMapping[domain]
	}

	for (const d of Object.keys(domainToEntityIdMapping)) {
		if (domain.endsWith('.' + d)) {
			return assertEntityId(domainToEntityIdMapping[d])
		}
	}

	return null
}

/**
 * Look up the entity associated with a domain.
 *
 * @param domain The domain to look up. Subdomains are OK.
 * @returns The Entity the domain is associated with, or `null` if the domain is not associated.
 */
export function entityForDomain(domain: string): Entity | null {
	const entityId = entityIdForDomain(domain)

	if (entityId === null) {
		return null
	}

	const entity = entityById(entityId)

	if (entity === null) {
		throw new Error(`Unknown entity ID \`${entityId}\` in \`entity-domain.json\``)
	}

	return entity
}
