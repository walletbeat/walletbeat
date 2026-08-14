import { describe, expect, it } from 'vitest'

import { coinspectMapping } from '@/data/coinspect/mapping'
import reportsSnapshot from '@/data/coinspect/reports-snapshot.json'
import { allWallets, isValidWalletName } from '@/data/wallets'
import {
	COINSPECT_PLATFORM_TO_VARIANT,
	type CoinspectMapping,
	type CoinspectPlatform,
	CoinspectUnmappedReason,
} from '@/schema/data-sources/coinspect'
import { variantLabel } from '@/schema/variants'

const unmappedReasons = new Set<string>(Object.values(CoinspectUnmappedReason))
const mappingByWalletMakerId: Readonly<Record<string, CoinspectMapping>> = coinspectMapping

function isCoinspectPlatform(platform: string): platform is CoinspectPlatform {
	return Object.prototype.hasOwnProperty.call(COINSPECT_PLATFORM_TO_VARIANT, platform)
}

describe('coinspect mapping', () => {
	for (const entry of reportsSnapshot) {
		const { walletMakerUID, platform } = entry

		describe(`${walletMakerUID} / ${platform}`, () => {
			it('has a mapping entry (mapped or explicit null)', () => {
				expect(
					mappingByWalletMakerId[walletMakerUID] !== undefined,
					`add a mapping (or explicit null) for "${walletMakerUID}"`,
				).toBe(true)
			})

			it('uses a known Coinspect platform', () => {
				expect(
					isCoinspectPlatform(platform),
					`add "${platform}" to COINSPECT_PLATFORM_TO_VARIANT`,
				).toBe(true)
			})

			it('maps to a Walletbeat variant the target wallet has', () => {
				const mapping = mappingByWalletMakerId[walletMakerUID]

				if (mapping === undefined || !isCoinspectPlatform(platform)) {
					return
				}

				if (mapping.walletbeatId === null) {
					return
				}

				const skipped = mapping.skipPlatforms ?? []

				if (skipped.includes(platform)) {
					return
				}

				const variant = COINSPECT_PLATFORM_TO_VARIANT[platform]
				const wallet = allWallets[mapping.walletbeatId]

				expect(
					wallet.variants[variant] === true,
					`"${mapping.walletbeatId}" has no ${variantLabel(variant)} variant, but Coinspect ships ${walletMakerUID}-${platform}`,
				).toBe(true)
			})
		})
	}

	it('uses only valid walletbeatIds', () => {
		for (const [walletMakerUID, mapping] of Object.entries(coinspectMapping)) {
			if (mapping.walletbeatId === null) {
				continue
			}

			expect(
				isValidWalletName(mapping.walletbeatId),
				`"${walletMakerUID}" maps to invalid walletbeatId "${mapping.walletbeatId}"`,
			).toBe(true)
		}
	})

	it('gives every null entry a valid unmapped reason', () => {
		for (const [walletMakerUID, mapping] of Object.entries(coinspectMapping)) {
			if (mapping.walletbeatId !== null) {
				continue
			}

			expect(
				unmappedReasons.has(mapping.reason),
				`"${walletMakerUID}" has invalid reason "${mapping.reason}"`,
			).toBe(true)
		}
	})

	it('does not map two walletMakerUIDs to the same walletbeatId', () => {
		const seen = new Map<string, string>()

		for (const [walletMakerUID, mapping] of Object.entries(coinspectMapping)) {
			if (mapping.walletbeatId === null) {
				continue
			}

			const previous = seen.get(mapping.walletbeatId)

			expect(
				previous,
				`both "${previous}" and "${walletMakerUID}" map to walletbeatId "${mapping.walletbeatId}"`,
			).toBeUndefined()
			seen.set(mapping.walletbeatId, walletMakerUID)
		}
	})

	it('has no orphan mapping keys absent from the snapshot', () => {
		const snapshotWalletMakerIds = new Set(reportsSnapshot.map(entry => entry.walletMakerUID))

		for (const walletMakerUID of Object.keys(coinspectMapping)) {
			expect(
				snapshotWalletMakerIds.has(walletMakerUID),
				`orphan mapping key "${walletMakerUID}" does not appear in reports-snapshot.json`,
			).toBe(true)
		}
	})
})
