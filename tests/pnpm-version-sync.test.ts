import fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from './utils/codebase'

interface PnpmLocation {
	section: string
	version: string
}

function findPnpmInPackageJson(): {
	packageManagerVersion: string
	pnpmEntries: PnpmLocation[]
} {
	const raw = fs.readFileSync(path.join(getRepositoryRoot(), 'package.json'), {
		encoding: 'utf-8',
	})
	const entries = Object.entries(JSON.parse(raw))

	// Extract packageManager
	let packageManagerVersion: string | undefined

	for (const [k, v] of entries) {
		if (k === 'packageManager' && typeof v === 'string') {
			packageManagerVersion = v
		}
	}

	if (packageManagerVersion === undefined) {
		throw new Error('package.json is missing a packageManager field')
	}

	const pmMatch = packageManagerVersion.match(/^pnpm@([\d.]+)/)

	if (pmMatch === null) {
		throw new Error(`packageManager "${packageManagerVersion}" does not specify a pnpm version`)
	}

	packageManagerVersion = pmMatch[1]

	// Extract pnpm from all dependency sections
	const pnpmEntries: PnpmLocation[] = []
	const depSections = ['dependencies', 'devDependencies']

	for (const section of depSections) {
		for (const [k, v] of entries) {
			if (k === section && typeof v === 'object' && v !== null) {
				const sectionEntries = Object.entries(v)

				for (const [dep, depVer] of sectionEntries) {
					if (dep === 'pnpm' && typeof depVer === 'string') {
						pnpmEntries.push({ section, version: depVer })
					}
				}
			}
		}
	}

	return { packageManagerVersion, pnpmEntries }
}

describe('pnpm version sync', () => {
	const { packageManagerVersion, pnpmEntries } = findPnpmInPackageJson()

	it('at least one pnpm dependency entry exists', () => {
		expect(pnpmEntries.length).toBeGreaterThan(0)
	})

	it('all pnpm dependency entries agree with each other', () => {
		const versions = pnpmEntries.map(e => e.version)
		const uniqueVersions = new Set(versions)

		expect(
			uniqueVersions.size,
			`pnpm appears in multiple dependency sections with different versions: ${pnpmEntries.map(e => `${e.section}: ${e.version}`).join(', ')}`,
		).toBe(1)
	})

	it('all pnpm dependency entries match packageManager', () => {
		for (const entry of pnpmEntries) {
			expect(entry.version, `${entry.section}.pnpm must match packageManager version`).toBe(
				packageManagerVersion,
			)
		}
	})
})
