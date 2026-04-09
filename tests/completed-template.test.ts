import { describe, expect, it } from 'vitest'

import { attributeGroupById } from '@/data/attribute-groups'
import { completedTemplate } from '@/data/software-wallets/completed.tmpl'
import { mapAttributesGetter } from '@/schema/attribute-groups'
import { Rating } from '@/schema/attributes'
import { softwareLadders } from '@/schema/ladders'
import { rateWallet, sliceCanonicalWalletForType } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'

describe('completed.tmpl', () => {
	it('rates PASS or EXEMPT on all attributes, never UNRATED', () => {
		const rated = rateWallet(
			attributeGroupById,
			softwareLadders,
			sliceCanonicalWalletForType(completedTemplate, WalletType.SOFTWARE)!,
		)

		mapAttributesGetter(rated.overall, getter => {
			const evalAttr = getter(rated.overall)

			if (evalAttr === undefined) {
				return
			}

			const { attribute, evaluation } = evalAttr
			const { rating } = evaluation.outcome

			/**
			 * Pass or exempt for attributes that are only for hardware wallets.
			 */
			expect(
				rating === Rating.PASS || rating === Rating.EXEMPT,
				`Attribute "${attribute.id}" got ${rating}, expected PASS or EXEMPT`,
			).toBe(true)
		})
	})
})
