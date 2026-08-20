import { describe, expect, it } from 'vitest'

import reportsSnapshot from '@/data/coinspect/reports-snapshot.json'
import { allWallets } from '@/data/wallets'

/**
 * Coinspect `walletMakerUID`s that Walletbeat does not track.
 * When Coinspect adds a wallet, either set `coinspectId` on the matching
 * Walletbeat wallet, or add the ID here after confirming it has no match.
 */
const knownUnmappedCoinspect: ReadonlySet<string> = new Set([
	'1inch',
	'alpha-wallet',
	'binance',
	'brave',
	'coin-98',
	'coin-wallet',
	'ctrl-wallet',
	'enkrypt',
	'exodus',
	'fox',
	'mew-wallet',
	'okto',
	// Walletbeat tracks OneKey Pro (hardware), not the OneKey software wallet Coinspect rates.
	'one-key',
	'token-pocket',
	'tomo',
	'trust-wallet',
	'unstoppable-wallet',
	'zengo',
])

const snapshotIds = new Set(reportsSnapshot.map(entry => entry.walletMakerUID))

const walletsByCoinspectId = new Map<string, string[]>()

for (const wallet of Object.values(allWallets)) {
	const coinspectId = wallet.metadata.coinspectId

	if (typeof coinspectId !== 'string') {
		continue
	}

	const existing = walletsByCoinspectId.get(coinspectId)

	if (existing === undefined) {
		walletsByCoinspectId.set(coinspectId, [wallet.metadata.id])
	} else {
		existing.push(wallet.metadata.id)
	}
}

describe('coinspect mapping', () => {
	// Coinspect added a wallet we have not tracked yet: it is neither mapped
	// on a Walletbeat wallet nor listed in knownUnmappedCoinspect.
	it('has a WalletBeat mapping or known-unmapped entry for every Coinspect wallet', () => {
		const unmapped: string[] = []

		for (const walletMakerUID of snapshotIds) {
			if (knownUnmappedCoinspect.has(walletMakerUID) || walletsByCoinspectId.has(walletMakerUID)) {
				continue
			}

			unmapped.push(walletMakerUID)
		}

		unmapped.sort()
		expect(
			unmapped,
			`add coinspectId to a Walletbeat wallet, or add these IDs to knownUnmappedCoinspect: ${unmapped.join(', ')}`,
		).toEqual([])
	})

	// A Walletbeat wallet's coinspectId is also in knownUnmappedCoinspect;
	// mapped and known-unmapped must be mutually exclusive.
	it('does not map a wallet to a known-unmapped Coinspect ID', () => {
		const overlapping: string[] = []

		for (const coinspectId of walletsByCoinspectId.keys()) {
			if (knownUnmappedCoinspect.has(coinspectId)) {
				overlapping.push(coinspectId)
			}
		}

		overlapping.sort()
		expect(
			overlapping,
			`remove these IDs from knownUnmappedCoinspect, or set coinspectId to { type: 'NO_COINSPECT_ID' }: ${overlapping.join(', ')}`,
		).toEqual([])
	})

	// Coinspect removed (or renamed) a wallet we listed as unmapped; that ID
	// should be dropped from knownUnmappedCoinspect.
	it('has no known-unmapped IDs absent from the snapshot', () => {
		const removed: string[] = []

		for (const walletMakerUID of knownUnmappedCoinspect) {
			if (!snapshotIds.has(walletMakerUID)) {
				removed.push(walletMakerUID)
			}
		}

		removed.sort()
		expect(
			removed,
			`remove these IDs from knownUnmappedCoinspect; they are no longer in reports-snapshot.json: ${removed.join(', ')}`,
		).toEqual([])
	})

	// Coinspect removed (or renamed) a wallet we still map via coinspectId;
	// that field should be set to { type: 'NO_COINSPECT_ID' } or updated.
	it('maps only to Coinspect IDs present in the snapshot', () => {
		const missing: string[] = []

		for (const coinspectId of walletsByCoinspectId.keys()) {
			if (!snapshotIds.has(coinspectId)) {
				missing.push(coinspectId)
			}
		}

		missing.sort()
		expect(
			missing,
			`set coinspectId to { type: 'NO_COINSPECT_ID' } or update it; these IDs are not in reports-snapshot.json: ${missing.join(', ')}`,
		).toEqual([])
	})

	// Two Walletbeat wallets claim the same Coinspect wallet-maker ID.
	it('does not map two wallets to the same coinspectId', () => {
		const duplicates: string[] = []

		for (const [coinspectId, walletIds] of walletsByCoinspectId) {
			if (walletIds.length > 1) {
				duplicates.push(`${coinspectId} (${walletIds.join(', ')})`)
			}
		}

		duplicates.sort()
		expect(duplicates, `duplicate coinspectId mappings: ${duplicates.join('; ')}`).toEqual([])
	})
})
