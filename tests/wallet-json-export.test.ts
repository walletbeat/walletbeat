import { describe, expect, it } from 'vitest'

import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWallets,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
} from '@/data/wallets'
import { coinspectRef } from '@/schema/data-sources/coinspect'
import { getUrl } from '@/schema/url'
import { variantEnum } from '@/schema/variants'
import { setItems } from '@/types/utils/non-empty'
import { getWalletStageAndLadder } from '@/utils/stage'
import {
	ratedWalletJsonExport,
	serializeReferences,
	stageToExportString,
} from '@/utils/wallet-json-export'

import { RatedWalletExportValidator } from './utils/assert-valid-json'

const payloadForWallet = (wallet: (typeof allRatedWallets)[keyof typeof allRatedWallets]) =>
	isSoftwareRatedWallet(wallet)
		? ratedWalletJsonExport(softwareWalletAttributeTree, wallet)
		: isHardwareRatedWallet(wallet)
			? ratedWalletJsonExport(hardwareWalletAttributeTree, wallet)
			: isEmbeddedRatedWallet(wallet)
				? ratedWalletJsonExport(embeddedWalletAttributeTree, wallet)
				: (() => {
						throw new Error('Wallet has no recognized type')
					})()

describe('ratedWalletJsonExport', () => {
	for (const wallet of Object.values(allRatedWallets)) {
		describe(wallet.metadata.displayName, () => {
			const payload = payloadForWallet(wallet)

			it('produces schema-valid JSON', () => {
				const validator = new RatedWalletExportValidator()

				expect(() => validator.assert(JSON.stringify(payload))).not.toThrow()
			})

			it('export top-level fields match source wallet', () => {
				const { stage } = getWalletStageAndLadder(wallet)

				expect(payload.walletId).toBe(wallet.metadata.id)
				expect(payload.displayName).toBe(wallet.metadata.displayName)
				expect(payload.lastUpdated).toBe(wallet.metadata.lastUpdated)
				expect(payload.types.sort()).toEqual(setItems(wallet.types).sort())
				expect(payload.stage).toBe(stageToExportString(stage))
			})

			it('stageBreakdown is null when stage is null or NOT_APPLICABLE, matches ladder length, and passedCount <= totalCount per item', () => {
				const { ladderEvaluation } = getWalletStageAndLadder(wallet)

				if (payload.stage === null || payload.stage === 'NOT_APPLICABLE') {
					expect(payload.stageBreakdown).toBeNull()
				}

				if (payload.stageBreakdown !== null) {
					expect(payload.stageBreakdown.length).toBe(ladderEvaluation?.ladder.stages.length ?? 0)

					for (const item of payload.stageBreakdown) {
						expect(item.passedCount).toBeLessThanOrEqual(item.totalCount)
					}
				}
			})

			it('payload.variants matches variant keys in payload.perVariant', () => {
				const perVariantKeys = Object.keys(payload.perVariant).filter(k => variantEnum.is(k))

				expect(perVariantKeys.sort()).toEqual([...payload.variants].sort())
			})

			it('each perVariant block has attributes and features', () => {
				const overallGroups = Object.keys(payload.overall).sort()

				for (const v of payload.variants) {
					const variantBlock = payload.perVariant[v]

					expect(variantBlock).toBeDefined()

					if (variantBlock !== undefined) {
						expect(variantBlock.attributes).toBeDefined()
						expect(Object.keys(variantBlock.attributes).sort()).toEqual(overallGroups)

						expect(variantBlock.features).toBeDefined()
						expect(typeof variantBlock.features).toBe('object')
						expect(variantBlock.features).not.toBeNull()
					}
				}
			})
		})
	}

	it('includes website and repository in export when present in wallet metadata', () => {
		for (const wallet of Object.values(allRatedWallets)) {
			const payload = payloadForWallet(wallet)
			const websites = wallet.metadata.urls?.websites
			const repositories = wallet.metadata.urls?.repositories

			if (websites?.[0] !== undefined) {
				expect(payload.website).toBe(getUrl(websites[0]))
			}

			if (repositories?.[0] !== undefined) {
				expect(payload.repository).toBe(getUrl(repositories[0]))
			}
		}
	})
})

describe('serializeReferences', () => {
	it('projects a stamped ref source without a source URL', () => {
		const note = 'The wallet warns when sending to a new recipient.'
		const check = 'WSR-001.v1'
		const ref = coinspectRef({
			report: { walletUID: 'metamask-browser', date: '2026-01-12T17:52:05.136Z' },
			check,
			note,
		})
		const serialized = serializeReferences(ref)

		expect(serialized).toHaveLength(1)
		expect(serialized[0]?.explanation).toBe(note)
		expect(serialized[0]?.urls[0]?.label).toBe(`Coinspect ${check}`)
		expect(serialized[0]?.source).toEqual({
			id: 'coinspect',
			name: 'Coinspect',
			license: {
				name: 'CC BY 4.0',
				url: 'https://creativecommons.org/licenses/by/4.0/',
			},
			attributionText: 'Adapted from "Wallet Security Ranking" by Coinspect.',
		})
		expect(serialized[0]?.source).not.toHaveProperty('url')
	})
})
