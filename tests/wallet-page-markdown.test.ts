import { describe, expect, it } from 'vitest'

import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWallets,
	attributeTreeForWallet,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
} from '@/data/wallets'
import {
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { ratingToText } from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import { getWalletStageAndLadder } from '@/utils/stage'
import { getWalletUrl } from '@/utils/urls'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

import { assertValidMarkdown } from './utils/assert-valid-markdown'
import { grammarLint, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

const SITE_URL = 'http://localhost:4321'
const markdownForWallet = (wallet: (typeof allRatedWallets)[keyof typeof allRatedWallets]) =>
	isSoftwareRatedWallet(wallet)
		? walletPageMarkdown(softwareWalletAttributeTree, wallet, SITE_URL)
		: isHardwareRatedWallet(wallet)
			? walletPageMarkdown(hardwareWalletAttributeTree, wallet, SITE_URL)
			: isEmbeddedRatedWallet(wallet)
				? walletPageMarkdown(embeddedWalletAttributeTree, wallet, SITE_URL)
				: (() => {
						throw new Error('Wallet has no recognized type')
					})()

describe('walletPageMarkdown', () => {
	for (const wallet of Object.values(allRatedWallets)) {
		describe(wallet.metadata.displayName, () => {
			const md = markdownForWallet(wallet)

			it('produces non-empty output', () => {
				expect(md.length).toBeGreaterThan(100)
			})

			it('contains the wallet display name', () => {
				expect(md).toContain(wallet.metadata.displayName)
			})

			it('has no unresolved template placeholders', () => {
				expect(md).not.toMatch(/\{\{[^}]+\}\}/)
			})

			it('has no accidental object-to-string coercion', () => {
				expect(md).not.toContain('[object Object]')
			})

			it('contains the lastUpdated date', () => {
				expect(md).toContain(wallet.metadata.lastUpdated)
			})

			it('contains the Walletbeat page URL', () => {
				expect(md).toContain(`${SITE_URL}${getWalletUrl(wallet)}`)
			})

			it('contains each non-exempt attribute group heading', () => {
				const groupNames: string[] = mapNonExemptAttributeGroupsInTree(
					attributeTreeForWallet(wallet),
					wallet.overall,
					(attrGroup, _evalGroup): string => attrGroup.displayName,
				)

				for (const name of groupNames) {
					expect(md).toContain(`## ${name}`)
				}
			})

			it('contains a correct heading for every non-exempt attribute', () => {
				const headings = mapNonExemptAttributeGroupsInTree(
					attributeTreeForWallet(wallet),
					wallet.overall,
					(_attrGroup, evalGroup) =>
						mapNonExemptGroupAttributes(
							evalGroup,
							evalAttr =>
								`### ${evalAttr.attribute.displayName}: ${ratingToText(evalAttr.evaluation.outcome.rating)}`,
						),
				).flat()

				for (const heading of headings) {
					expect(md).toContain(heading)
				}
			})

			it('includes at least one URL for every attribute that has references', () => {
				const urlSetsToCheck: string[][] = mapNonExemptAttributeGroupsInTree(
					attributeTreeForWallet(wallet),
					wallet.overall,
					(_attrGroup, evalGroup) =>
						mapNonExemptGroupAttributes(evalGroup, evalAttr => {
							const { references } = evalAttr.evaluation

							if (references === undefined || references.length === 0) {
								return null
							}

							const qualifiedRefs = toFullyQualified(references)

							if (qualifiedRefs.length === 0) {
								return null
							}

							return qualifiedRefs.flatMap(ref => ref.urls.map(u => u.url))
						}).filter((urls): urls is string[] => urls !== null),
				).flat()

				for (const allUrls of urlSetsToCheck) {
					expect(allUrls.some((url: string) => md.includes(url))).toBe(true)
				}
			})

			it('contains stage rating information', () => {
				const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)

				if (stage === null || ladderEvaluation === null || stage === 'NOT_APPLICABLE') {
					expect(md).toContain('Stage: Not applicable')
				} else if (stage === 'QUALIFIED_FOR_NO_STAGES') {
					expect(md).toContain('Stage: Qualified for no stages')
				} else {
					expect(md).toContain(`Stage: ${stage.label}`)
				}
			})

			it('contains Stage section when wallet has a concrete stage', () => {
				const { stage } = getWalletStageAndLadder(wallet)

				if (typeof stage === 'object' && stage !== null) {
					expect(md).toContain('## Stage')
					expect(md).toContain(
						`[${stage.label}](${SITE_URL}${getWalletUrl(wallet, { attributeAnchor: 'stages' })})`,
					)
				}
			})

			it('contains stage criteria (subheadings and ratings) when wallet has a concrete stage', () => {
				const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)

				if (typeof stage === 'object' && stage !== null && ladderEvaluation !== null) {
					expect(md).toMatch(/### Stage \d+: /)

					const hasRatingIcon = /[✅❌➖❔]/.test(md)
					const hasCriteriaPassed = /criteria passed/.test(md)

					expect(hasRatingIcon || hasCriteriaPassed).toBe(true)
				}
			})

			it('passes harper.js grammar check', async () => {
				await grammarLint(md, { language: 'markdown' })
			})

			it('produces valid markdown', async () => {
				await assertValidMarkdown(md)
			})
		})
	}
})
