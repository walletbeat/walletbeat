import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * Build-time helpers that are safe to import into static Astro pages.
 *
 * This module is intentionally kept free of Node-only side effects so that
 * it can be imported into `.astro` files, unlike `codebase.ts`.
 */

/**
 * Marker files that identify a directory as the repository root.
 */
const REPOSITORY_ROOT_MARKERS = ['astro.config.mjs', 'astro.config.js', 'astro.config.ts']

/**
 * Get the repository root as resolved during an Astro build.
 */
export function getAstroBuildTimeRepositoryRoot(): string {
	let currentDir = resolve(process.cwd())

	while (true) {
		if (REPOSITORY_ROOT_MARKERS.some(marker => existsSync(resolve(currentDir, marker)))) {
			return currentDir
		}

		const parentDir = dirname(currentDir)

		if (parentDir === currentDir) {
			throw new Error(
				`Could not locate the repository root (no ${REPOSITORY_ROOT_MARKERS.join(', ')} found) from ${process.cwd()}`,
			)
		}

		currentDir = parentDir
	}
}
