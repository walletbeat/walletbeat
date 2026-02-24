import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import {
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { ratingToText } from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

const SITE_URL = 'https://wallet.page'

describe('walletPageMarkdown', () => {
	for (const wallet of Object.values(allRatedWallets)) {
		describe(wallet.metadata.displayName, () => {
			const md = walletPageMarkdown(wallet, SITE_URL)

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
				expect(md).toContain(`${SITE_URL}/${wallet.metadata.id}`)
			})

			it('contains each non-exempt attribute group heading', () => {
				mapNonExemptAttributeGroupsInTree(wallet.overall, attrGroup => {
					expect(md).toContain(`## ${attrGroup.displayName}`)

					return undefined
				})
			})

			it('contains a correct heading for every non-exempt attribute', () => {
				mapNonExemptAttributeGroupsInTree(wallet.overall, (_, evalGroup) => {
					mapNonExemptGroupAttributes(evalGroup, evalAttr => {
						const heading = `### ${evalAttr.attribute.displayName}: ${ratingToText(evalAttr.evaluation.value.rating)}`

						expect(md).toContain(heading)
					})

					return undefined
				})
			})

			it('includes at least one URL for every attribute that has references', () => {
				mapNonExemptAttributeGroupsInTree(wallet.overall, (_, evalGroup) => {
					mapNonExemptGroupAttributes(evalGroup, evalAttr => {
						const { references } = evalAttr.evaluation

						if (references === undefined || references.length === 0) {
							return
						}

						const qualifiedRefs = toFullyQualified(references)

						if (qualifiedRefs.length === 0) {
							return
						}

						const allUrls = qualifiedRefs.flatMap(ref => ref.urls.map(u => u.url))
						const foundAnyUrl = allUrls.some(url => md.includes(url))

						expect(foundAnyUrl).toBe(true)
					})

					return undefined
				})
			})
		})
	}
})
