import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { hasSingleVariant, type Variant } from '@/schema/variants'
import { sourceSnapshot } from '@/tests/browser/fixtures/source-snapshot.mjs'
import { nativeWalletRenderer } from '@/tests/utils/native-wallet-content'
import { contentWallets } from '@/tests/utils/wallet-page-content'
import { attributeDetailSnapshots } from '@/tests/utils/wallet-report-content'
import { getRepositoryRoot } from '@/utils/codebase'

it('generates canonical selected wallet detail expectations', async () => {
	const source = await sourceSnapshot()
	const details: Record<string, string> = {}

	for (const wallet of contentWallets) {
		const renderNative = await nativeWalletRenderer(wallet)
		const variants: (Variant | null)[] = [
			null,
			...(!hasSingleVariant(wallet.variants) ? Object.keys(wallet.variants) : []),
		]

		for (const variant of variants) {
			const snapshots = attributeDetailSnapshots(
				renderNative(variant ? wallet.variants[variant]!.attributes : wallet.overall),
			)

			expect(Object.keys(snapshots).length).toBeGreaterThan(0)

			for (const [id, value] of Object.entries(snapshots)) {
				details[`${wallet.metadata.id}/${variant ?? 'ALL'}/${id}`] = value
			}
		}
	}
	expect(await sourceSnapshot()).toEqual(source)
	const path =
		process.env.WALLET_PAGE_DETAIL_EXPECTATIONS ??
		join(getRepositoryRoot(), '.astro', 'wallet-content-details.json')

	mkdirSync(dirname(path), { recursive: true })
	const staging = `${path}.${process.pid}.tmp`

	writeFileSync(staging, JSON.stringify({ source, details }))
	renameSync(staging, path)
})
