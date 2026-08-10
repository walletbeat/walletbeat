import { ackee } from '@/data/entities/ackee'
import { alphabet } from '@/data/entities/alphabet'
import { ambireEntity } from '@/data/entities/ambire'
import { apple } from '@/data/entities/apple'
import { chainidNetwork } from '@/data/entities/chainidNetwork'
import { citrea } from '@/data/entities/citrea'
import { cloudflare } from '@/data/entities/cloudflare'
import { consensys } from '@/data/entities/consensys'
import { contentful } from '@/data/entities/contentful'
import { deBank } from '@/data/entities/debank'
import { fastly } from '@/data/entities/fastly'
import { fourByteDirectory } from '@/data/entities/fourByteDirectory'
import { github } from '@/data/entities/github'
import { hyperFoundation } from '@/data/entities/hyper-foundation'
import { megaeth } from '@/data/entities/megaeth'
import { merkl } from '@/data/entities/merkl'
import { monad } from '@/data/entities/monad'
import { quicknode } from '@/data/entities/quicknode'
import { sentry } from '@/data/entities/sentry'
import { sonicLabs } from '@/data/entities/sonic-labs'
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
	chainidNetwork,
	citrea,
	cloudflare,
	consensys,
	contentful,
	debank: deBank,
	fastly,
	fourByteDirectory,
	github,
	hyperFoundation,
	megaeth,
	merkl,
	monad,
	quicknode,
	sentry,
	sonicLabs,
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
