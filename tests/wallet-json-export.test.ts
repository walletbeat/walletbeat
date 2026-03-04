import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import { getUrl } from '@/schema/url'
import { getWalletStageAndLadder } from '@/utils/stage'
import { ratedWalletJsonExport, stageToExportString } from '@/utils/wallet-json-export'
import { walletBlurbText } from '@/utils/wallet-page-markdown'

import { assertValidJson } from './utils/assert-valid-json'

describe('ratedWalletJsonExport', () => {
	for (const wallet of Object.values(allRatedWallets)) {
		describe(wallet.metadata.displayName, () => {
			const payload = ratedWalletJsonExport(wallet)

			it('produces non-empty payload', () => {
				expect(payload.types.length).toBeGreaterThan(0)
				expect(payload.variants.length).toBeGreaterThan(0)
			})

			it('includes walletId', () => {
				expect(payload.walletId).toBe(wallet.metadata.id)
			})

			it('includes displayName', () => {
				expect(payload.displayName).toBe(wallet.metadata.displayName)
			})

			it('includes description (rendered blurb)', () => {
				expect(payload.description).toBeDefined()
				expect(typeof payload.description).toBe('string')
				expect(payload.description).toBe(walletBlurbText(wallet))
			})

			it('includes lastUpdated', () => {
				expect(payload.lastUpdated).toBe(wallet.metadata.lastUpdated)
			})

			it('includes stage (null or string)', () => {
				const { stage } = getWalletStageAndLadder(wallet)

				expect(payload.stage === null || typeof payload.stage === 'string').toBe(true)

				if (payload.stage !== null) {
					expect(payload.stage.length).toBeGreaterThan(0)
				}

				expect(payload.stage).toBe(stageToExportString(stage))
			})

			it('includes overallPrivacy object', () => {
				expect(payload.overallPrivacy).toBeTypeOf('object')
			})

			it('produces schema-valid JSON', () => {
				expect(() => assertValidJson(JSON.stringify(payload))).not.toThrow()
			})

			it('includes shortQuestion, shortExplanation, whyItMatters and details for each privacy attribute', () => {
				for (const [_key, attr] of Object.entries(payload.overallPrivacy)) {
					expect(attr.attribute.shortQuestion).toBeDefined()
					expect(typeof attr.attribute.shortQuestion).toBe('string')
					expect(attr.attribute.shortQuestion.length).toBeGreaterThan(0)
					expect(attr.rating.shortExplanation).toBeDefined()
					expect(typeof attr.rating.shortExplanation).toBe('string')
					expect(attr.rating.shortExplanation.length).toBeGreaterThan(0)
					expect(attr.attribute.whyItMatters).toBeDefined()
					expect(typeof attr.attribute.whyItMatters).toBe('string')
					expect(attr.attribute.whyItMatters.length).toBeGreaterThan(0)
					expect(attr.rating.details).toBeDefined()
					expect(typeof attr.rating.details).toBe('string')
					expect(attr.rating.details.length).toBeGreaterThan(0)
				}
			})

			it('includes howIsEvaluated (heading and methodology) for each privacy attribute', () => {
				for (const [_key, attr] of Object.entries(payload.overallPrivacy)) {
					expect(attr.attribute.howIsEvaluated).toBeDefined()
					expect(attr.attribute.howIsEvaluated.heading).toBeDefined()
					expect(typeof attr.attribute.howIsEvaluated.heading).toBe('string')
					expect(attr.attribute.howIsEvaluated.heading.length).toBeGreaterThan(0)
					expect(attr.attribute.howIsEvaluated.methodology).toBeDefined()
					expect(typeof attr.attribute.howIsEvaluated.methodology).toBe('string')
					expect(attr.attribute.howIsEvaluated.methodology.length).toBeGreaterThan(0)
				}
			})
		})
	}

	describe('MetaMask', () => {
		it('exports full privacy attribute detail including optional fields when present', () => {
			const metamask = Object.values(allRatedWallets).find(w => w.metadata.id === 'metamask')

			if (metamask === undefined) {
				throw new Error('MetaMask fixture missing')
			}

			const payload = ratedWalletJsonExport(metamask)

			for (const [_key, attr] of Object.entries(payload.overallPrivacy)) {
				expect(attr.attribute.shortQuestion).toBeDefined()
				expect(attr.attribute.shortQuestion.length).toBeGreaterThan(0)
				expect(attr.rating.shortExplanation).toBeDefined()
				expect(attr.rating.shortExplanation.length).toBeGreaterThan(0)
				expect(attr.attribute.whyItMatters).toBeDefined()
				expect(attr.attribute.whyItMatters.length).toBeGreaterThan(0)
				expect(attr.rating.details).toBeDefined()
				expect(attr.rating.details.length).toBeGreaterThan(0)
			}

			// MetaMask has multiple variants; perVariantRatings may appear for variant-specific attributes.
			// References may appear on any attribute.
			expect(() => assertValidJson(JSON.stringify(payload))).not.toThrow()

			// Private token transfers should include the attribute's short question (shown in UI).
			expect(payload.overallPrivacy.privateTransfers.attribute.shortQuestion).toBe(
				'Can you send and receive tokens without revealing your transaction history to others?',
			)
		})

		it('includes website and repository when present', () => {
			const metamask = Object.values(allRatedWallets).find(w => w.metadata.id === 'metamask')

			expect(metamask).toBeDefined()

			const payload = ratedWalletJsonExport(metamask!)

			expect(metamask!.metadata.urls?.websites?.[0]).toBeDefined()
			expect(payload.website).toBe(getUrl(metamask!.metadata.urls!.websites[0]))

			if (metamask!.metadata.urls?.repositories?.[0] !== undefined) {
				expect(payload.repository).toBe(getUrl(metamask!.metadata.urls.repositories[0]))
			}
		})
	})
})
