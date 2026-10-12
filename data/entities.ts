import { ackee } from '@/data/entities/ackee'
import { alphabet } from '@/data/entities/alphabet'
import { ambireEntity } from '@/data/entities/ambire'
import { apple } from '@/data/entities/apple'
import { citrea } from '@/data/entities/citrea'
import { cloudflare } from '@/data/entities/cloudflare'
import { coingecko } from '@/data/entities/coingecko'
import { deBank } from '@/data/entities/debank'
import { hyperFoundation } from '@/data/entities/hyper-foundation'
import { lifi } from '@/data/entities/lifi'
import { monad } from '@/data/entities/monad'
import { pimlico } from '@/data/entities/pimlico'
import { sentry } from '@/data/entities/sentry'
import { socket } from '@/data/entities/socket'
import { sonicLabs } from '@/data/entities/sonic-labs'
import { uniswapLabs } from '@/data/entities/uniswap-labs'
import { walletbeat } from '@/data/entities/walletbeat'
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
	citrea,
	cloudflare,
	coingecko,
	debank: deBank,
	hyperFoundation,
	lifi,
	monad,
	pimlico,
	sentry,
	socket,
	sonicLabs,
	uniswapLabs,
	walletbeat,
}

/** A valid Entity ID. */
export type EntityId = keyof typeof allEntities

/** Type predicate for EntityId. */
export function isValidEntityId(entityId: string): entityId is EntityId {
	return Object.prototype.hasOwnProperty.call(allEntities, entityId)
}

/** Assert that the given string is an entity ID. */
export function assertValidEntityId(entityId: string): EntityId {
	if (!isValidEntityId(entityId)) {
		throw new Error(`invalid entity ID: "${entityId}"`)
	}

	return entityId
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
