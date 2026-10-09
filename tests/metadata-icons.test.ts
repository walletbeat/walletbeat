import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import type { Entity } from '@/schema/entity'
import { getRepositoryRoot } from '@/utils/codebase'

/**
 * Every module under `data/entities/`.
 *
 * `allEntities` in `data/entities.ts` only lists a subset of entities, so we
 * glob the directory to cover all of them.
 */
const entityModules: Record<string, Record<string, unknown>> = import.meta.glob(
	'/data/entities/*.ts',
	{ eager: true },
)

/** Type predicate for values exported from entity modules. */
function isEntity(value: unknown): value is Entity {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'icon' in value &&
		'legalName' in value
	)
}

/** All entities exported from `data/entities/*.ts`. */
const entities: Entity[] = Object.values(entityModules).flatMap(module =>
	Object.values(module).filter(isEntity),
)

/** Width and height of the image at the given repository-relative path. */
async function imageSize(repoPath: string): Promise<{ width: number; height: number }> {
	const { width, height } = await sharp(path.join(getRepositoryRoot(), repoPath)).metadata()

	return { width, height }
}

describe('entity icons', () => {
	it('finds entities', () => {
		expect(entities.length).toBeGreaterThan(0)
	})

	for (const entity of entities) {
		const { icon } = entity

		if (icon === 'NO_ICON') {
			continue
		}

		const iconPath = `public/images/entities/${entity.id}.${icon.extension}`

		describe(entity.name, () => {
			it(`has an icon file at ${iconPath}`, () => {
				expect(fs.existsSync(path.join(getRepositoryRoot(), iconPath))).toBe(true)
			})

			if (icon.extension === 'svg') {
				it('has an icon with a valid size', async () => {
					const { width, height } = await imageSize(iconPath)

					expect(width).toBeGreaterThan(0)
					expect(height).toBeGreaterThan(0)
				})
			} else {
				it(`has an icon whose size matches the declared ${icon.width}x${icon.height}`, async () => {
					expect(await imageSize(iconPath)).toEqual({ width: icon.width, height: icon.height })
				})
			}
		})
	}
})

describe('wallet icons', () => {
	for (const wallet of Object.values(allWallets)) {
		const iconPath = `public/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`

		it(`has a valid icon size for ${wallet.metadata.displayName}`, async () => {
			const { width, height } = await imageSize(iconPath)

			expect(width).toBeGreaterThan(0)
			expect(height).toBeGreaterThan(0)
		})
	}
})
