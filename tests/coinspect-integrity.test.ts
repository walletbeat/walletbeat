import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'

import { getRepositoryRoot } from './utils/codebase'

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

const CURRENT_REPORTS_DIR = 'data/coinspect/current-reports'
const UPSTREAM_COMMIT_FILE = 'data/coinspect/upstream-commit'
const UPSTREAM_REPO = 'https://github.com/coinspect/wallet-security-ranking'
const UPSTREAM_REF = 'main'
const FULL_SHA1 = /^[0-9a-f]{40}$/

function walletMakerUIDFromReport(parsed: unknown, reportPath: string): string {
	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error(`${reportPath} is not a JSON object`)
	}

	if (!('walletMakerUID' in parsed)) {
		throw new Error(`${reportPath} is missing walletMakerUID`)
	}

	const { walletMakerUID } = parsed

	if (typeof walletMakerUID !== 'string' || walletMakerUID === '') {
		throw new Error(`${reportPath} walletMakerUID must be a non-empty string`)
	}

	return walletMakerUID
}

function coinspectIdsFromReports(): Set<string> {
	const reportsDir = path.join(getRepositoryRoot(), CURRENT_REPORTS_DIR)
	const ids = new Set<string>()

	for (const entry of fs.readdirSync(reportsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue
		}

		const reportDir = path.join(reportsDir, entry.name)

		for (const file of fs.readdirSync(reportDir, { withFileTypes: true })) {
			if (!file.isFile() || !file.name.endsWith('.json')) {
				continue
			}

			const reportPath = path.join(reportDir, file.name)
			const relativePath = path.join(CURRENT_REPORTS_DIR, entry.name, file.name)
			const parsed: unknown = JSON.parse(fs.readFileSync(reportPath, { encoding: 'utf-8' }))

			ids.add(walletMakerUIDFromReport(parsed, relativePath))
		}
	}

	if (ids.size === 0) {
		throw new Error(`No Coinspect reports found in ${CURRENT_REPORTS_DIR}/`)
	}

	return ids
}

const coinspectIds = coinspectIdsFromReports()

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
	it('has a Walletbeat mapping or known-unmapped entry for every Coinspect wallet', () => {
		const unmapped: string[] = []

		for (const walletMakerUID of coinspectIds) {
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
	it('has no known-unmapped IDs absent from current-reports', () => {
		const removed: string[] = []

		for (const walletMakerUID of knownUnmappedCoinspect) {
			if (!coinspectIds.has(walletMakerUID)) {
				removed.push(walletMakerUID)
			}
		}

		removed.sort()
		expect(
			removed,
			`remove these IDs from knownUnmappedCoinspect; they are no longer in ${CURRENT_REPORTS_DIR}/: ${removed.join(', ')}`,
		).toEqual([])
	})

	// Coinspect removed (or renamed) a wallet we still map via coinspectId;
	// that field should be set to { type: 'NO_COINSPECT_ID' } or updated.
	it('maps only to Coinspect IDs present in current-reports', () => {
		const missing: string[] = []

		for (const coinspectId of walletsByCoinspectId.keys()) {
			if (!coinspectIds.has(coinspectId)) {
				missing.push(coinspectId)
			}
		}

		missing.sort()
		expect(
			missing,
			`set coinspectId to { type: 'NO_COINSPECT_ID' } or update it; these IDs are not in ${CURRENT_REPORTS_DIR}/: ${missing.join(', ')}`,
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

/**
 * Vendored Coinspect data must track upstream tip.
 * If this fails, refresh with `pnpm coinspect:update` (or wait for the
 * weekly `.github/workflows/coinspect-refresh.yaml` bot run).
 */
describe('coinspect upstream sync', () => {
	it('has a well-formed upstream-commit pin', () => {
		const pinPath = path.join(getRepositoryRoot(), UPSTREAM_COMMIT_FILE)
		const localSha = fs.readFileSync(pinPath, { encoding: 'utf-8' }).trim()

		expect(localSha, `${UPSTREAM_COMMIT_FILE} must be a full 40-character SHA-1`).toMatch(FULL_SHA1)
	})

	it('pins the same commit as upstream main', () => {
		const pinPath = path.join(getRepositoryRoot(), UPSTREAM_COMMIT_FILE)
		const localSha = fs.readFileSync(pinPath, { encoding: 'utf-8' }).trim()
		const lsRemote = execSync(`git ls-remote ${UPSTREAM_REPO} ${UPSTREAM_REF}`, {
			encoding: 'utf-8',
		})
		const remoteSha = lsRemote.split('\t')[0]?.trim() ?? ''

		expect(
			remoteSha,
			`failed to resolve ${UPSTREAM_REPO} ${UPSTREAM_REF} via git ls-remote`,
		).toMatch(FULL_SHA1)
		expect(
			localSha,
			`${UPSTREAM_COMMIT_FILE} is behind upstream; run \`pnpm coinspect:update\` (local ${localSha}, remote ${remoteSha})`,
		).toBe(remoteSha)
	})
})
