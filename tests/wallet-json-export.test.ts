import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import { getUrl } from '@/schema/url'
import { type Variant, variantEnum } from '@/schema/variants'
import { setItems } from '@/types/utils/non-empty'
import { getWalletStageAndLadder } from '@/utils/stage'
import { ratedWalletJsonExport, stageToExportString } from '@/utils/wallet-json-export'
import { walletBlurbText } from '@/utils/wallet-page-markdown'

import { assertValidJson } from './utils/assert-valid-json'

describe('ratedWalletJsonExport', () => {
	for (const wallet of Object.values(allRatedWallets)) {
		describe(wallet.metadata.displayName, () => {
			const payload = ratedWalletJsonExport(wallet)

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

			it('includes types matching wallet types', () => {
				expect(payload.types.sort()).toEqual(setItems(wallet.types).sort())
			})

			it('includes stage (null or string)', () => {
				const { stage } = getWalletStageAndLadder(wallet)

				expect(payload.stage === null || typeof payload.stage === 'string').toBe(true)

				if (payload.stage !== null) {
					expect(payload.stage.length).toBeGreaterThan(0)
				}

				expect(payload.stage).toBe(stageToExportString(stage))
			})

			it('includes stageBreakdown (null or array)', () => {
				const { ladderEvaluation } = getWalletStageAndLadder(wallet)

				expect(payload.stageBreakdown === null || Array.isArray(payload.stageBreakdown)).toBe(true)

				if (payload.stage === null || payload.stage === 'NOT_APPLICABLE') {
					expect(payload.stageBreakdown).toBeNull()
				}

				if (payload.stageBreakdown !== null) {
					expect(payload.stageBreakdown.length).toBe(ladderEvaluation?.ladder.stages.length ?? 0)

					const statuses = ['PASS', 'PARTIAL', 'FAIL']

					for (const item of payload.stageBreakdown) {
						expect(item).toHaveProperty('stageId')
						expect(typeof item.stageId).toBe('string')
						expect(item).toHaveProperty('label')
						expect(typeof item.label).toBe('string')
						expect(item).toHaveProperty('passedCount')
						expect(typeof item.passedCount).toBe('number')
						expect(item).toHaveProperty('totalCount')
						expect(typeof item.totalCount).toBe('number')
						expect(item.passedCount).toBeGreaterThanOrEqual(0)
						expect(item.totalCount).toBeGreaterThanOrEqual(0)
						expect(item.passedCount).toBeLessThanOrEqual(item.totalCount)
						expect(item).toHaveProperty('status')
						expect(statuses).toContain(item.status)
					}
				}
			})

			it('includes stageBreakdown criteriaGroups and criteria (markdown-equivalent detail)', () => {
				if (payload.stageBreakdown === null) {
					return
				}

				const criterionRatings = ['PASS', 'FAIL', 'EXEMPT', 'UNRATED']

				for (const stageItem of payload.stageBreakdown) {
					expect(stageItem).toHaveProperty('criteriaGroups')
					expect(Array.isArray(stageItem.criteriaGroups)).toBe(true)

					for (const group of stageItem.criteriaGroups) {
						expect(group).toHaveProperty('description')
						expect(typeof group.description).toBe('string')
						expect(group).toHaveProperty('criteria')
						expect(Array.isArray(group.criteria)).toBe(true)

						for (const criterion of group.criteria) {
							expect(criterion).toHaveProperty('criterionId')
							expect(typeof criterion.criterionId).toBe('string')
							expect(criterion.criterionId.length).toBeGreaterThan(0)
							expect(criterion).toHaveProperty('attributeId')
							expect(
								criterion.attributeId === null || typeof criterion.attributeId === 'string',
							).toBe(true)
							expect(criterion).toHaveProperty('attributeDisplayName')
							expect(typeof criterion.attributeDisplayName).toBe('string')
							expect(criterion.attributeDisplayName.length).toBeGreaterThan(0)
							expect(criterion).toHaveProperty('description')
							expect(typeof criterion.description).toBe('string')
							expect(criterion).toHaveProperty('rating')
							expect(criterionRatings).toContain(criterion.rating)
						}
					}
				}
			})

			it('includes overall object with attribute groups', () => {
				expect(payload.overall).toBeTypeOf('object')
				expect(Object.keys(payload.overall).length).toBeGreaterThan(0)
				// At least one standard group (e.g. privacy for software wallets) is present
			})

			it('produces schema-valid JSON', () => {
				expect(() => assertValidJson(JSON.stringify(payload))).not.toThrow()
			})

			it('payload.variants matches variant keys on payload', () => {
				for (const v of payload.variants) {
					expect(payload[v]).toBeDefined()
					expect(typeof payload[v]).toBe('object')
				}

				const payloadVariantKeys = Object.keys(payload).filter((k): k is Variant =>
					variantEnum.is(k),
				)

				expect(payloadVariantKeys.sort()).toEqual([...payload.variants].sort())
			})

			it('overall and each variant block have the same set of attribute groups', () => {
				const overallGroups = Object.keys(payload.overall).sort()

				for (const v of payload.variants) {
					const variantBlock = payload[v]

					expect(variantBlock).toBeDefined()

					if (variantBlock !== undefined) {
						expect(Object.keys(variantBlock).sort()).toEqual(overallGroups)
					}
				}
			})

			it('includes shortQuestion, shortExplanation, whyItMatters and details for each attribute in each attribute group', () => {
				for (const [_groupId, group] of Object.entries(payload.overall)) {
					for (const [_attrId, attr] of Object.entries(group)) {
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
				}
			})

			it('includes howIsEvaluated (heading and methodology) for each attribute in each attribute group', () => {
				for (const [_groupId, group] of Object.entries(payload.overall)) {
					for (const [_attrId, attr] of Object.entries(group)) {
						expect(attr.attribute.howIsEvaluated).toBeDefined()
						expect(attr.attribute.howIsEvaluated.heading).toBeDefined()
						expect(typeof attr.attribute.howIsEvaluated.heading).toBe('string')
						expect(attr.attribute.howIsEvaluated.methodology).toBeDefined()
						expect(typeof attr.attribute.howIsEvaluated.methodology).toBe('string')
						expect(attr.attribute.howIsEvaluated.methodology.length).toBeGreaterThan(0)
					}
				}
			})
		})
	}

	it('includes website and repository in export when present in wallet metadata', () => {
		for (const wallet of Object.values(allRatedWallets)) {
			const payload = ratedWalletJsonExport(wallet)
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
