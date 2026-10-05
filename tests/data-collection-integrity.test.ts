import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { embeddedWallets } from '@/data/embedded-wallets'
import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { isValidWalletName } from '@/data/wallets'
import { getRepositoryRoot } from '@/utils/codebase'

/**
 * Map a `data/<subdir>-wallets` directory to the set of wallet registry keys it may
 * contain. A wallet's collection directory is named after its registry key as-is, so we
 * compare each entry against the keys of the matching wallet map.
 */
const dataSubdirToWalletKeys: ReadonlyArray<{
	dataSubdir: string
	walletKeys: ReadonlySet<string>
}> = [
	{
		dataSubdir: 'software-wallets',
		walletKeys: new Set(Object.keys(softwareWallets)),
	},
	{
		dataSubdir: 'hardware-wallets',
		walletKeys: new Set(Object.keys(hardwareWallets)),
	},
	{
		dataSubdir: 'embedded-wallets',
		walletKeys: new Set(Object.keys(embeddedWallets)),
	},
]

const repoRoot = getRepositoryRoot()

describe('data collection directories', () => {
	for (const { dataSubdir, walletKeys } of dataSubdirToWalletKeys) {
		const collectionDir = path.resolve(repoRoot, 'data', dataSubdir, 'collection')

		// Skip wallet types that have no collection directory yet (e.g. hardware/embedded).
		if (!fs.existsSync(collectionDir)) {
			continue
		}

		describe(dataSubdir, () => {
			it('contains only directories', () => {
				const entries = fs.readdirSync(collectionDir, { withFileTypes: true })

				for (const entry of entries) {
					expect(
						entry.isDirectory(),
						`${dataSubdir}/collection/${entry.name} is not a directory`,
					).toBe(true)
				}
			})

			it('has only directories matching defined wallet IDs', () => {
				const entries = fs.readdirSync(collectionDir, { withFileTypes: true })

				for (const entry of entries) {
					if (!entry.isDirectory()) {
						continue
					}

					expect(
						walletKeys.has(entry.name),
						`${dataSubdir}/collection/${entry.name} is not a defined ${dataSubdir} wallet`,
					).toBe(true)

					expect(isValidWalletName(entry.name), `${entry.name} is not a valid wallet name`).toBe(
						true,
					)
				}
			})
		})
	}
})
