import { ackee } from '@/data/entities/ackee'
import { alphabet } from '@/data/entities/alphabet'
import { ambireEntity } from '@/data/entities/ambire'
import { apple } from '@/data/entities/apple'
import type { Entity } from '@/schema/entity'

/**
 * Set of all entities.
 * If you add an Entity, also add it here by ID.
 */
export const allEntities = {
	ackee,
	alphabet,
	ambire: ambireEntity,
	apple,
}

/** A valid Entity ID. */
export type EntityId = keyof typeof allEntities

/** Type predicate for EntityId. */
export function isValidEntityId(entityId: string): entityId is EntityId {
	return Object.prototype.hasOwnProperty.call(allEntities, entityId)
}

/**
 * Look up an entity by ID.
 */
export function entityById(entityId: EntityId): Entity {
	const entity = allEntities[entityId]

	if (entity.id !== entityId) {
		throw new Error(`Mismatching entity ID: ${entity.id} != ${entityId}`)
	}

	return entity
}
